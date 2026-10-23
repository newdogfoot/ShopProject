import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "./client";
import {
  activeSession,
  attemptStats,
  createAuthSession,
  createGuardian,
  createSession,
  createStudent,
  deleteAuthSession,
  deleteStudent,
  diagnosesInProgress,
  diagnosisRecord,
  errorTypeStats,
  findGuardianByEmail,
  getStudent,
  guardianForToken,
  insertAttempt,
  insertExplanation,
  listConsents,
  listExplanations,
  listStudents,
  loadLearner,
  markDiagnosed,
  misconceptionExamples,
  REQUIRED_CONSENTS,
  saveLearner,
  saveSessionState,
  setExplanationVerdict,
  updateAttemptOutcome,
} from "./queries";
import { hashPassword, verifyPassword } from "@/auth/password";
import { emptySkillState, markMastered } from "@/domain/model/learner";

let db: Db;

beforeAll(async () => {
  db = await createPgliteDb("memory://");
}, 60_000);

describe("password hashing", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("수학탐험2026!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("수학탐험2026!", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("guardians, consents and sessions", () => {
  it("stores consents with the guardian and finds them by email", async () => {
    const g = await createGuardian(db, "Parent@Example.com", "hash", REQUIRED_CONSENTS);
    expect((await findGuardianByEmail(db, "parent@example.com"))?.id).toBe(g.id);
    const cs = await listConsents(db, g.id);
    expect(cs.map((c) => c.kind).sort()).toEqual([...REQUIRED_CONSENTS].sort());
    expect(cs.every((c) => c.version.length > 0)).toBe(true);
  });

  it("resolves login tokens until they expire or are deleted", async () => {
    const g = await createGuardian(db, "token@example.com", "hash", []);
    const now = new Date();
    const { token } = await createAuthSession(db, g.id, now);
    expect((await guardianForToken(db, token, now))?.id).toBe(g.id);
    expect(await guardianForToken(db, token, new Date(now.getTime() + 31 * 24 * 3600 * 1000))).toBeNull();
    await deleteAuthSession(db, token);
    expect(await guardianForToken(db, token, now)).toBeNull();
    expect(await guardianForToken(db, "not-a-token", now)).toBeNull();
  });
});

describe("students and learning data", () => {
  it("keeps each child under its own guardian", async () => {
    const a = await createGuardian(db, "a@example.com", "hash", []);
    const b = await createGuardian(db, "b@example.com", "hash", []);
    const child = await createStudent(db, a.id, { nickname: "별이", grade: 3, semester: 2, theme: "space", readAloud: false });
    expect((await listStudents(db, a.id)).map((s) => s.id)).toEqual([child.id]);
    expect(await getStudent(db, b.id, child.id)).toBeNull();
    expect(await deleteStudent(db, b.id, child.id)).toBe(false);
    expect(await getStudent(db, a.id, child.id)).not.toBeNull();
  });

  it("saves only changed skills and deletes everything with the child", async () => {
    const g = await createGuardian(db, "learner@example.com", "hash", []);
    const child = await createStudent(db, g.id, { nickname: "하루", grade: 4, semester: 1, theme: "animal", readAloud: true });
    const before = {};
    const after = { MUL_FACTS: markMastered(emptySkillState("MUL_FACTS"), Date.now()), DIV_FACTS: emptySkillState("DIV_FACTS") };
    await saveLearner(db, child.id, before, after);
    const loaded = await loadLearner(db, child.id);
    expect(Object.keys(loaded).sort()).toEqual(["DIV_FACTS", "MUL_FACTS"]);
    await saveLearner(db, child.id, loaded, { ...loaded, DIV_FACTS: { ...loaded.DIV_FACTS, p: 0.7 } });
    expect((await loadLearner(db, child.id)).DIV_FACTS.p).toBe(0.7);

    const session = await createSession(db, child.id, "learning", { step: 1 });
    expect((await activeSession(db, child.id, "learning"))?.id).toBe(session.id);
    await saveSessionState(db, session.id, { step: 2 }, true);
    expect(await activeSession(db, child.id, "learning")).toBeNull();

    await insertAttempt(db, {
      studentId: child.id,
      sessionId: session.id,
      skillId: "AS_2D_BORROW_SUB",
      itemId: "AS_2D_BORROW_SUB#2#1",
      purpose: "practice",
      prompt: "52 − 38 = □",
      answer: { kind: "integer", text: "26" },
      shown: "26",
      correct: false,
      misconceptionId: "SUB_SMALLER_FROM_LARGER",
      hintsUsed: 0,
      ms: 12_000,
    });
    const stats = await attemptStats(db, child.id, new Date(Date.now() - 3600_000));
    expect(stats).toEqual({ count: 1, correct: 0, ms: 12_000 });
    expect((await misconceptionExamples(db, child.id)).get("SUB_SMALLER_FROM_LARGER|AS_2D_BORROW_SUB")?.shown).toBe("26");

    expect(await deleteStudent(db, g.id, child.id)).toBe(true);
    expect(await loadLearner(db, child.id)).toEqual({});
    expect((await attemptStats(db, child.id, new Date(0))).count).toBe(0);
  });
});

describe("diagnoses by domain", () => {
  it("records each domain's first diagnosis and keeps diagnosis sessions apart", async () => {
    const g = await createGuardian(db, "domains@example.com", "hash", []);
    const child = await createStudent(db, g.id, { nickname: "모양", grade: 4, semester: 2, theme: "space", readAloud: false });
    expect(await diagnosisRecord(db, child.id)).toEqual({});
    const num = await createSession(db, child.id, "diagnosis", { a: 1 }, "NUM_OPS");
    const geo = await createSession(db, child.id, "diagnosis", { b: 1 }, "GEO_MEAS");
    expect((await activeSession(db, child.id, "diagnosis", "GEO_MEAS"))?.id).toBe(geo.id);
    expect((await activeSession(db, child.id, "diagnosis", "NUM_OPS"))?.id).toBe(num.id);
    expect((await diagnosesInProgress(db, child.id)).sort()).toEqual(["GEO_MEAS", "NUM_OPS"]);

    await saveSessionState(db, num.id, {}, true);
    await markDiagnosed(db, child.id, "NUM_OPS", new Date("2026-10-01T00:00:00Z"));
    // Diagnosing again only moves the date.
    await markDiagnosed(db, child.id, "NUM_OPS", new Date("2026-10-02T00:00:00Z"));
    const record = await diagnosisRecord(db, child.id);
    expect(Object.keys(record)).toEqual(["NUM_OPS"]);
    expect(record.NUM_OPS?.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(await diagnosesInProgress(db, child.id)).toEqual(["GEO_MEAS"]);

    expect(await deleteStudent(db, g.id, child.id)).toBe(true);
    expect(await diagnosisRecord(db, child.id)).toEqual({});
  });
});

describe("error causes and written explanations", () => {
  const attempt = (studentId: string, correct: boolean) => ({
    studentId,
    sessionId: null,
    skillId: "AS_2D_CARRY_ADD",
    itemId: "AS_2D_CARRY_ADD#2#1",
    purpose: "practice",
    prompt: "47 + 38 = □",
    answer: { kind: "integer", text: "75" },
    shown: "75",
    correct,
    misconceptionId: null,
    hintsUsed: 0,
    ms: 9000,
  });

  it("records how wrong answers ended and counts their causes", async () => {
    const g = await createGuardian(db, "causes@example.com", "hash", []);
    const other = await createGuardian(db, "other-causes@example.com", "hash", []);
    const child = await createStudent(db, g.id, { nickname: "도토리", grade: 2, semester: 2, theme: "animal", readAloud: true });
    const stranger = await createStudent(db, other.id, { nickname: "솔방울", grade: 2, semester: 2, theme: "animal", readAloud: true });
    const id = await insertAttempt(db, attempt(child.id, false));
    await insertAttempt(db, { ...attempt(child.id, false), errorType: "concept" });
    await insertAttempt(db, attempt(child.id, true));
    await updateAttemptOutcome(db, child.id, id, { errorType: "careless", solvedAfterRetry: true });
    // Another child's id does nothing.
    await updateAttemptOutcome(db, stranger.id, id, { errorType: "reading", solvedAfterRetry: false });
    const stats = await errorTypeStats(db, child.id, new Date(Date.now() - 3600_000));
    expect(stats).toEqual({ concept: 1, procedure: 0, careless: 1, reading: 0, unknown: 0 });
    expect(child.allowWriting).toBe(true);
  });

  it("keeps explanations 90 days and lets only the child's guardian check them", async () => {
    const g = await createGuardian(db, "writer@example.com", "hash", []);
    const other = await createGuardian(db, "not-writer@example.com", "hash", []);
    const child = await createStudent(db, g.id, { nickname: "연필", grade: 4, semester: 2, theme: "space", readAloud: false });
    const row = {
      studentId: child.id,
      skillId: "FRAC_DIFF_DEN_ADD",
      reasonId: "FRAC_DIFF_DEN_ADD.common-denominator",
      prompt: "왜 통분할까요?",
      text: "조각 크기가 달라서요",
      score: null,
      confidence: "low" as const,
      feedback: "확인 중",
    };
    const old = await insertExplanation(db, row, new Date(Date.now() - 100 * 24 * 3600 * 1000));
    const id = await insertExplanation(db, row);
    const list = await listExplanations(db, child.id);
    expect(list.map((e) => e.id)).toEqual([id]);
    expect(list.map((e) => e.id)).not.toContain(old);
    expect(await setExplanationVerdict(db, other.id, id, "ok")).toBeNull();
    expect((await setExplanationVerdict(db, g.id, id, "ok"))?.skillId).toBe("FRAC_DIFF_DEN_ADD");
    expect((await listExplanations(db, child.id))[0].guardianVerdict).toBe("ok");
  });
});
