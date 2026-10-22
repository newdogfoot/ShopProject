/**
 * A learning session: walks through today's plan one cycle at a time and keeps
 * the learner model up to date. Pure and JSON-serializable; the app stores the
 * state between requests and renders the screen it returns.
 */
import { SKILL_IDS, getSkill } from "../curriculum/skills";
import { gradeBandOf, type Grade, type Semester } from "../curriculum/types";
import { deriveSeed } from "../math/rng";
import { generateItem, generateWordItem } from "../items";
import { correctAnswerText, grade, type GradeStatus } from "../items/answer";
import type { Item, StudentAnswer } from "../items/types";
import type { Theme } from "../content/stories";
import {
  afterReview,
  applyObservation,
  deriveStatus,
  emptySkillState,
  getState,
  inferMastery,
  markMastered,
  type LearnerState,
} from "../model/learner";
import { completeExplain, completeWorked, currentStep, recordCycleAnswer, startCycle, type CycleOutcome, type CycleState, type ItemPurpose, type Strategy } from "./cycle";
import { buildPlan, SESSION_MINUTES, unlockedBy, type PlanStep, type PlanStepKind } from "./planner";

export interface ActiveItem {
  item: Item;
  purpose: ItemPurpose;
  hintsAllowed: boolean;
  encourage: boolean;
  attempts: number;
  /** Hint level shown so far: 0 none, 1 question, 2 first step, 3 almost all steps. */
  hintsShown: number;
  solutionShown: boolean;
  formRetry: boolean;
  firstCorrect: boolean | null;
  lastBugId: string | null;
  /** The child's last wrong answer as shown on screen (markup). */
  lastShown: string | null;
  startedAt: number;
  done: boolean;
  /** Set by the app once the prompt has been decorated (AI word problem) so it is not redone. */
  decorated?: boolean;
  /** Hint text per level, filled in by the app (template or AI) so refreshes show the same text. */
  hints?: Record<number, string>;
}

export interface SessionStats {
  answered: number;
  firstTryCorrect: number;
  hintsUsed: number;
  mastered: string[];
  skipped: string[];
  stuck: string[];
  reviewed: string[];
  unlocked: string[];
  tookBreak: boolean;
}

export interface SessionState {
  version: 1;
  seed: number;
  grade: Grade;
  semester: Semester;
  theme: Theme;
  plan: PlanStep[];
  stepIndex: number;
  cycle: CycleState | null;
  active: ActiveItem | null;
  counter: number;
  startedAt: number;
  budgetMs: number;
  stats: SessionStats;
  finished: boolean;
}

export type SessionScreen =
  | { type: "explain"; skillId: string; strategy: Strategy; misconceptionId: string | null; example: Item; cycle: number; stepKind: PlanStepKind }
  | { type: "worked"; skillId: string; example: Item; faded: Item; stepKind: PlanStepKind }
  | { type: "item"; skillId: string; active: ActiveItem; stepKind: PlanStepKind; stepNumber: number; stepCount: number }
  | { type: "summary"; stats: SessionStats };

export interface Feedback {
  status: GradeStatus;
  /** True when the item is finished (correct, or no more tries). */
  done: boolean;
  formMessage?: string;
  bug?: { misconceptionId: string; feedback: string };
  /** Shown when the item ends without a correct answer. */
  correctAnswer?: string;
  hintLevel: number;
}

const ALL_SKILLS = new Set<string>(SKILL_IDS);
export const WORD_VARIANTS = 20;

/** Seed of one of the pooled word-problem variants. */
export function wordSeed(skillId: string, difficulty: number, theme: Theme, pick: number): number {
  return deriveSeed(0x5eed, "word", skillId, difficulty, theme, pick % WORD_VARIANTS);
}
const MAX_TRIES_WITH_HINTS = 3;

export function startSession(opts: { learner: LearnerState; grade: Grade; semester: Semester; theme: Theme; seed: number; now: number; budgetMs?: number }): SessionState {
  return {
    version: 1,
    seed: opts.seed,
    grade: opts.grade,
    semester: opts.semester,
    theme: opts.theme,
    plan: buildPlan(opts.learner, { grade: opts.grade, semester: opts.semester, now: opts.now }),
    stepIndex: 0,
    cycle: null,
    active: null,
    counter: 0,
    startedAt: opts.now,
    budgetMs: opts.budgetMs ?? SESSION_MINUTES[gradeBandOf(opts.grade)] * 60_000,
    stats: { answered: 0, firstTryCorrect: 0, hintsUsed: 0, mastered: [], skipped: [], stuck: [], reviewed: [], unlocked: [], tookBreak: false },
    finished: false,
  };
}

function cycleModeFor(kind: PlanStepKind): CycleState["mode"] {
  return kind;
}

/** The example an explanation is built around. The picture explanation prefers an example that has a picture. */
export function explanationExample(seed: number, skillId: string, cycle: number, strategy: Strategy): Item {
  const exampleSeed = deriveSeed(seed, "example", skillId, cycle);
  const example = generateItem(skillId, exampleSeed, 2);
  if (strategy === "concrete" && !example.visual) {
    // Easier items usually come with a picture.
    const easier = generateItem(skillId, exampleSeed, 1);
    if (easier.visual) return easier;
  }
  return example;
}

/**
 * The first explanation each new skill in a plan will need, so the app can have
 * the AI write them ahead of time (explanations are cached per skill and strategy).
 */
export function upcomingExplanations(plan: PlanStep[], learner: LearnerState, seed: number): Array<{ skillId: string; strategy: Strategy; misconceptionId: string | null; example: Item }> {
  return plan
    .filter((step) => step.kind === "learn")
    .map((step) => {
      const misconceptionId = activeMisconception(learner, step.skillId);
      const strategy: Strategy = misconceptionId ? "misconception" : "concrete";
      return { skillId: step.skillId, strategy, misconceptionId, example: explanationExample(seed, step.skillId, 1, strategy) };
    });
}

function activeMisconception(learner: LearnerState, skillId: string): string | null {
  const entries = Object.entries(getState(learner, skillId).misconceptions).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function applyOutcome(state: SessionState, learner: LearnerState, skillId: string, outcome: CycleOutcome, now: number): { state: SessionState; learner: LearnerState } {
  const stats = { ...state.stats };
  let next = { ...learner };
  const s = getState(next, skillId);
  switch (outcome) {
    case "mastered":
    case "skipped": {
      next[skillId] = markMastered(s, now);
      next = inferMastery(next, skillId, ALL_SKILLS, now);
      stats.mastered = outcome === "mastered" ? [...stats.mastered, skillId] : stats.mastered;
      stats.skipped = outcome === "skipped" ? [...stats.skipped, skillId] : stats.skipped;
      stats.unlocked = [...stats.unlocked, ...unlockedBy(next, skillId).filter((u) => !stats.unlocked.includes(u))];
      break;
    }
    case "stuck": {
      next[skillId] = { ...s, stuckCycles: s.stuckCycles + 1 };
      // Re-check prerequisites that were only assumed: a hidden gap may be the cause.
      for (const p of getSkill(skillId).prerequisites) {
        const ps = getState(next, p);
        if (ps.evidence !== "direct") next[p] = { ...emptySkillState(p) };
      }
      stats.stuck = [...stats.stuck, skillId];
      break;
    }
    case "review-ok":
    case "review-fail":
      next[skillId] = afterReview(s, outcome === "review-ok", now);
      stats.reviewed = [...stats.reviewed, skillId];
      break;
    case "break":
      stats.tookBreak = true;
      break;
    case "challenge-done":
      break;
  }
  return { state: { ...state, stats, finished: state.finished || outcome === "break" }, learner: next };
}

/** Moves to the next thing to show and returns it. May update the learner model. */
export function advance(input: SessionState, learnerIn: LearnerState, now: number): { state: SessionState; learner: LearnerState; screen: SessionScreen } {
  let state = { ...input };
  let learner = learnerIn;
  for (let guard = 0; guard < 50; guard++) {
    if (state.finished) return { state, learner, screen: { type: "summary", stats: state.stats } };
    const planStep = state.plan[state.stepIndex];
    if (state.active) {
      return {
        state,
        learner,
        screen: { type: "item", skillId: state.active.item.skillId, active: state.active, stepKind: planStep?.kind ?? "learn", stepNumber: state.stepIndex + 1, stepCount: state.plan.length },
      };
    }
    if (!state.cycle) {
      const timeUp = now - state.startedAt >= state.budgetMs;
      if (!planStep || timeUp) {
        state = { ...state, finished: true };
        continue;
      }
      const skill = getSkill(planStep.skillId);
      const ss = getState(learner, planStep.skillId);
      state = {
        ...state,
        cycle: startCycle(planStep.skillId, cycleModeFor(planStep.kind), {
          confirmed: ss.evidence === "direct" && deriveStatus(ss) !== "shaky",
          misconceptionId: activeMisconception(learner, planStep.skillId),
          canWord: skill.wordProblems,
        }),
      };
    }
    const cycle = state.cycle!;
    const step = currentStep(cycle);
    const kind = planStep?.kind ?? "learn";
    switch (step.kind) {
      case "done": {
        const applied = applyOutcome(state, learner, cycle.skillId, step.outcome, now);
        state = { ...applied.state, cycle: null, stepIndex: state.stepIndex + 1 };
        learner = applied.learner;
        continue;
      }
      case "explain": {
        const example = explanationExample(state.seed, cycle.skillId, step.cycle, step.strategy);
        return { state, learner, screen: { type: "explain", skillId: cycle.skillId, strategy: step.strategy, misconceptionId: step.misconceptionId, example, cycle: step.cycle, stepKind: kind } };
      }
      case "worked": {
        const example = generateItem(cycle.skillId, deriveSeed(state.seed, "worked", cycle.skillId, cycle.cycle), 1);
        const faded = generateItem(cycle.skillId, deriveSeed(state.seed, "faded", cycle.skillId, cycle.cycle), 1);
        return { state, learner, screen: { type: "worked", skillId: cycle.skillId, example, faded, stepKind: kind } };
      }
      case "item": {
        // Word problems come from a fixed pool of variants per (skill, difficulty, theme)
        // so AI-written stories can be cached once and reused by every child.
        const item = step.word
          ? generateWordItem(cycle.skillId, wordSeed(cycle.skillId, step.difficulty, state.theme, deriveSeed(state.seed, "variant", state.counter)), step.difficulty, state.theme)
          : generateItem(cycle.skillId, deriveSeed(state.seed, "item", state.counter), step.difficulty);
        const active: ActiveItem = {
          item,
          purpose: step.purpose,
          hintsAllowed: step.hintsAllowed,
          encourage: step.encourage,
          attempts: 0,
          hintsShown: 0,
          solutionShown: false,
          formRetry: false,
          firstCorrect: null,
          lastBugId: null,
          lastShown: null,
          startedAt: now,
          done: false,
        };
        state = { ...state, active, counter: state.counter + 1 };
        continue;
      }
    }
  }
  throw new Error("session did not settle");
}

export function finishExplain(state: SessionState): SessionState {
  return state.cycle ? { ...state, cycle: completeExplain(state.cycle) } : state;
}

export function finishWorked(state: SessionState): SessionState {
  return state.cycle ? { ...state, cycle: completeWorked(state.cycle) } : state;
}

function finishItem(state: SessionState, learner: LearnerState, active: ActiveItem): SessionState {
  const clean = active.firstCorrect === true && active.attempts === 1 && active.hintsShown === 0 && !active.solutionShown;
  const p = getState(learner, active.item.skillId).p;
  const cycle = state.cycle ? recordCycleAnswer(state.cycle, { clean, p }) : null;
  const stats = {
    ...state.stats,
    answered: state.stats.answered + 1,
    firstTryCorrect: state.stats.firstTryCorrect + (active.firstCorrect ? 1 : 0),
    hintsUsed: state.stats.hintsUsed + active.hintsShown,
  };
  return { ...state, cycle, stats, active: { ...active, done: true } };
}

/** Grades an answer to the active item. */
export function submitAnswer(
  input: SessionState,
  learnerIn: LearnerState,
  answer: StudentAnswer,
  now: number,
): { state: SessionState; learner: LearnerState; feedback: Feedback } {
  const active = input.active;
  if (!active || active.done) throw new Error("no active item");
  const result = grade(active.item, answer);
  if (result.status === "invalid") return { state: input, learner: learnerIn, feedback: { status: "invalid", done: false, hintLevel: active.hintsShown } };
  if (result.status === "form" && !active.formRetry) {
    return {
      state: { ...input, active: { ...active, formRetry: true } },
      learner: learnerIn,
      feedback: { status: "form", done: false, formMessage: result.formMessage, hintLevel: active.hintsShown },
    };
  }
  const correct = result.status === "correct";
  let learner = learnerIn;
  let updated: ActiveItem = {
    ...active,
    attempts: active.attempts + 1,
    lastBugId: correct ? active.lastBugId : (result.bug?.misconceptionId ?? null),
    lastShown: correct ? active.lastShown : result.shown,
  };
  if (active.attempts === 0) {
    const skill = getSkill(active.item.skillId);
    const ms = now - active.startedAt;
    updated.firstCorrect = correct;
    learner = {
      ...learner,
      [skill.id]: applyObservation(getState(learner, skill.id), {
        correct,
        guess: active.item.guessRate,
        hintsUsed: active.hintsShown,
        solutionShown: false,
        misconceptionId: result.bug?.misconceptionId,
        slow: correct && ms > skill.slowMs,
        at: now,
        learning: active.purpose === "practice",
      }),
    };
  }
  const bug = result.bug ? { misconceptionId: result.bug.misconceptionId, feedback: result.bug.feedback } : undefined;
  if (correct) {
    const state = finishItem(input, learner, updated);
    return { state, learner, feedback: { status: "correct", done: true, bug, hintLevel: updated.hintsShown } };
  }
  const canRetry = active.hintsAllowed && updated.attempts < MAX_TRIES_WITH_HINTS;
  if (canRetry) {
    updated = { ...updated, hintsShown: Math.max(updated.hintsShown, updated.attempts) };
    return { state: { ...input, active: updated }, learner, feedback: { status: "wrong", done: false, bug, hintLevel: updated.hintsShown } };
  }
  updated = { ...updated, solutionShown: true };
  const state = finishItem(input, learner, updated);
  return {
    state,
    learner,
    feedback: { status: "wrong", done: true, bug, correctAnswer: correctAnswerText(active.item), hintLevel: updated.hintsShown },
  };
}

/** Shows the next hint level (practice items only). */
export function requestHint(state: SessionState): SessionState {
  const a = state.active;
  if (!a || a.done || !a.hintsAllowed) return state;
  return { ...state, active: { ...a, hintsShown: Math.min(3, a.hintsShown + 1) } };
}

/** Gives up on the item and shows the full solution. */
export function revealSolution(state: SessionState, learner: LearnerState): SessionState {
  const a = state.active;
  if (!a || a.done) return state;
  return finishItem(state, learner, { ...a, solutionShown: true, firstCorrect: a.firstCorrect ?? false, attempts: Math.max(1, a.attempts) });
}

/** Leaves the feedback of a finished item. */
export function nextItem(state: SessionState): SessionState {
  return state.active?.done ? { ...state, active: null } : state;
}

/** Ends the session early (the child chose to stop). */
export function endSession(state: SessionState): SessionState {
  return { ...state, finished: true, active: null };
}
