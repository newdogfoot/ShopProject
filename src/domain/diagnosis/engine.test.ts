import { describe, expect, it } from "vitest";
import { descendantsOf, diagnosisRange } from "../curriculum/graph";
import { getSkill } from "../curriculum/skills";
import type { Grade, Semester } from "../curriculum/types";
import { createRng, type Rng } from "../math/rng";
import type { Item } from "../items/types";
import { diagnosisResult, nextDiagnosisItem, recordDiagnosisAnswer, startDiagnosis, MAX_ITEMS_BY_BAND, type DiagnosisAnswer } from "./engine";
import { gradeBandOf } from "../curriculum/types";

interface SimStudent {
  grade: Grade;
  semester: Semester;
  range: string[];
  known: Set<string>;
  misconception: Record<string, string>;
}

/** A child whose knowledge is consistent with the prerequisite graph. */
function makeStudent(rng: Rng): SimStudent {
  const grade = rng.int(1, 6) as Grade;
  const semester = rng.int(1, 2) as Semester;
  const range = diagnosisRange(grade, semester);
  const known = new Set(range);
  const seeds = range.length === 0 ? 0 : rng.int(0, 3);
  for (let i = 0; i < seeds; i++) {
    const g = rng.pick(range);
    known.delete(g);
    for (const d of descendantsOf(g)) known.delete(d);
  }
  const misconception: Record<string, string> = {};
  for (const id of range) {
    const ms = getSkill(id).misconceptions;
    if (!known.has(id) && ms.length > 0 && rng.bool()) misconception[id] = rng.pick(ms);
  }
  return { grade, semester, range, known, misconception };
}

const SLIP = 0.1;

function respond(rng: Rng, s: SimStudent, item: Item, at: number): DiagnosisAnswer {
  if (s.known.has(item.skillId)) return { correct: rng.next() > SLIP, ms: 15_000, at };
  const m = s.misconception[item.skillId];
  if (m && item.bugs.some((b) => b.misconceptionId === m)) return { correct: false, misconceptionId: m, ms: 15_000, at };
  return { correct: rng.next() < item.guessRate, ms: 15_000, at };
}

function trueRootGaps(s: SimStudent): string[] {
  const inRange = new Set(s.range);
  return s.range.filter((id) => !s.known.has(id) && getSkill(id).prerequisites.every((p) => !inRange.has(p) || s.known.has(p)));
}

function runDiagnosis(s: SimStudent, seed: number) {
  const rng = createRng(seed ^ 0x5bd1e995);
  let state = startDiagnosis({ grade: s.grade, semester: s.semester, seed, now: 0 });
  for (let guard = 0; guard < 100; guard++) {
    const next = nextDiagnosisItem(state);
    state = next.state;
    if (!next.item) break;
    state = recordDiagnosisAnswer(state, respond(rng, s, next.item, guard));
  }
  return { state, result: diagnosisResult(state) };
}

describe("adaptive diagnosis (simulation with 1,000 children)", () => {
  it("finds root gaps within the item budget", () => {
    const rng = createRng(2026);
    let roots = 0;
    let rootsDetected = 0;
    let rootsPinpointed = 0;
    let knownDirect = 0;
    let knownMarkedGap = 0;
    let totalItems = 0;
    const itemsByBand: Record<string, number[]> = { "1-2": [], "3-4": [], "5-6": [] };

    for (let i = 0; i < 1000; i++) {
      const s = makeStudent(rng);
      const { state, result } = runDiagnosis(s, i + 1);
      totalItems += state.asked;
      itemsByBand[gradeBandOf(s.grade)].push(state.asked);
      expect(state.asked).toBeLessThanOrEqual(MAX_ITEMS_BY_BAND[gradeBandOf(s.grade)]);

      for (const g of trueRootGaps(s)) {
        roots++;
        const st = result.statusById[g];
        if (st !== "mastered" && st !== "inferred") rootsDetected++;
        if (result.rootGaps.includes(g)) rootsPinpointed++;
      }
      for (const id of s.range) {
        const ls = state.learner[id];
        if (!s.known.has(id) || !ls || ls.evidence !== "direct") continue;
        knownDirect++;
        const st = result.statusById[id];
        if (st === "gap" || st === "misconception") knownMarkedGap++;
      }
    }

    const recall = rootsDetected / roots;
    const pinpoint = rootsPinpointed / roots;
    const falseGap = knownMarkedGap / Math.max(1, knownDirect);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    console.info(
      `[diagnosis] root-gap recall ${(recall * 100).toFixed(1)}%, pinpointed ${(pinpoint * 100).toFixed(1)}%, ` +
        `known skills marked as gap ${(falseGap * 100).toFixed(1)}%, avg items ${(totalItems / 1000).toFixed(1)} ` +
        `(1-2: ${avg(itemsByBand["1-2"]).toFixed(1)}, 3-4: ${avg(itemsByBand["3-4"]).toFixed(1)}, 5-6: ${avg(itemsByBand["5-6"]).toFixed(1)})`,
    );

    // Targets from the design doc: root-gap recall ≥ 90%, few false gaps, within the item budget.
    expect(recall).toBeGreaterThanOrEqual(0.93);
    expect(falseGap).toBeLessThanOrEqual(0.05);
    expect(pinpoint).toBeGreaterThanOrEqual(0.5);
    expect(avg(itemsByBand["1-2"])).toBeLessThanOrEqual(12);
    expect(avg(itemsByBand["3-4"])).toBeLessThanOrEqual(20);
    expect(avg(itemsByBand["5-6"])).toBeLessThanOrEqual(25);
  });

  it("finishes immediately in the first semester of grade 1", () => {
    const state = startDiagnosis({ grade: 1, semester: 1, seed: 1, now: 0 });
    expect(state.finished).toBe(true);
    expect(nextDiagnosisItem(state).item).toBeNull();
  });

  it("can be paused and resumed from JSON", () => {
    const rng = createRng(9);
    const s = makeStudent(rng);
    let state = startDiagnosis({ grade: 4, semester: 2, seed: 5, now: 0 });
    for (let i = 0; i < 3; i++) {
      const next = nextDiagnosisItem(state);
      if (!next.item) break;
      state = recordDiagnosisAnswer(JSON.parse(JSON.stringify(next.state)), respond(rng, s, next.item, i));
    }
    const again = nextDiagnosisItem(JSON.parse(JSON.stringify(state)));
    expect(again.state.asked).toBe(state.asked);
  });

  it("walks down to the missing prerequisite", () => {
    // A 5th grader (2nd semester) who has everything except 약분과 통분 and what depends on it.
    const range = diagnosisRange(5, 2);
    const known = new Set(range);
    for (const id of ["FRAC_EQUIV", ...descendantsOf("FRAC_EQUIV")]) known.delete(id);
    const s: SimStudent = { grade: 5, semester: 2, range, known, misconception: {} };
    const { result } = runDiagnosis(s, 42);
    expect(result.statusById["FRAC_EQUIV"]).not.toBe("mastered");
    expect(result.statusById["GCD_LCM"]).toMatch(/mastered|inferred|shaky/);
    expect(result.rootGaps).toContain("FRAC_EQUIV");
  });

  it("keeps a misconception found by a predicted wrong answer", () => {
    // A 5th grader who adds tops and bottoms ({1/2}+{1/3}={2/5}) but knows everything before it.
    const range = diagnosisRange(5, 2);
    const known = new Set(range);
    for (const id of ["FRAC_DIFF_DEN_ADD", ...descendantsOf("FRAC_DIFF_DEN_ADD")]) known.delete(id);
    const s: SimStudent = { grade: 5, semester: 2, range, known, misconception: { FRAC_DIFF_DEN_ADD: "FRAC_ADD_DENOMINATORS" } };
    const { result } = runDiagnosis(s, 7);
    expect(result.statusById["FRAC_DIFF_DEN_ADD"]).toBe("misconception");
    expect(result.learner["FRAC_DIFF_DEN_ADD"].misconceptions["FRAC_ADD_DENOMINATORS"]).toBeGreaterThan(0);
    expect(result.rootGaps).toContain("FRAC_DIFF_DEN_ADD");
  });
});
