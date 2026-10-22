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
  findGuardianByEmail,
  getStudent,
  guardianForToken,
  insertAttempt,
  listConsents,
  listStudents,
  loadLearner,
  misconceptionExamples,
  REQUIRED_CONSENTS,
  saveLearner,
  saveSessionState,
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
    expect((await misconceptionExamples(db, child.id)).get("SUB_SMALLER_FROM_LARGER")?.shown).toBe("26");

    expect(await deleteStudent(db, g.id, child.id)).toBe(true);
    expect(await loadLearner(db, child.id)).toEqual({});
    expect((await attemptStats(db, child.id, new Date(0))).count).toBe(0);
  });
});
