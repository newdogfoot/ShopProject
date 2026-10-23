/**
 * Learner model: one record per (student, skill) with a mastery probability
 * from Bayesian Knowledge Tracing (BKT), evidence flags, active misconceptions
 * and a spaced-review schedule.
 */
import { ancestorsOf, descendantsOf } from "../curriculum/graph";

export type SkillStatus =
  | "mastered" // 숙달
  | "inferred" // 추정 숙달 (a harder skill was answered correctly)
  | "shaky" // 불안정
  | "gap" // 미숙달
  | "inferred-gap" // 추정 미숙달 (a prerequisite is missing)
  | "misconception" // 오개념
  | "unknown"; // 미진단

export const STATUS_LABEL: Record<SkillStatus | "not-yet", string> = {
  mastered: "숙달",
  inferred: "추정 숙달",
  shaky: "불안정",
  gap: "미숙달",
  "inferred-gap": "미숙달(추정)",
  misconception: "오개념",
  unknown: "미진단",
  "not-yet": "아직 안 배움",
};

export interface SkillState {
  skillId: string;
  /** Probability that the skill is learned (0–1). */
  p: number;
  evidence: "none" | "direct" | "inferred";
  attempts: number;
  correct: number;
  /** Set when a mastered skill still showed wrong or slow answers; cleared by practice. */
  needsReinforcement: boolean;
  /** Active misconception id → times matched since the skill was last mastered. */
  misconceptions: Record<string, number>;
  lastSeenAt: number | null;
  reviewStage: number;
  nextReviewAt: number | null;
  /** Learning cycles that ended without mastery (3 in a row → escalate). */
  stuckCycles: number;
  masteredAt: number | null;
  /** Answers to "why does this work?" questions (absent until the first one). */
  reason?: ReasonRecord;
}

export interface ReasonRecord {
  asked: number;
  correct: number;
  lastCorrect: boolean;
  lastAt: number;
  /** Misconception shown by the last wrong reason, if any. */
  misconceptionId: string | null;
}

export type LearnerState = Record<string, SkillState>;

export const BKT = {
  prior: 0.5,
  slip: 0.15,
  learn: 0.15,
  mastery: 0.9,
  gap: 0.4,
  inferredMastered: 0.85,
  inferredGap: 0.2,
} as const;

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

export function emptySkillState(skillId: string): SkillState {
  return {
    skillId,
    p: BKT.prior,
    evidence: "none",
    attempts: 0,
    correct: 0,
    needsReinforcement: false,
    misconceptions: {},
    lastSeenAt: null,
    reviewStage: 0,
    nextReviewAt: null,
    stuckCycles: 0,
    masteredAt: null,
  };
}

/** Posterior probability of mastery after one observation (no learning step). */
export function bktPosterior(p: number, correct: boolean, guess: number, slip: number = BKT.slip): number {
  if (correct) {
    const num = p * (1 - slip);
    return num / (num + (1 - p) * guess);
  }
  const num = p * slip;
  return num / (num + (1 - p) * (1 - guess));
}

/** Learning step between practice opportunities. */
export function bktLearn(p: number, learn: number = BKT.learn): number {
  return p + (1 - p) * learn;
}

export interface Observation {
  correct: boolean;
  guess: number;
  /** 0 hints → full evidence; 1 hint → half; 2+ hints → a fifth; solution shown → none. */
  hintsUsed: number;
  solutionShown: boolean;
  misconceptionId?: string;
  slow: boolean;
  at: number;
  /** Diagnosis does not apply the learning step. */
  learning: boolean;
}

export function evidenceWeight(o: Pick<Observation, "hintsUsed" | "solutionShown" | "correct">): number {
  if (!o.correct) return 1;
  if (o.solutionShown) return 0;
  if (o.hintsUsed === 0) return 1;
  if (o.hintsUsed === 1) return 0.5;
  return 0.2;
}

export function applyObservation(state: SkillState, o: Observation): SkillState {
  const w = evidenceWeight(o);
  const prior = state.evidence === "direct" ? state.p : BKT.prior;
  const posterior = bktPosterior(prior, o.correct, o.guess);
  let p = prior + (posterior - prior) * w;
  if (o.learning) p = bktLearn(p);
  p = Math.min(0.999, Math.max(0.001, p));
  const misconceptions = { ...state.misconceptions };
  if (o.misconceptionId) misconceptions[o.misconceptionId] = (misconceptions[o.misconceptionId] ?? 0) + 1;
  return {
    ...state,
    p,
    evidence: "direct",
    attempts: state.attempts + 1,
    correct: state.correct + (o.correct ? 1 : 0),
    needsReinforcement: state.needsReinforcement || (!o.correct && state.p >= BKT.mastery) || (o.correct && o.slow && !o.learning),
    misconceptions,
    lastSeenAt: o.at,
  };
}

export function deriveStatus(s: SkillState): SkillStatus {
  if (s.evidence === "none") return "unknown";
  if (s.evidence === "inferred") return s.p >= 0.5 ? "inferred" : "inferred-gap";
  const activeMisconception = Object.values(s.misconceptions).some((n) => n > 0);
  if (activeMisconception && s.p < BKT.mastery) return "misconception";
  if (s.p >= BKT.mastery) return s.needsReinforcement ? "shaky" : "mastered";
  if (s.p >= BKT.gap) return "shaky";
  return "gap";
}

/** Statuses that count as "known well enough" to build on. */
export function isSolid(status: SkillStatus): boolean {
  return status === "mastered" || status === "inferred" || status === "shaky";
}

export function getState(learner: LearnerState, skillId: string): SkillState {
  return learner[skillId] ?? emptySkillState(skillId);
}

/**
 * Records an answer to a "why" question. Reasons do not change the mastery
 * probability, except that a misconception shown again at a review becomes
 * active so the next session explains it.
 */
export function recordReason(
  state: SkillState,
  r: { correct: boolean; misconceptionId?: string | null; at: number; review: boolean },
): SkillState {
  const prev = state.reason;
  const reason: ReasonRecord = {
    asked: (prev?.asked ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (r.correct ? 1 : 0),
    lastCorrect: r.correct,
    lastAt: r.at,
    misconceptionId: r.correct ? null : (r.misconceptionId ?? null),
  };
  const next: SkillState = { ...state, reason, lastSeenAt: r.at };
  if (r.review && !r.correct && r.misconceptionId) {
    return {
      ...next,
      p: Math.min(next.p, BKT.mastery - 0.05),
      misconceptions: { ...next.misconceptions, [r.misconceptionId]: (next.misconceptions[r.misconceptionId] ?? 0) + 1 },
    };
  }
  return next;
}

/**
 * Applies a guardian's check of a written explanation. `counted`: the
 * explanation was already graded into the record; `wasCorrect`: it counted as right.
 */
export function reviseReason(state: SkillState, r: { counted: boolean; wasCorrect: boolean; nowCorrect: boolean; at: number }): SkillState {
  const prev = state.reason ?? { asked: 0, correct: 0, lastCorrect: false, lastAt: r.at, misconceptionId: null };
  const correct = prev.correct + (r.nowCorrect ? 1 : 0) - (r.counted && r.wasCorrect ? 1 : 0);
  return {
    ...state,
    reason: {
      ...prev,
      asked: prev.asked + (r.counted ? 0 : 1),
      correct: Math.max(0, Math.min(correct, prev.asked + (r.counted ? 0 : 1))),
      lastCorrect: r.nowCorrect,
      misconceptionId: r.nowCorrect ? null : prev.misconceptionId,
    },
  };
}

/** Marks a skill as mastered after a passed check, clearing misconceptions and starting reviews. */
export function markMastered(state: SkillState, now: number): SkillState {
  return {
    ...state,
    p: Math.max(state.p, BKT.mastery),
    evidence: "direct",
    needsReinforcement: false,
    misconceptions: {},
    reviewStage: 0,
    nextReviewAt: now + REVIEW_INTERVAL_DAYS[0] * DAY,
    stuckCycles: 0,
    masteredAt: now,
  };
}

/** Updates the review schedule after a spaced-review answer. */
export function afterReview(state: SkillState, correct: boolean, now: number): SkillState {
  if (correct) {
    const stage = Math.min(state.reviewStage + 1, REVIEW_INTERVAL_DAYS.length - 1);
    return { ...state, reviewStage: stage, nextReviewAt: now + REVIEW_INTERVAL_DAYS[stage] * DAY };
  }
  return { ...state, needsReinforcement: true, reviewStage: 0, nextReviewAt: null };
}

/** Prerequisites of a mastered skill are very likely known: mark unknown ones as inferred. */
export function inferMastery(learner: LearnerState, skillId: string, range: Set<string>, now: number): LearnerState {
  const next = { ...learner };
  for (const a of ancestorsOf(skillId)) {
    if (!range.has(a)) continue;
    const s = getState(next, a);
    if (s.evidence === "direct") continue;
    next[a] = {
      ...s,
      evidence: "inferred",
      p: BKT.inferredMastered,
      // Verify inferred skills with a light review a few days later.
      nextReviewAt: s.nextReviewAt ?? now + REVIEW_INTERVAL_DAYS[1] * DAY,
    };
  }
  return next;
}

/** Skills that build on a missing skill are very likely missing too. */
export function inferGap(learner: LearnerState, skillId: string, range: Set<string>): LearnerState {
  const next = { ...learner };
  for (const d of descendantsOf(skillId)) {
    if (!range.has(d)) continue;
    const s = getState(next, d);
    if (s.evidence !== "none") continue;
    next[d] = { ...s, evidence: "inferred", p: BKT.inferredGap };
  }
  return next;
}

export const DAY_MS = DAY;
