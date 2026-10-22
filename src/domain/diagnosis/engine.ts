/**
 * Adaptive diagnosis.
 *
 * 1. Only skills taught in earlier semesters are in range (a gap is something
 *    the child should already know).
 * 2. Probe the "top" skills of the range first. Most children are near grade
 *    level, so one correct answer marks the skill and all of its prerequisites.
 * 3. A wrong answer gets a second item (slip or gap?). A confirmed gap marks its
 *    dependents as gaps and queues its direct prerequisites, walking down the
 *    prerequisite graph to the root gap.
 * 4. Strands are interleaved and the number of items is capped by grade.
 *
 * The state is plain JSON so a diagnosis can be paused and resumed.
 */
import { ancestorsOf, diagnosisRange, maximalSkills, skillTerm } from "../curriculum/graph";
import { getSkill, STRANDS } from "../curriculum/skills";
import { gradeBandOf, termIndex, type Grade, type Semester } from "../curriculum/types";
import { deriveSeed } from "../math/rng";
import { generateItem } from "../items";
import type { Item } from "../items/types";
import {
  applyObservation,
  BKT,
  deriveStatus,
  emptySkillState,
  getState,
  inferGap,
  inferMastery,
  isSolid,
  type LearnerState,
  type SkillStatus,
} from "../model/learner";

export const MAX_ITEMS_BY_BAND = { "1-2": 12, "3-4": 20, "5-6": 25 } as const;
const MAX_ITEMS_PER_SKILL = 3;
/** Ask a second item before inferring this many unchecked prerequisites from one answer. */
const CONFIRM_LEVERAGE = 4;

export interface DiagnosisState {
  version: 1;
  seed: number;
  grade: Grade;
  semester: Semester;
  range: string[];
  maxItems: number;
  asked: number;
  queue: string[];
  warmupSkill: string | null;
  warmupDone: boolean;
  probing: string | null;
  learner: LearnerState;
  /** Wrong or slow answers seen per skill during diagnosis. */
  flags: Record<string, { wrong: number; slow: number }>;
  current: Item | null;
  finished: boolean;
  startedAt: number;
}

export interface DiagnosisAnswer {
  correct: boolean;
  misconceptionId?: string;
  ms: number;
  at: number;
}

function strandOrder(skillId: string): number {
  return STRANDS.findIndex((s) => s.id === getSkill(skillId).strand);
}

/** Orders probes so consecutive items come from different strands, harder skills first. */
function interleave(ids: string[]): string[] {
  const byStrand = new Map<number, string[]>();
  for (const id of [...ids].sort((a, b) => skillTerm(b) - skillTerm(a))) {
    const k = strandOrder(id);
    byStrand.set(k, [...(byStrand.get(k) ?? []), id]);
  }
  const lanes = [...byStrand.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  const out: string[] = [];
  while (lanes.some((l) => l.length > 0)) {
    for (const lane of lanes) {
      const next = lane.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

function pickWarmup(range: string[], grade: Grade, semester: Semester): string | null {
  const current = termIndex(grade, semester);
  const easy = range.filter((id) => {
    const strand = getSkill(id).strand;
    return (strand === "ADDSUB" || strand === "NUM") && skillTerm(id) <= current - 4;
  });
  if (easy.length === 0) return null;
  return easy.sort((a, b) => skillTerm(b) - skillTerm(a))[0];
}

export function startDiagnosis(opts: { grade: Grade; semester: Semester; seed: number; now: number }): DiagnosisState {
  const range = diagnosisRange(opts.grade, opts.semester);
  return {
    version: 1,
    seed: opts.seed,
    grade: opts.grade,
    semester: opts.semester,
    range,
    maxItems: MAX_ITEMS_BY_BAND[gradeBandOf(opts.grade)],
    asked: 0,
    queue: interleave(maximalSkills(range)),
    warmupSkill: pickWarmup(range, opts.grade, opts.semester),
    warmupDone: false,
    probing: null,
    learner: {},
    flags: {},
    current: null,
    finished: range.length === 0,
    startedAt: opts.now,
  };
}

/** Unresolved in-range prerequisites that a mastered answer here would mark as known. */
function leverage(state: DiagnosisState, skillId: string): number {
  let n = 0;
  for (const a of ancestorsOf(skillId)) {
    const st = state.learner[a];
    if (state.range.includes(a) && (!st || st.evidence === "none")) n++;
  }
  return n;
}

/** One correct answer is enough unless it would mark many unchecked prerequisites as known. */
function confirmedMastery(state: DiagnosisState, skillId: string): boolean {
  const s = state.learner[skillId];
  if (!s || s.evidence !== "direct" || s.p < BKT.mastery) return false;
  return s.attempts >= 2 || leverage(state, skillId) < CONFIRM_LEVERAGE;
}

function confirmedGap(s: { attempts: number; p: number; misconceptions: Record<string, number> }): boolean {
  const matchedMisconception = Object.values(s.misconceptions).some((n) => n > 0);
  return s.p < BKT.gap && (s.attempts >= 2 || matchedMisconception);
}

function isResolved(state: DiagnosisState, skillId: string): boolean {
  const s = state.learner[skillId];
  if (!s || s.evidence === "none") return false;
  if (s.evidence === "inferred") return true;
  return confirmedMastery(state, skillId) || confirmedGap(s) || s.attempts >= MAX_ITEMS_PER_SKILL;
}

/** Returns the next item to show, or null when the diagnosis is finished. */
export function nextDiagnosisItem(input: DiagnosisState): { state: DiagnosisState; item: Item | null } {
  const state: DiagnosisState = { ...input };
  if (state.finished) return { state, item: null };
  if (state.current) return { state, item: state.current };
  if (state.asked >= state.maxItems) return { state: { ...state, finished: true }, item: null };

  let difficulty: 1 | 2 = 2;
  if (!state.warmupDone && state.warmupSkill) {
    state.probing = state.warmupSkill;
    difficulty = 1;
  } else if (!state.probing || isResolved(state, state.probing)) {
    const queue = [...state.queue];
    let next: string | undefined;
    while ((next = queue.shift()) !== undefined) {
      if (!isResolved(state, next)) break;
    }
    state.queue = queue;
    if (next === undefined) return { state: { ...state, finished: true, probing: null }, item: null };
    state.probing = next;
  }

  const item = generateItem(state.probing!, deriveSeed(state.seed, "diag", state.asked), difficulty);
  state.current = item;
  return { state, item };
}

/** Records the answer to the current item and decides what to probe next. */
export function recordDiagnosisAnswer(input: DiagnosisState, answer: DiagnosisAnswer): DiagnosisState {
  if (!input.current) throw new Error("no current diagnosis item");
  const item = input.current;
  const skillId = item.skillId;
  const skill = getSkill(skillId);
  const slow = answer.correct && answer.ms > skill.slowMs;
  const rangeSet = new Set(input.range);

  let learner = { ...input.learner };
  const before = getState(learner, skillId);
  // Inferred knowledge is a hint, not evidence: direct answers start from the prior.
  const base = before.evidence === "direct" ? before : { ...emptySkillState(skillId), nextReviewAt: null };
  learner[skillId] = applyObservation(base, {
    correct: answer.correct,
    guess: item.guessRate,
    hintsUsed: 0,
    solutionShown: false,
    misconceptionId: answer.misconceptionId,
    slow,
    at: answer.at,
    learning: false,
  });
  const flags = { ...input.flags };
  const f = flags[skillId] ?? { wrong: 0, slow: 0 };
  flags[skillId] = { wrong: f.wrong + (answer.correct ? 0 : 1), slow: f.slow + (slow ? 1 : 0) };

  let state: DiagnosisState = { ...input, learner, flags, asked: input.asked + 1, current: null };
  const isWarmup = !input.warmupDone && input.warmupSkill === skillId;
  if (isWarmup) state.warmupDone = true;

  const s = learner[skillId];
  if (confirmedMastery({ ...state, learner }, skillId)) {
    learner = inferMastery(learner, skillId, rangeSet, answer.at);
    // A prerequisite with a single wrong answer was probably a slip: the harder
    // skill shows it is known, so keep it as "shaky" for a short reinforcement.
    for (const a of ancestorsOf(skillId)) {
      const st = learner[a];
      if (st && st.evidence === "direct" && st.attempts < 2 && st.p < BKT.mastery) {
        learner[a] = { ...st, p: BKT.mastery, needsReinforcement: true };
      }
    }
    if (flags[skillId].wrong > 0 || flags[skillId].slow > 0) learner[skillId] = { ...learner[skillId], needsReinforcement: true };
    state = { ...state, learner, probing: null };
  } else if (!isWarmup && (confirmedGap(s) || s.attempts >= MAX_ITEMS_PER_SKILL)) {
    learner = inferGap(learner, skillId, rangeSet);
    // Walk down: probe the direct prerequisites that are still open.
    const prereqs = skill.prerequisites.filter((p) => rangeSet.has(p) && !isResolved({ ...state, learner }, p));
    const queue = [...state.queue.filter((q) => !prereqs.includes(q)), ...interleave(prereqs)];
    state = { ...state, learner, queue, probing: null };
  } else if (isWarmup) {
    state = { ...state, probing: null };
  }
  // Otherwise keep probing the same skill with another item.

  if (state.asked >= state.maxItems) state.finished = true;
  return state;
}

export interface DiagnosisResult {
  learner: LearnerState;
  /** Gaps whose prerequisites are all known: where learning should start. */
  rootGaps: string[];
  statusById: Record<string, SkillStatus>;
}

export function diagnosisResult(state: DiagnosisState): DiagnosisResult {
  // A skill left with one wrong answer (the item budget ran out) is not
  // confirmed: keep it as "probably a gap" so learning starts with a quick check.
  const learner: LearnerState = { ...state.learner };
  for (const [id, st] of Object.entries(learner)) {
    if (st.evidence === "direct" && st.attempts < 2 && st.p < BKT.mastery) {
      learner[id] = { ...st, evidence: "inferred", p: 0.3 };
    }
  }
  const statusById: Record<string, SkillStatus> = {};
  for (const id of state.range) statusById[id] = deriveStatus(getState(learner, id));
  const notSolid = (id: string) => !isSolid(statusById[id]);
  const rootGaps = state.range.filter((id) => {
    const st = statusById[id];
    if (st !== "gap" && st !== "misconception" && st !== "inferred-gap" && st !== "shaky") return false;
    return getSkill(id).prerequisites.every((p) => !statusById[p] || !notSolid(p));
  });
  return { learner, rootGaps, statusById };
}

/** Rough progress for the progress bar (0–1). */
export function diagnosisProgress(state: DiagnosisState): number {
  if (state.finished) return 1;
  const resolved = state.range.filter((id) => isResolved(state, id)).length;
  const byRange = state.range.length ? resolved / state.range.length : 1;
  const byItems = state.asked / state.maxItems;
  return Math.min(0.95, Math.max(byRange, byItems));
}
