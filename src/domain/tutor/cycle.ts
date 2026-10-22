/**
 * Learning cycle for one skill.
 *
 * learn:      [quick check] → explain → worked example → practice (with hints) → mastery check
 *             failing the check restarts with a different explanation (max 3 cycles), then "stuck"
 * reinforce:  short practice for a shaky skill; falls back to learn mode if it does not go well
 * review:     one spaced-review item without hints
 * challenge:  one harder or word problem
 */
import type { Difficulty } from "../items/types";

export type Strategy = "misconception" | "concrete" | "analogy" | "procedure";
export type CycleMode = "learn" | "reinforce" | "review" | "challenge";
export type CyclePhase = "precheck" | "explain" | "worked" | "practice" | "check" | "single" | "done";
export type CycleOutcome = "mastered" | "skipped" | "stuck" | "review-ok" | "review-fail" | "challenge-done" | "break";
export type ItemPurpose = "precheck" | "practice" | "check" | "review" | "challenge";

export interface CycleState {
  skillId: string;
  mode: CycleMode;
  phase: CyclePhase;
  cycle: number;
  strategies: Strategy[];
  misconceptionId: string | null;
  canWord: boolean;
  precheck: { asked: number; correct: number };
  practice: { count: number; streak: number; wrongStreak: number; difficulty: Difficulty };
  check: { asked: number; correct: number };
  /** Show encouragement and an easier item next. */
  encourage: boolean;
  outcome: CycleOutcome | null;
}

export type CycleStep =
  | { kind: "explain"; strategy: Strategy; misconceptionId: string | null; cycle: number }
  | { kind: "worked" }
  | { kind: "item"; purpose: ItemPurpose; difficulty: Difficulty; word: boolean; hintsAllowed: boolean; encourage: boolean }
  | { kind: "done"; outcome: CycleOutcome };

export const MAX_CYCLES = 3;
export const PRACTICE = { minItems: 4, streakToCheck: 3, maxItems: 10 } as const;
export const REINFORCE = { streakToPass: 3, maxItems: 6 } as const;
export const CHECK_ITEMS = 3;

export interface StartOptions {
  /** Whether the skill has direct evidence; without it, learning starts with a quick check. */
  confirmed: boolean;
  misconceptionId: string | null;
  canWord: boolean;
}

function freshPractice(difficulty: Difficulty = 1): CycleState["practice"] {
  return { count: 0, streak: 0, wrongStreak: 0, difficulty };
}

export function startCycle(skillId: string, mode: CycleMode, opts: StartOptions): CycleState {
  const strategies: Strategy[] = opts.misconceptionId ? ["misconception", "concrete", "procedure"] : ["concrete", "analogy", "procedure"];
  const base: CycleState = {
    skillId,
    mode,
    phase: "explain",
    cycle: 1,
    strategies,
    misconceptionId: opts.misconceptionId,
    canWord: opts.canWord,
    precheck: { asked: 0, correct: 0 },
    practice: freshPractice(),
    check: { asked: 0, correct: 0 },
    encourage: false,
    outcome: null,
  };
  switch (mode) {
    case "learn":
      return { ...base, phase: opts.confirmed ? "explain" : "precheck" };
    case "reinforce":
      return { ...base, phase: "practice", practice: freshPractice(2) };
    case "review":
    case "challenge":
      return { ...base, phase: "single" };
  }
}

export function currentStep(c: CycleState): CycleStep {
  if (c.outcome) return { kind: "done", outcome: c.outcome };
  switch (c.phase) {
    case "precheck":
      return { kind: "item", purpose: "precheck", difficulty: 2, word: false, hintsAllowed: false, encourage: false };
    case "explain":
      return { kind: "explain", strategy: c.strategies[Math.min(c.cycle, c.strategies.length) - 1], misconceptionId: c.misconceptionId, cycle: c.cycle };
    case "worked":
      return { kind: "worked" };
    case "practice":
      return {
        kind: "item",
        purpose: "practice",
        difficulty: c.encourage ? 1 : c.practice.difficulty,
        word: false,
        hintsAllowed: true,
        encourage: c.encourage,
      };
    case "check": {
      const n = c.check.asked;
      const last = n === CHECK_ITEMS - 1;
      return { kind: "item", purpose: "check", difficulty: n === 0 ? 2 : last && c.canWord ? 2 : 3, word: last && c.canWord, hintsAllowed: false, encourage: false };
    }
    case "single":
      return c.mode === "review"
        ? { kind: "item", purpose: "review", difficulty: 2, word: false, hintsAllowed: false, encourage: false }
        : { kind: "item", purpose: "challenge", difficulty: c.canWord ? 2 : 3, word: c.canWord, hintsAllowed: true, encourage: false };
    case "done":
      return { kind: "done", outcome: c.outcome ?? "stuck" };
  }
}

export function completeExplain(c: CycleState): CycleState {
  if (c.phase !== "explain") return c;
  return { ...c, phase: "worked" };
}

export function completeWorked(c: CycleState): CycleState {
  if (c.phase !== "worked") return c;
  return { ...c, phase: "practice", practice: freshPractice(), encourage: false };
}

export interface CycleAnswer {
  /** Right on the first try, with no hints and no solution shown. */
  clean: boolean;
  /** The learner's mastery probability after this answer. */
  p: number;
}

function failCycle(c: CycleState): CycleState {
  if (c.cycle >= MAX_CYCLES) return { ...c, phase: "done", outcome: "stuck" };
  return { ...c, cycle: c.cycle + 1, phase: "explain", practice: freshPractice(), check: { asked: 0, correct: 0 }, encourage: false };
}

export function recordCycleAnswer(c: CycleState, a: CycleAnswer): CycleState {
  if (c.outcome) return c;
  switch (c.phase) {
    case "precheck": {
      const precheck = { asked: c.precheck.asked + 1, correct: c.precheck.correct + (a.clean ? 1 : 0) };
      if (!a.clean) return { ...c, precheck, phase: "explain" };
      if (precheck.correct >= 2) return { ...c, precheck, phase: "done", outcome: "skipped" };
      return { ...c, precheck };
    }
    case "practice": {
      const pr = { ...c.practice, count: c.practice.count + 1 };
      let encourage = false;
      if (a.clean) {
        pr.streak += 1;
        pr.wrongStreak = 0;
        if (pr.streak % 2 === 0 && pr.difficulty < 3) pr.difficulty = (pr.difficulty + 1) as Difficulty;
      } else {
        pr.streak = 0;
        pr.wrongStreak += 1;
        if (pr.wrongStreak >= 2 && pr.difficulty > 1) pr.difficulty = (pr.difficulty - 1) as Difficulty;
        if (pr.wrongStreak >= 3) encourage = true;
      }
      if (pr.wrongStreak >= 5) return { ...c, practice: pr, phase: "done", outcome: "break" };
      if (c.mode === "reinforce") {
        if (pr.streak >= REINFORCE.streakToPass) return { ...c, practice: pr, phase: "done", outcome: "mastered" };
        // Not going well: switch to full learning with an explanation.
        if (pr.count >= REINFORCE.maxItems) return { ...c, mode: "learn", practice: freshPractice(), phase: "explain", encourage: false };
        return { ...c, practice: pr, encourage };
      }
      if (pr.count >= PRACTICE.minItems && pr.streak >= PRACTICE.streakToCheck) {
        return { ...c, practice: pr, phase: "check", check: { asked: 0, correct: 0 }, encourage: false };
      }
      if (pr.count >= PRACTICE.maxItems) return failCycle({ ...c, practice: pr });
      return { ...c, practice: pr, encourage };
    }
    case "check": {
      const check = { asked: c.check.asked + 1, correct: c.check.correct + (a.clean ? 1 : 0) };
      if (check.asked >= 2 && check.correct === 0) return failCycle({ ...c, check });
      if (check.asked < CHECK_ITEMS) return { ...c, check };
      const passed = check.correct === CHECK_ITEMS || (check.correct === CHECK_ITEMS - 1 && a.p >= 0.9);
      return passed ? { ...c, check, phase: "done", outcome: "mastered" } : failCycle({ ...c, check });
    }
    case "single":
      if (c.mode === "review") return { ...c, phase: "done", outcome: a.clean ? "review-ok" : "review-fail" };
      return { ...c, phase: "done", outcome: "challenge-done" };
    default:
      return c;
  }
}
