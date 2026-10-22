"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, type Db } from "@/db/client";
import {
  activeSession,
  createSession,
  getStudent,
  insertAttempt,
  loadLearner,
  markDiagnosed,
  saveLearner,
  saveSessionState,
} from "@/db/queries";
import { getCurrentStudent, requireGuardian, selectStudent } from "@/auth/session";
import { getAiDeps } from "@/ai";
import { bankedWordProblem, getExplanation, getHint } from "@/ai/features";
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
  type SessionState,
} from "@/domain/tutor/session";
import { correctFeedback, solutionFeedback, STEP_LABEL, toItemView, type DiagnosisView, type FeedbackView, type SessionView } from "./views";
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
      example: { prompt: screen.example.prompt, steps: screen.example.steps, visual: screen.example.visual },
      faded: { prompt: f.prompt, steps: f.steps.slice(0, -1), answer: f.steps[f.steps.length - 1] },
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
      const text =
        active.hintsShown === 1
          ? (await getHint(await getAiDeps(student.id), { item: active.item, level: 1, studentAnswer: active.lastShown, bugFeedback: bug?.feedback ?? null, grade })).text
          : templateHint(active.item, active.hintsShown);
      active = { ...active, hints: { ...active.hints, [active.hintsShown]: text } };
    }
    state = { ...state, active };
    const fb = feedback ?? (active.done ? (active.solutionShown ? solutionFeedback(active.item) : correctFeedback(active.item)) : undefined);
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
    };
  }

  await saveLearner(db, student.id, ctx.learner, learner);
  await saveSessionState(db, ctx.sessionId, state, state.finished);
  return view;
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
  const out = submitAnswer(ctx.state, ctx.learner, input, now);
  if (active.attempts === 0 && out.feedback.status !== "invalid" && out.feedback.status !== "form") {
    const graded = gradeAnswer(active.item, input);
    await insertAttempt(ctx.db, {
      studentId: ctx.student.id,
      sessionId: ctx.sessionId,
      skillId: active.item.skillId,
      itemId: active.item.id,
      purpose: active.purpose,
      prompt: active.item.prompt,
      answer: input,
      shown: graded.shown,
      correct: out.feedback.status === "correct",
      misconceptionId: out.feedback.bug?.misconceptionId ?? null,
      hintsUsed: active.hintsShown,
      ms: Math.min(now - active.startedAt, 30 * 60_000),
    });
  }
  const fb = out.feedback;
  let feedback: FeedbackView;
  if (fb.status === "invalid") feedback = INVALID;
  else if (fb.status === "form") feedback = { status: "form", done: false, message: fb.formMessage ?? "답의 모양을 다시 확인해 볼까요?" };
  else if (fb.status === "correct") feedback = correctFeedback(active.item);
  else if (fb.done) feedback = solutionFeedback(active.item, fb.bug?.feedback);
  else feedback = { status: "wrong", done: false, message: "아쉬워요. 힌트를 보고 다시 해 볼까요?" };
  // Learner changes from this answer are saved by render (it diffs against the loaded learner).
  return render({ ...ctx }, out.state, out.learner, feedback);
}

export async function sessionHint(itemId: string): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  if (ctx.state.active?.item.id !== itemId) return render(ctx, ctx.state, ctx.learner);
  return render(ctx, requestHint(ctx.state), ctx.learner);
}

export async function sessionReveal(itemId: string): Promise<SessionView> {
  const ctx = await loadSession(await currentStudent());
  if (ctx.state.active?.item.id !== itemId) return render(ctx, ctx.state, ctx.learner);
  return render(ctx, revealSolution(ctx.state, ctx.learner), ctx.learner);
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
