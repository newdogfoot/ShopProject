"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, type Db } from "@/db/client";
import {
  activeSession,
  createSession,
  getStudent,
  insertAttempt,
  insertExplanation,
  loadLearner,
  markDiagnosed,
  saveLearner,
  saveSessionState,
  updateAttemptOutcome,
  type ErrorType,
} from "@/db/queries";
import { getCurrentStudent, requireGuardian, selectStudent } from "@/auth/session";
import { aiEnabled, getAiDeps } from "@/ai";
import { bankedWordProblem, explainStep, getExplanation, getHint, gradeExplanation } from "@/ai/features";
import { scrubPersonalInfo } from "@/ai/privacy";
import { itemFromId } from "@/domain/items";
import { templateHint } from "@/domain/content/explanations";
import { getSkill } from "@/domain/curriculum/skills";
import { gradeBandOf, type Grade, type Semester } from "@/domain/curriculum/types";
import { isTheme, type Theme } from "@/domain/content/stories";
import { randomSeed } from "@/domain/math/rng";
import { grade as gradeAnswer } from "@/domain/items/answer";
import type { StudentAnswer } from "@/domain/items/types";
import { currentStep } from "@/domain/tutor/cycle";
import { diagnosisProgress, diagnosisResult, nextDiagnosisItem, recordDiagnosisAnswer, startDiagnosis, type DiagnosisState } from "@/domain/diagnosis/engine";
import type { LearnerState } from "@/domain/model/learner";
import {
  advance,
  endSession,
  finishExplain,
  finishWorked,
  nextItem,
  requestHint,
  revealSolution,
  startSession,
  submitAnswer,
  submitReasonResult,
  type ActiveItem,
  type SessionState,
} from "@/domain/tutor/session";
import {
  correctFeedback,
  reasonFeedback,
  solutionFeedback,
  STEP_LABEL,
  toItemView,
  writtenFeedback,
  type DiagnosisView,
  type FeedbackView,
  type SessionView,
} from "./views";
import { warmExplanations, warmWordProblem } from "./warm";

type StudentRow = NonNullable<Awaited<ReturnType<typeof getCurrentStudent>>>;

// Answers arrive from the browser, so check their shape before grading.
const field = z.string().max(40);
const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("integer"), text: field }),
  z.object({ kind: z.literal("decimal"), text: field }),
  z.object({ kind: z.literal("fraction"), whole: field, num: field, den: field }),
  z.object({ kind: z.literal("quotient-remainder"), quotient: field, remainder: field }),
  z.object({ kind: z.literal("compare"), value: field }),
  z.object({ kind: z.literal("integer-list"), text: z.string().max(200) }),
  z.object({ kind: z.literal("choice"), index: z.string().max(3) }),
  // Cut to 100 characters after cleaning; the raw limit only stops abuse.
  z.object({ kind: z.literal("text"), text: z.string().max(400) }),
]);

function parseAnswer(input: unknown): StudentAnswer | null {
  const parsed = AnswerSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

const INVALID: FeedbackView = { status: "invalid", done: false, message: "답을 끝까지 입력해 주세요." };

async function currentStudent(): Promise<StudentRow> {
  const student = await getCurrentStudent();
  if (!student) redirect("/learn");
  return student;
}

function themeOf(student: StudentRow): Theme {
  return isTheme(student.theme) ? student.theme : "snack";
}

export async function chooseStudent(formData: FormData): Promise<void> {
  const guardian = await requireGuardian();
  const id = String(formData.get("studentId") ?? "");
  const student = /^[0-9a-f-]{36}$/.test(id) ? await getStudent(await getDb(), guardian.id, id) : null;
  if (!student) redirect("/learn");
  await selectStudent(student.id);
  redirect("/learn/home");
}

// ── Diagnosis ──────────────────────────────────────────────

interface DiagnosisRun {
  engine: DiagnosisState;
  formRetry: boolean;
  shownAt: number;
}

async function finishDiagnosis(db: Db, student: StudentRow, sessionId: string, engine: DiagnosisState): Promise<DiagnosisView> {
  const result = diagnosisResult(engine);
  const before = await loadLearner(db, student.id);
  const after: LearnerState = { ...before };
  for (const [id, st] of Object.entries(result.learner)) {
    // Evidence from earlier learning is more reliable than diagnosis guesses.
    if (before[id]?.evidence !== "direct") after[id] = st;
  }
  await saveLearner(db, student.id, before, after);
  await markDiagnosed(db, student.id);
  await saveSessionState(db, sessionId, { engine, formRetry: false, shownAt: Date.now() } satisfies DiagnosisRun, true);
  const statuses = Object.values(result.statusById);
  return {
    type: "done",
    mastered: statuses.filter((s) => s === "mastered" || s === "inferred").length,
    toLearn: result.rootGaps.map((id) => getSkill(id).name),
    misconceptions: statuses.filter((s) => s === "misconception").length,
    asked: engine.asked,
    skipped: engine.range.length === 0,
  };
}

async function renderDiagnosis(db: Db, student: StudentRow, sessionId: string, run: DiagnosisRun): Promise<DiagnosisView> {
  const previous = run.engine.current?.id;
  const { state, item } = nextDiagnosisItem(run.engine);
  if (!item) return finishDiagnosis(db, student, sessionId, state);
  const same = previous === item.id;
  const next: DiagnosisRun = { engine: state, formRetry: same ? run.formRetry : false, shownAt: same ? run.shownAt : Date.now() };
  await saveSessionState(db, sessionId, next);
  return { type: "item", item: toItemView(item, "diagnosis"), progress: diagnosisProgress(state), asked: state.asked, maxItems: state.maxItems };
}

async function loadDiagnosis(db: Db, student: StudentRow) {
  let row = await activeSession(db, student.id, "diagnosis");
  if (!row) {
    const engine = startDiagnosis({ grade: student.grade as Grade, semester: student.semester as Semester, seed: randomSeed(), now: Date.now() });
    row = await createSession(db, student.id, "diagnosis", { engine, formRetry: false, shownAt: Date.now() } satisfies DiagnosisRun);
  }
  return { row, run: row.state as DiagnosisRun };
}

export async function diagnosisView(): Promise<DiagnosisView> {
  const student = await currentStudent();
  const db = await getDb();
  if (student.diagnosedAt && !(await activeSession(db, student.id, "diagnosis"))) {
    return { type: "done", mastered: 0, toLearn: [], misconceptions: 0, asked: 0, skipped: true };
  }
  const { row, run } = await loadDiagnosis(db, student);
  return renderDiagnosis(db, student, row.id, run);
}

export async function diagnosisAnswer(itemId: string, answer: StudentAnswer): Promise<{ view: DiagnosisView; feedback?: FeedbackView }> {
  const student = await currentStudent();
  const db = await getDb();
  // Answers only continue a diagnosis in progress; a stale tab must not start a new one.
  const row = await activeSession(db, student.id, "diagnosis");
  if (!row) return { view: await diagnosisView() };
  const run = row.state as DiagnosisRun;
  const current = run.engine.current;
  if (!current || current.id !== itemId) return { view: await renderDiagnosis(db, student, row.id, run) };

  const input = parseAnswer(answer);
  const result = input ? gradeAnswer(current, input) : null;
  if (!input || !result || result.status === "invalid") {
    return { view: await renderDiagnosis(db, student, row.id, run), feedback: INVALID };
  }
  if (result.status === "form" && !run.formRetry) {
    const view = await renderDiagnosis(db, student, row.id, { ...run, formRetry: true });
    return { view, feedback: { status: "form", done: false, message: result.formMessage ?? "답의 모양을 다시 확인해 볼까요?" } };
  }
  const correct = result.status === "correct";
  const now = Date.now();
  const ms = Math.min(now - run.shownAt, 30 * 60_000);
  const engine = recordDiagnosisAnswer(run.engine, { correct, misconceptionId: result.bug?.misconceptionId, ms, at: now });
  await insertAttempt(db, {
    studentId: student.id,
    sessionId: row.id,
    skillId: current.skillId,
    itemId: current.id,
    purpose: "diagnosis",
    prompt: current.prompt,
    answer: input,
    shown: result.shown,
    correct,
    misconceptionId: result.bug?.misconceptionId ?? null,
    hintsUsed: 0,
    ms,
  });
  const view = await renderDiagnosis(db, student, row.id, { engine, formRetry: false, shownAt: now });
  // During diagnosis we do not say right or wrong; the goal is to find where to start.
  return { view, feedback: { status: "saved", done: true, message: "답을 저장했어요. 다음 문제예요!" } };
}

// ── Learning session ──────────────────────────────────────

interface SessionCtx {
  db: Db;
  student: StudentRow;
  sessionId: string;
  state: SessionState;
  learner: LearnerState;
}

/** A session left open this long is closed instead of resumed (the plan would be out of date). */
const STALE_SESSION_MS = 6 * 60 * 60_000;

async function loadSession(student: StudentRow): Promise<SessionCtx> {
  const db = await getDb();
  const learner = await loadLearner(db, student.id);
  let row = await activeSession(db, student.id, "learning");
  if (row && Date.now() - (row.state as SessionState).startedAt > STALE_SESSION_MS) {
    await saveSessionState(db, row.id, endSession(row.state as SessionState), true);
    row = null;
  }
  if (!row) {
    const state = startSession({
      learner,
      grade: student.grade as Grade,
      semester: student.semester as Semester,
      theme: themeOf(student),
      seed: randomSeed(),
      now: Date.now(),
      // Grade 3+ write their "why" answers when the guardian allows it and AI can grade them.
      reasonMode: student.grade >= 3 && student.allowWriting && aiEnabled() ? "write" : "choice",
    });
    row = await createSession(db, student.id, "learning", state);
    warmExplanations(student.id, student.grade as Grade, state.plan, learner, state.seed);
  }
  return { db, student, sessionId: row.id, state: row.state as SessionState, learner };
}

async function render(ctx: SessionCtx, state0: SessionState, learner0: LearnerState, feedback?: FeedbackView): Promise<SessionView> {
  const { db, student } = ctx;
  const now = Date.now();
  const r = advance(state0, learner0, now);
  let state = r.state;
  const learner = r.learner;
  const screen = r.screen;
  let view: SessionView;
  const grade = student.grade as Grade;

  if (screen.type === "summary") {
    const name = (id: string) => getSkill(id).name;
    view = {
      type: "summary",
      answered: screen.stats.answered,
      firstTryCorrect: screen.stats.firstTryCorrect,
      mastered: screen.stats.mastered.map(name),
      skipped: screen.stats.skipped.map(name),
      unlocked: screen.stats.unlocked.map(name),
      stuck: screen.stats.stuck.map(name),
      reviewed: screen.stats.reviewed.length,
      tookBreak: screen.stats.tookBreak,
    };
  } else if (screen.type === "explain") {
    const deps = await getAiDeps(student.id);
    const e = await getExplanation(deps, {
      skillId: screen.skillId,
      strategy: screen.strategy,
      misconceptionId: screen.misconceptionId,
      example: screen.example,
      gradeBand: gradeBandOf(grade),
    });
    view = { type: "explain", skillName: getSkill(screen.skillId).name, title: e.title, steps: e.steps, summary: e.summary, source: e.source, stepLabel: STEP_LABEL[screen.stepKind] };
  } else if (screen.type === "worked") {
    const f = screen.faded;
    view = {
      type: "worked",
      skillName: getSkill(screen.skillId).name,
      stepLabel: STEP_LABEL[screen.stepKind],
      example: { id: screen.example.id, prompt: screen.example.prompt, steps: screen.example.steps, visual: screen.example.visual },
      faded: { id: f.id, prompt: f.prompt, steps: f.steps.slice(0, -1), answer: f.steps[f.steps.length - 1] },
    };
  } else {
    let active = screen.active;
    if (active.item.format === "word" && !active.decorated) {
      // Use a checked AI story if one is banked; otherwise show the template now and write one for next time.
      const banked = await bankedWordProblem(await getAiDeps(student.id), active.item);
      if (!banked) warmWordProblem(student.id, active.item, themeOf(student), grade);
      active = { ...active, item: banked ?? active.item, decorated: true };
    }
    if (active.hintsShown > 0 && !active.hints?.[active.hintsShown]) {
      const bug = active.item.bugs.find((b) => b.misconceptionId === active.lastBugId);
      let text = templateHint(active.item, active.hintsShown);
      let aiErrorType = active.aiErrorType;
      if (active.hintsShown === 1) {
        const hint = await getHint(await getAiDeps(student.id), { item: active.item, level: 1, studentAnswer: active.lastShown, bugFeedback: bug?.feedback ?? null, grade });
        text = hint.text;
        aiErrorType = hint.errorType ?? aiErrorType;
      }
      active = { ...active, hints: { ...active.hints, [active.hintsShown]: text }, aiErrorType };
    }
    state = { ...state, active };
    const fb = feedback ?? (active.done ? doneFeedback(active) : undefined);
    view = {
      type: "item",
      skillName: getSkill(active.item.skillId).name,
      stepLabel: STEP_LABEL[screen.stepKind],
      progress: { step: screen.stepNumber, count: screen.stepCount },
      item: toItemView(active.item, active.purpose),
      hint: active.hintsShown > 0 ? { level: active.hintsShown, text: active.hints?.[active.hintsShown] ?? "" } : undefined,
      encourage: active.encourage ? "괜찮아요! 조금 쉬운 문제로 다시 해 봐요." : undefined,
      feedback: fb,
      canHint: active.hintsAllowed && !active.done && active.hintsShown < 3,
      canReveal: active.hintsAllowed && !active.done && active.hintsShown >= 2,
      canAskWhy: active.item.format !== "reason",
    };
  }

  await saveLearner(db, student.id, ctx.learner, learner);
  await saveSessionState(db, ctx.sessionId, state, state.finished);
  return view;
}

/** Feedback for an item that is already finished (shown again after a refresh). */
function doneFeedback(active: ActiveItem): FeedbackView {
  if (active.purpose === "reason") {
    if (active.written) return writtenFeedback(active.item, active.written);
    const bug = active.item.bugs.find((b) => b.misconceptionId === active.lastBugId);
    return reasonFeedback(active.item, active.firstCorrect === true, bug?.feedback);
  }
  return active.solutionShown ? solutionFeedback(active.item) : correctFeedback(active.item);
}

const ERROR_TYPES = new Set<string>(["concept", "procedure", "careless", "reading", "unknown"]);

/** Likely cause of a wrong first answer, decided when the item ends. */
function finalErrorType(active: ActiveItem, solved: boolean): ErrorType {
  if (active.firstErrorType) return active.firstErrorType as ErrorType;
  // Fixed right away on the second try: most likely a slip.
  if (solved && active.attempts === 1) return "careless";
  return active.aiErrorType && ERROR_TYPES.has(active.aiErrorType) ? (active.aiErrorType as ErrorType) : "unknown";
}

async function recordOutcome(ctx: SessionCtx, active: ActiveItem, solved: boolean): Promise<void> {
  if (!active.attemptId || active.firstCorrect !== false) return;
  await updateAttemptOutcome(ctx.db, ctx.student.id, active.attemptId, { errorType: finalErrorType(active, solved), solvedAfterRetry: solved });
}

export async function sessionView(): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  return render(ctx, ctx.state, ctx.learner);
}

/** Leaves the explanation or worked-example screen the child is looking at. */
export async function sessionContinue(from: "explain" | "worked"): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  const step = ctx.state.cycle && !ctx.state.active ? currentStep(ctx.state.cycle).kind : null;
  // Ignore a stale click (for example from a second tab) that no longer matches the screen.
  if (step !== from) return render(ctx, ctx.state, ctx.learner);
  return render(ctx, from === "explain" ? finishExplain(ctx.state) : finishWorked(ctx.state), ctx.learner);
}

export async function sessionAnswer(itemId: string, answer: StudentAnswer): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  const active = ctx.state.active;
  if (!active || active.done || active.item.id !== itemId) return render(ctx, ctx.state, ctx.learner);
  const input = parseAnswer(answer);
  if (!input) return render(ctx, ctx.state, ctx.learner, INVALID);
  const now = Date.now();
  if (active.purpose === "reason" && active.item.answer.kind === "text") return answerWritten(ctx, active, input, now);
  if (input.kind === "text") return render(ctx, ctx.state, ctx.learner, INVALID);
  const out = submitAnswer(ctx.state, ctx.learner, input, now);
  let state = out.state;
  const fb = out.feedback;
  if (active.attempts === 0 && fb.status !== "invalid" && fb.status !== "form") {
    const graded = gradeAnswer(active.item, input);
    const correct = fb.status === "correct";
    // The cause of a wrong answer is known now if it matched a misconception or the item is over.
    const errorType: ErrorType | null = correct ? null : fb.bug ? "concept" : fb.done ? "unknown" : null;
    const attemptId = await insertAttempt(ctx.db, {
      studentId: ctx.student.id,
      sessionId: ctx.sessionId,
      skillId: active.item.skillId,
      itemId: active.item.id,
      purpose: active.purpose,
      prompt: active.item.prompt,
      answer: input,
      shown: graded.shown,
      correct,
      misconceptionId: fb.bug?.misconceptionId ?? null,
      hintsUsed: active.hintsShown,
      ms: Math.min(now - active.startedAt, 30 * 60_000),
      errorType,
    });
    if (!correct && !fb.done && state.active) state = { ...state, active: { ...state.active, attemptId, firstErrorType: errorType } };
  } else if (fb.done && fb.status !== "invalid" && fb.status !== "form") {
    await recordOutcome(ctx, active, fb.status === "correct");
  }
  let feedback: FeedbackView;
  if (fb.status === "invalid") feedback = INVALID;
  else if (fb.status === "form") feedback = { status: "form", done: false, message: fb.formMessage ?? "답의 모양을 다시 확인해 볼까요?" };
  else if (active.purpose === "reason") feedback = reasonFeedback(active.item, fb.status === "correct", fb.bug?.feedback);
  else if (fb.status === "correct") feedback = correctFeedback(active.item);
  else if (fb.done) feedback = solutionFeedback(active.item, fb.bug?.feedback);
  else feedback = { status: "wrong", done: false, message: "아쉬워요. 힌트를 보고 다시 해 볼까요?" };
  // Learner changes from this answer are saved by render (it diffs against the loaded learner).
  return render(ctx, state, out.learner, feedback);
}

/** A written "why": clean it, grade it against the rubric, keep it for the guardian. */
async function answerWritten(ctx: SessionCtx, active: ActiveItem, input: StudentAnswer, now: number): Promise<SessionView> {
  if (input.kind !== "text" || active.item.answer.kind !== "text") return render(ctx, ctx.state, ctx.learner, INVALID);
  const spec = active.item.answer;
  const { text } = scrubPersonalInfo(input.text);
  if (!text) return render(ctx, ctx.state, ctx.learner, INVALID);
  const result = await gradeExplanation(await getAiDeps(ctx.student.id), {
    prompt: active.item.prompt,
    rubric: spec.rubric,
    model: spec.model,
    text,
    grade: ctx.student.grade as Grade,
  });
  const written = { text, score: result.score, feedback: result.feedback };
  const out = submitReasonResult(ctx.state, ctx.learner, written, now);
  await insertExplanation(ctx.db, {
    studentId: ctx.student.id,
    skillId: active.item.skillId,
    reasonId: active.item.reasonId ?? "",
    prompt: active.item.prompt,
    text,
    score: result.score,
    confidence: result.confidence,
    feedback: result.feedback,
  });
  await insertAttempt(ctx.db, {
    studentId: ctx.student.id,
    sessionId: ctx.sessionId,
    skillId: active.item.skillId,
    itemId: active.item.id,
    purpose: "reason",
    prompt: active.item.prompt,
    answer: { kind: "text", text },
    shown: text,
    correct: result.score === 2,
    misconceptionId: null,
    hintsUsed: 0,
    ms: Math.min(now - active.startedAt, 30 * 60_000),
  });
  return render(ctx, out.state, out.learner, writtenFeedback(active.item, written));
}

export async function sessionHint(itemId: string): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  if (ctx.state.active?.item.id !== itemId) return render(ctx, ctx.state, ctx.learner);
  return render(ctx, requestHint(ctx.state), ctx.learner);
}

export async function sessionReveal(itemId: string): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  const active = ctx.state.active;
  if (!active || active.done || active.item.id !== itemId) return render(ctx, ctx.state, ctx.learner);
  await recordOutcome(ctx, active, false);
  return render(ctx, revealSolution(ctx.state, ctx.learner), ctx.learner);
}

/** "왜요?" on a solution step. Only the fixed question is asked; the item is rebuilt from its id. */
export async function sessionWhy(itemId: string, stepIndex: number): Promise<{ text: string }> {
  const student = await currentStudent();
  if (typeof itemId !== "string" || itemId.length > 120 || !Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > 30) return { text: "" };
  const item = itemFromId(itemId);
  if (!item || stepIndex >= item.steps.length) return { text: "" };
  const result = await explainStep(await getAiDeps(student.id), { item, stepIndex, grade: student.grade as Grade });
  return { text: result.text };
}

export async function sessionNext(itemId: string): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  if (ctx.state.active && ctx.state.active.item.id !== itemId) return render(ctx, ctx.state, ctx.learner);
  return render(ctx, nextItem(ctx.state), ctx.learner);
}

export async function sessionStop(): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  return render(ctx, endSession(ctx.state), ctx.learner);
}
