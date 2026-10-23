import { describe, expect, it } from "vitest";
import { completeExplain, completeWorked, currentStep, recordCycleAnswer, startCycle, type CycleState } from "./cycle";
import { buildPlan, learnableSkills } from "./planner";
import {
  advance,
  explanationExample,
  finishExplain,
  finishWorked,
  nextItem,
  requestHint,
  startSession,
  submitAnswer,
  submitReasonResult,
  upcomingExplanations,
  type SessionState,
} from "./session";
import { BKT, deriveStatus, emptySkillState, getState, markMastered, recordReason, reviseReason, type LearnerState } from "../model/learner";
import type { ReasonMode } from "../items/reason";
import { diagnosisRange, learningRange } from "../curriculum/graph";
import { answerToInput, wrongInput } from "../items/answer";
import type { StudentAnswer } from "../items/types";

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

  it("plans only the domains that were diagnosed", () => {
    const range = diagnosisRange(3, 2);
    const learner = masteredLearner(range.filter((id) => id !== "AS_2D_BORROW_SUB" && id !== "AS_3D_SUB"), now);
    learner["AS_2D_BORROW_SUB"] = { ...emptySkillState("AS_2D_BORROW_SUB"), evidence: "direct", p: 0.05, attempts: 2 };
    expect(buildPlan(learner, { grade: 3, semester: 2, now, domains: ["NUM_OPS"] })).toEqual(buildPlan(learner, { grade: 3, semester: 2, now }));
    expect(buildPlan(learner, { grade: 3, semester: 2, now, domains: [] })).toEqual([]);
  });

  it("can take prerequisites as known without evidence", () => {
    const learner: LearnerState = {};
    expect(learnableSkills(learner, ["AS_2D_BORROW_SUB"])).toEqual([]);
    expect(learnableSkills(learner, ["AS_2D_BORROW_SUB"], () => true)).toEqual(["AS_2D_BORROW_SUB"]);
  });

  it("previews the next semester when everything is mastered", () => {
    const learner = masteredLearner(learningRange(2, 1), now);
    const plan = buildPlan(learner, { grade: 2, semester: 1, now });
    const learn = plan.filter((p) => p.kind === "learn").map((p) => p.skillId);
    expect(learn.length).toBeGreaterThan(0);
    expect(learn.every((id) => !learningRange(2, 1).includes(id))).toBe(true);
  });
});


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

describe("explanation warm-up", () => {
  it("lists the first explanation of each new skill, starting from a misconception when there is one", () => {
    const learner: LearnerState = {
      FRAC_EQUIV: { ...emptySkillState("FRAC_EQUIV"), evidence: "direct", p: 0.1, attempts: 1, misconceptions: { FRAC_EQUIV_ADD_SAME: 1 } },
    };
    const list = upcomingExplanations(
      [
        { kind: "review", skillId: "AS_2D_CARRY_ADD" },
        { kind: "learn", skillId: "FRAC_EQUIV" },
        { kind: "learn", skillId: "DEC_ADD" },
      ],
      learner,
      7,
    );
    expect(list.map((x) => [x.skillId, x.strategy, x.misconceptionId])).toEqual([
      ["FRAC_EQUIV", "misconception", "FRAC_EQUIV_ADD_SAME"],
      ["DEC_ADD", "concrete", null],
    ]);
  });

  it("gives the picture explanation an example with a picture when the skill has one", () => {
    // Three-digit numbers only come with base-ten blocks at the easiest difficulty.
    for (let seed = 1; seed <= 20; seed++) expect(explanationExample(seed, "NUM_3DIGIT", 1, "concrete").visual).toBeDefined();
  });
});

describe("why questions", () => {
  it("asks why after the mastery check in learn mode, then ends as mastered either way", () => {
    let c = startCycle("FRAC_DIFF_DEN_ADD", "learn", { confirmed: true, misconceptionId: null, canWord: true, hasReason: true });
    c = toPractice(c);
    for (let i = 0; i < 4; i++) c = recordCycleAnswer(c, clean);
    for (let i = 0; i < 3; i++) c = recordCycleAnswer(c, clean);
    expect(currentStep(c)).toMatchObject({ kind: "item", purpose: "reason", hintsAllowed: false });
    c = recordCycleAnswer(c, miss);
    expect(c.outcome).toBe("mastered");
  });

  it("skips the why step for skills without why questions and in reinforcement", () => {
    let c = startCycle("NUM_UPTO9", "learn", { confirmed: true, misconceptionId: null, canWord: false, hasReason: false });
    c = toPractice(c);
    for (let i = 0; i < 7; i++) c = recordCycleAnswer(c, clean);
    expect(c.outcome).toBe("mastered");
    let r = startCycle("FRAC_DIFF_DEN_ADD", "reinforce", { confirmed: true, misconceptionId: null, canWord: true, hasReason: true });
    for (let i = 0; i < 3; i++) r = recordCycleAnswer(r, clean);
    expect(r.outcome).toBe("mastered");
  });

  it("asks why in a review when chosen", () => {
    const c = startCycle("FRAC_DIFF_DEN_ADD", "review", { confirmed: true, misconceptionId: null, canWord: true, hasReason: true, reasonReview: true });
    expect(currentStep(c)).toMatchObject({ kind: "item", purpose: "reason" });
    expect(recordCycleAnswer(c, clean).outcome).toBe("review-ok");
  });

  it("records reasons apart from mastery; a misconception repeated at review re-opens the skill", () => {
    const s0 = { ...emptySkillState("FRAC_DIFF_DEN_ADD"), evidence: "direct" as const, p: 0.95, attempts: 8, correct: 8 };
    const s1 = recordReason(s0, { correct: false, misconceptionId: "FRAC_ADD_DENOMINATORS", at: 1, review: false });
    expect(s1.p).toBe(0.95);
    expect(s1.reason).toMatchObject({ asked: 1, correct: 0, lastCorrect: false, misconceptionId: "FRAC_ADD_DENOMINATORS" });
    expect(deriveStatus(s1)).toBe("mastered");
    const s2 = recordReason(s1, { correct: false, misconceptionId: "FRAC_ADD_DENOMINATORS", at: 2, review: true });
    expect(s2.p).toBeLessThan(BKT.mastery);
    expect(deriveStatus(s2)).toBe("misconception");
    const s3 = recordReason(s2, { correct: true, at: 3, review: true });
    expect(s3.reason).toMatchObject({ asked: 3, correct: 1, lastCorrect: true, misconceptionId: null });
  });

  it("applies a guardian's check of a written explanation", () => {
    const partly = { ...emptySkillState("FRAC_EQUIV"), reason: { asked: 1, correct: 0, lastCorrect: false, lastAt: 1, misconceptionId: null } };
    expect(reviseReason(partly, { counted: true, wasCorrect: false, nowCorrect: true, at: 2 }).reason).toMatchObject({ asked: 1, correct: 1, lastCorrect: true });
    const ungraded = emptySkillState("FRAC_EQUIV");
    expect(reviseReason(ungraded, { counted: false, wasCorrect: false, nowCorrect: true, at: 2 }).reason).toMatchObject({ asked: 1, correct: 1 });
    const good = { ...emptySkillState("FRAC_EQUIV"), reason: { asked: 1, correct: 1, lastCorrect: true, lastAt: 1, misconceptionId: null } };
    expect(reviseReason(good, { counted: true, wasCorrect: true, nowCorrect: false, at: 2 }).reason).toMatchObject({ asked: 1, correct: 0, lastCorrect: false });
  });

  /** A grade-5 child who only lacks unlike-denominator addition. */
  function fractionLearner(now: number): LearnerState {
    const learner = masteredLearner(diagnosisRange(5, 2).filter((id) => id !== "FRAC_DIFF_DEN_ADD" && id !== "FRAC_DIFF_DEN_SUB"), now - 86400_000);
    learner["FRAC_DIFF_DEN_ADD"] = { ...emptySkillState("FRAC_DIFF_DEN_ADD"), evidence: "direct", p: 0.05, attempts: 2 };
    return learner;
  }

  function playUntilReason(mode: ReasonMode) {
    const now = Date.UTC(2026, 9, 23, 9);
    let learner = fractionLearner(now);
    let state = startSession({ learner, grade: 5, semester: 2, theme: "space", seed: 11, now, budgetMs: 60 * 60_000, reasonMode: mode });
    for (let guard = 0; guard < 200; guard++) {
      const r = advance(state, learner, now);
      state = r.state;
      learner = r.learner;
      if (r.screen.type === "summary") break;
      if (r.screen.type === "explain") state = finishExplain(state);
      else if (r.screen.type === "worked") state = finishWorked(state);
      else {
        const active = r.screen.active;
        if (active.purpose === "reason") return { state, learner, active, now };
        const out = submitAnswer(state, learner, answerToInput(active.item.answer), now);
        state = nextItem(out.state);
        learner = out.learner;
      }
    }
    throw new Error("no why question came up");
  }

  it("asks a pick-one why question in a session and keeps it out of the mastery probability", () => {
    const { state, learner, active, now } = playUntilReason("choice");
    expect(active.item.answer.kind).toBe("choice");
    const before = getState(learner, "FRAC_DIFF_DEN_ADD").p;
    const bug = active.item.bugs[0];
    const out = submitAnswer(state, learner, answerToInput(bug.answer!), now);
    expect(out.feedback).toMatchObject({ status: "wrong", done: true });
    const after = getState(out.learner, "FRAC_DIFF_DEN_ADD");
    expect(after.p).toBe(before);
    expect(after.reason).toMatchObject({ asked: 1, lastCorrect: false, misconceptionId: bug.misconceptionId });
    // The cycle still ends as mastered.
    const next = advance(nextItem(out.state), out.learner, now);
    expect(deriveStatus(getState(next.learner, "FRAC_DIFF_DEN_ADD"))).toBe("mastered");
  });

  it("takes written why answers only through submitReasonResult", () => {
    const { state, learner, active, now } = playUntilReason("write");
    expect(active.item.answer.kind).toBe("text");
    expect(() => submitAnswer(state, learner, { kind: "text", text: "분모가 달라요" }, now)).toThrow();
    const ungraded = submitReasonResult(state, learner, { text: "분모가 달라서 통분해요", score: null, feedback: "확인 중" }, now);
    expect(getState(ungraded.learner, "FRAC_DIFF_DEN_ADD").reason).toBeUndefined();
    expect(ungraded.state.active?.written?.score).toBeNull();
    const graded = submitReasonResult(state, learner, { text: "분모가 다르면 조각 크기가 달라서 통분해요", score: 2, feedback: "좋아요" }, now);
    expect(getState(graded.learner, "FRAC_DIFF_DEN_ADD").reason).toMatchObject({ asked: 1, correct: 1, lastCorrect: true });
    expect(graded.state.active?.done).toBe(true);
  });
});
