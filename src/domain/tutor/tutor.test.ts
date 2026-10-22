import { describe, expect, it } from "vitest";
import { completeExplain, completeWorked, currentStep, recordCycleAnswer, startCycle, type CycleState } from "./cycle";
import { buildPlan, learnableSkills } from "./planner";
import { advance, finishExplain, finishWorked, nextItem, requestHint, startSession, submitAnswer, type SessionState } from "./session";
import { BKT, deriveStatus, emptySkillState, getState, markMastered, type LearnerState } from "../model/learner";
import { diagnosisRange, learningRange } from "../curriculum/graph";
import { answerToInput } from "../items/answer";
import type { StudentAnswer, AnswerSpec } from "../items/types";

const clean = { clean: true, p: 0.95 };
const miss = { clean: false, p: 0.3 };

function toPractice(c: CycleState): CycleState {
  return completeWorked(completeExplain(c));
}

describe("learning cycle", () => {
  it("goes explain → worked → practice → check → mastered", () => {
    let c = startCycle("AS_2D_CARRY_ADD", "learn", { confirmed: true, misconceptionId: null, canWord: true });
    expect(currentStep(c)).toMatchObject({ kind: "explain", strategy: "concrete" });
    c = completeExplain(c);
    expect(currentStep(c).kind).toBe("worked");
    c = completeWorked(c);
    for (let i = 0; i < 4; i++) {
      expect(currentStep(c)).toMatchObject({ kind: "item", purpose: "practice", hintsAllowed: true });
      c = recordCycleAnswer(c, clean);
    }
    expect(currentStep(c)).toMatchObject({ kind: "item", purpose: "check", hintsAllowed: false });
    c = recordCycleAnswer(c, clean);
    c = recordCycleAnswer(c, clean);
    expect(currentStep(c)).toMatchObject({ kind: "item", purpose: "check", word: true });
    c = recordCycleAnswer(c, clean);
    expect(c.outcome).toBe("mastered");
  });

  it("starts from the misconception and changes strategy after a failed cycle", () => {
    let c = startCycle("AS_2D_BORROW_SUB", "learn", { confirmed: true, misconceptionId: "SUB_SMALLER_FROM_LARGER", canWord: true });
    expect(currentStep(c)).toMatchObject({ kind: "explain", strategy: "misconception" });
    c = toPractice(c);
    for (let i = 0; i < 10; i++) c = recordCycleAnswer(c, i % 2 ? clean : miss);
    expect(c.cycle).toBe(2);
    expect(currentStep(c)).toMatchObject({ kind: "explain", strategy: "concrete" });
  });

  it("ends as stuck after three failed cycles", () => {
    let c = startCycle("FRAC_EQUIV", "learn", { confirmed: true, misconceptionId: null, canWord: false });
    for (let cycle = 0; cycle < 3; cycle++) {
      c = toPractice(c);
      for (let i = 0; i < 10 && !c.outcome && c.phase === "practice"; i++) c = recordCycleAnswer(c, i % 3 === 2 ? miss : clean);
      // fail the check
      while (c.phase === "check") c = recordCycleAnswer(c, miss);
    }
    expect(c.outcome).toBe("stuck");
  });

  it("skips learning when the quick check is passed", () => {
    let c = startCycle("MUL_FACTS", "learn", { confirmed: false, misconceptionId: null, canWord: true });
    expect(currentStep(c)).toMatchObject({ kind: "item", purpose: "precheck" });
    c = recordCycleAnswer(c, clean);
    c = recordCycleAnswer(c, clean);
    expect(c.outcome).toBe("skipped");

    let d = startCycle("MUL_FACTS", "learn", { confirmed: false, misconceptionId: null, canWord: true });
    d = recordCycleAnswer(d, miss);
    expect(currentStep(d).kind).toBe("explain");
  });

  it("passes the check with two of three when mastery is high", () => {
    let c = toPractice(startCycle("DEC_ADD", "learn", { confirmed: true, misconceptionId: null, canWord: true }));
    for (let i = 0; i < 4; i++) c = recordCycleAnswer(c, clean);
    c = recordCycleAnswer(c, clean);
    c = recordCycleAnswer(c, miss);
    c = recordCycleAnswer(c, { clean: true, p: 0.95 });
    expect(c.outcome).toBe("mastered");
  });

  it("makes practice easier after mistakes and suggests a break after five", () => {
    let c = toPractice(startCycle("DIV_NBY1", "learn", { confirmed: true, misconceptionId: null, canWord: true }));
    for (let i = 0; i < 3; i++) c = recordCycleAnswer(c, miss);
    expect(currentStep(c)).toMatchObject({ kind: "item", difficulty: 1, encourage: true });
    c = recordCycleAnswer(c, miss);
    c = recordCycleAnswer(c, miss);
    expect(c.outcome).toBe("break");
  });

  it("reinforces shaky skills briefly and falls back to learning", () => {
    let ok = startCycle("AS_3D_SUB", "reinforce", { confirmed: true, misconceptionId: null, canWord: true });
    for (let i = 0; i < 3; i++) ok = recordCycleAnswer(ok, clean);
    expect(ok.outcome).toBe("mastered");

    let bad = startCycle("AS_3D_SUB", "reinforce", { confirmed: true, misconceptionId: null, canWord: true });
    for (let i = 0; i < 6; i++) bad = recordCycleAnswer(bad, i % 2 ? clean : miss);
    expect(bad.mode).toBe("learn");
    expect(currentStep(bad).kind).toBe("explain");
  });

  it("reviews with a single item", () => {
    const ok = recordCycleAnswer(startCycle("MUL_FACTS", "review", { confirmed: true, misconceptionId: null, canWord: true }), clean);
    expect(ok.outcome).toBe("review-ok");
    const fail = recordCycleAnswer(startCycle("MUL_FACTS", "review", { confirmed: true, misconceptionId: null, canWord: true }), miss);
    expect(fail.outcome).toBe("review-fail");
  });
});

function masteredLearner(ids: string[], now: number): LearnerState {
  const learner: LearnerState = {};
  for (const id of ids) learner[id] = markMastered(emptySkillState(id), now);
  return learner;
}

describe("planner", () => {
  const now = Date.UTC(2026, 9, 22);

  it("plans the gap whose prerequisites are known", () => {
    const range = diagnosisRange(3, 2);
    const learner = masteredLearner(range.filter((id) => id !== "AS_2D_BORROW_SUB" && id !== "AS_3D_SUB"), now);
    learner["AS_2D_BORROW_SUB"] = { ...emptySkillState("AS_2D_BORROW_SUB"), evidence: "direct", p: 0.05, attempts: 2 };
    expect(learnableSkills(learner, range)).toContain("AS_2D_BORROW_SUB");
    expect(learnableSkills(learner, range)).not.toContain("AS_3D_SUB");
    const plan = buildPlan(learner, { grade: 3, semester: 2, now });
    expect(plan.find((p) => p.kind === "learn")?.skillId).toBe("AS_2D_BORROW_SUB");
  });

  it("puts misconceptions first and adds due reviews and a challenge", () => {
    const range = diagnosisRange(5, 1);
    const learner = masteredLearner(range, now - 3 * 24 * 3600_000);
    learner["MUL_NBY2"] = { ...learner["MUL_NBY2"], p: 0.2, misconceptions: { MUL_PARTIAL_NO_SHIFT: 1 }, masteredAt: null };
    const plan = buildPlan(learner, { grade: 5, semester: 1, now });
    expect(plan[0].kind).toBe("review");
    const learn = plan.filter((p) => p.kind === "learn").map((p) => p.skillId);
    expect(learn[0]).toBe("MUL_NBY2");
    expect(plan.some((p) => p.kind === "challenge")).toBe(true);
  });

  it("previews the next semester when everything is mastered", () => {
    const learner = masteredLearner(learningRange(2, 1), now);
    const plan = buildPlan(learner, { grade: 2, semester: 1, now });
    const learn = plan.filter((p) => p.kind === "learn").map((p) => p.skillId);
    expect(learn.length).toBeGreaterThan(0);
    expect(learn.every((id) => !learningRange(2, 1).includes(id))).toBe(true);
  });
});

function wrongInput(spec: AnswerSpec): StudentAnswer {
  switch (spec.kind) {
    case "integer":
      return { kind: "integer", text: String(spec.value + 1) };
    case "decimal":
      return { kind: "decimal", text: "9999" };
    case "fraction":
      return { kind: "fraction", whole: "99", num: "", den: "" };
    case "quotient-remainder":
      return { kind: "quotient-remainder", quotient: String(spec.quotient + 1), remainder: "0" };
    case "compare":
      return { kind: "compare", value: spec.value === "<" ? ">" : "<" };
    case "integer-list":
      return { kind: "integer-list", text: "999" };
  }
}

/** Plays a session with a child who answers correctly with probability `accuracy`. */
function playSession(learner0: LearnerState, accuracy: number, grade: 1 | 2 | 3 | 4 | 5 | 6 = 3) {
  let learner = learner0;
  let now = Date.UTC(2026, 9, 22, 9);
  let state: SessionState = startSession({ learner, grade, semester: 2, theme: "animal", seed: 7, now, budgetMs: 60 * 60_000 });
  let i = 0;
  for (let guard = 0; guard < 400; guard++) {
    const r = advance(state, learner, now);
    state = r.state;
    learner = r.learner;
    const screen = r.screen;
    now += 20_000;
    if (screen.type === "summary") return { state, learner, screen };
    if (screen.type === "explain") state = finishExplain(state);
    else if (screen.type === "worked") state = finishWorked(state);
    else {
      i++;
      const item = screen.active.item;
      const right = (i * 7919) % 100 < accuracy * 100;
      const out = submitAnswer(state, learner, right ? answerToInput(item.answer) : wrongInput(item.answer), now);
      state = out.state;
      learner = out.learner;
      if (!out.feedback.done) {
        state = requestHint(state);
        const retry = submitAnswer(state, learner, answerToInput(item.answer), now);
        state = retry.state;
        learner = retry.learner;
      }
      state = nextItem(state);
    }
  }
  throw new Error("session did not end");
}

describe("learning session", () => {
  const now = Date.UTC(2026, 9, 22);

  it("masters the planned skill when the child answers well", () => {
    const range = diagnosisRange(3, 2);
    const learner = masteredLearner(range.filter((id) => id !== "AS_2D_BORROW_SUB" && id !== "AS_3D_SUB"), now - 86400_000);
    learner["AS_2D_BORROW_SUB"] = { ...emptySkillState("AS_2D_BORROW_SUB"), evidence: "direct", p: 0.05, attempts: 2 };
    const { screen, learner: after } = playSession(learner, 1);
    expect(screen.type).toBe("summary");
    if (screen.type !== "summary") return;
    expect(screen.stats.mastered).toContain("AS_2D_BORROW_SUB");
    expect(deriveStatus(getState(after, "AS_2D_BORROW_SUB"))).toBe("mastered");
    expect(getState(after, "AS_2D_BORROW_SUB").nextReviewAt).not.toBeNull();
  });

  it("always ends, even when the child keeps getting it wrong", () => {
    const range = diagnosisRange(3, 2);
    const learner = masteredLearner(range.filter((id) => id !== "AS_2D_BORROW_SUB" && id !== "AS_3D_SUB"), now - 86400_000);
    learner["AS_2D_BORROW_SUB"] = { ...emptySkillState("AS_2D_BORROW_SUB"), evidence: "direct", p: 0.05, attempts: 2 };
    const { screen, learner: after } = playSession(learner, 0);
    expect(screen.type).toBe("summary");
    if (screen.type !== "summary") return;
    expect(screen.stats.mastered).not.toContain("AS_2D_BORROW_SUB");
    expect(getState(after, "AS_2D_BORROW_SUB").p).toBeLessThan(BKT.mastery);
  });

  it("gives a second chance when only the form is wrong", () => {
    const learner = masteredLearner(diagnosisRange(5, 2).filter((id) => id !== "FRAC_EQUIV" && id !== "FRAC_DIFF_DEN_ADD" && id !== "FRAC_DIFF_DEN_SUB"), now);
    learner["FRAC_EQUIV"] = { ...emptySkillState("FRAC_EQUIV"), evidence: "direct", p: 0.1, attempts: 2 };
    let state = startSession({ learner, grade: 5, semester: 2, theme: "snack", seed: 3, now });
    state = finishWorked(finishExplain(advance(state, learner, now).state));
    const r = advance(state, learner, now);
    if (r.screen.type !== "item") throw new Error("expected an item");
    const spec = r.screen.active.item.answer;
    if (spec.kind !== "fraction" || spec.form !== "reduced") return; // practice item without a form rule
    const doubled: StudentAnswer = { kind: "fraction", whole: "", num: String(spec.value.n * 2), den: String(spec.value.d * 2) };
    const out = submitAnswer(r.state, learner, doubled, now);
    expect(out.feedback.status).toBe("form");
    expect(out.feedback.done).toBe(false);
  });
});
