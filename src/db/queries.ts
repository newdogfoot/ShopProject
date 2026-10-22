/**
 * Data access. Every function takes the database as its first argument so the
 * same code runs against PGlite in tests and PostgreSQL in production.
 * Functions that touch a child's data always check the guardian owns it.
 */
import { and, desc, eq, gt, gte, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./client";
import { aiCache, aiUsage, attempts, authSessions, consents, guardians, itemBank, learningSessions, skillStates, students } from "./schema";
import type { LearnerState, SkillState } from "@/domain/model/learner";
import type { Grade, Semester } from "@/domain/curriculum/types";
import type { Theme } from "@/domain/content/stories";

export const CONSENT_VERSION = "2026-10-v1";
export const REQUIRED_CONSENTS = ["privacy-collection", "guardian-consent-under-14"] as const;
export const SESSION_DAYS = 30;

// ── Guardians & login sessions ──────────────────────────────

export async function findGuardianByEmail(db: Db, email: string) {
  const rows = await db.select().from(guardians).where(eq(guardians.email, email.toLowerCase())).limit(1);
  return rows.at(0) ?? null;
}

export async function createGuardian(db: Db, email: string, passwordHash: string, consentKinds: readonly string[]) {
  return db.transaction(async (tx) => {
    const [g] = await tx.insert(guardians).values({ email: email.toLowerCase(), passwordHash }).returning();
    if (consentKinds.length > 0) {
      await tx.insert(consents).values(consentKinds.map((kind) => ({ guardianId: g.id, kind, version: CONSENT_VERSION })));
    }
    return g;
  });
}

export async function listConsents(db: Db, guardianId: string) {
  return db.select().from(consents).where(eq(consents.guardianId, guardianId)).orderBy(consents.agreedAt);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthSession(db: Db, guardianId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(authSessions).values({ tokenHash: hashToken(token), guardianId, expiresAt });
  return { token, expiresAt };
}

export async function guardianForToken(db: Db, token: string, now = new Date()) {
  const rows = await db
    .select({ id: guardians.id, email: guardians.email })
    .from(authSessions)
    .innerJoin(guardians, eq(guardians.id, authSessions.guardianId))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, now)))
    .limit(1);
  return rows.at(0) ?? null;
}

export async function deleteAuthSession(db: Db, token: string) {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
}

// ── Students ────────────────────────────────────────────────

export interface StudentInput {
  nickname: string;
  grade: Grade;
  semester: Semester;
  theme: Theme;
  readAloud: boolean;
}

export async function listStudents(db: Db, guardianId: string) {
  return db.select().from(students).where(eq(students.guardianId, guardianId)).orderBy(students.createdAt);
}

export async function createStudent(db: Db, guardianId: string, input: StudentInput) {
  const [s] = await db.insert(students).values({ guardianId, ...input }).returning();
  return s;
}

export async function getStudent(db: Db, guardianId: string, studentId: string) {
  const rows = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.guardianId, guardianId)))
    .limit(1);
  return rows.at(0) ?? null;
}

export async function updateStudent(db: Db, guardianId: string, studentId: string, input: Partial<StudentInput>) {
  const [s] = await db
    .update(students)
    .set(input)
    .where(and(eq(students.id, studentId), eq(students.guardianId, guardianId)))
    .returning();
  return s ?? null;
}

export async function markDiagnosed(db: Db, studentId: string, at = new Date()) {
  await db.update(students).set({ diagnosedAt: at }).where(eq(students.id, studentId));
}

/** Deletes a child and everything recorded about them (cascades). */
export async function deleteStudent(db: Db, guardianId: string, studentId: string) {
  const rows = await db
    .delete(students)
    .where(and(eq(students.id, studentId), eq(students.guardianId, guardianId)))
    .returning({ id: students.id });
  return rows.length > 0;
}

// ── Learner model ───────────────────────────────────────────

export async function loadLearner(db: Db, studentId: string): Promise<LearnerState> {
  const rows = await db.select().from(skillStates).where(eq(skillStates.studentId, studentId));
  const learner: LearnerState = {};
  for (const r of rows) learner[r.skillId] = r.state;
  return learner;
}

/** Saves the skills that changed between two learner snapshots. */
export async function saveLearner(db: Db, studentId: string, before: LearnerState, after: LearnerState) {
  const changed: SkillState[] = [];
  for (const [id, state] of Object.entries(after)) {
    if (JSON.stringify(before[id]) !== JSON.stringify(state)) changed.push(state);
  }
  if (changed.length === 0) return;
  await db
    .insert(skillStates)
    .values(changed.map((state) => ({ studentId, skillId: state.skillId, state, updatedAt: new Date() })))
    .onConflictDoUpdate({
      target: [skillStates.studentId, skillStates.skillId],
      set: { state: sql`excluded.state`, updatedAt: sql`excluded.updated_at` },
    });
}

// ── Sessions & attempts ─────────────────────────────────────

export async function activeSession(db: Db, studentId: string, kind: "diagnosis" | "learning") {
  const rows = await db
    .select()
    .from(learningSessions)
    .where(and(eq(learningSessions.studentId, studentId), eq(learningSessions.kind, kind), eq(learningSessions.status, "active")))
    .orderBy(desc(learningSessions.startedAt))
    .limit(1);
  return rows.at(0) ?? null;
}

export async function createSession(db: Db, studentId: string, kind: "diagnosis" | "learning", state: unknown) {
  const [row] = await db.insert(learningSessions).values({ studentId, kind, state }).returning();
  return row;
}

export async function saveSessionState(db: Db, sessionId: string, state: unknown, finished = false) {
  await db
    .update(learningSessions)
    .set({ state, ...(finished ? { status: "finished" as const, endedAt: new Date() } : {}) })
    .where(eq(learningSessions.id, sessionId));
}

export interface AttemptInput {
  studentId: string;
  sessionId: string | null;
  skillId: string;
  itemId: string;
  purpose: string;
  prompt: string;
  answer: unknown;
  shown: string;
  correct: boolean;
  misconceptionId: string | null;
  hintsUsed: number;
  ms: number;
}

export async function insertAttempt(db: Db, a: AttemptInput) {
  await db.insert(attempts).values(a);
}

export async function recentAttempts(db: Db, studentId: string, limit = 50) {
  return db.select().from(attempts).where(eq(attempts.studentId, studentId)).orderBy(desc(attempts.createdAt)).limit(limit);
}

export async function attemptStats(db: Db, studentId: string, since: Date) {
  const rows = await db
    .select({
      count: sql<number>`count(*)::int`,
      correct: sql<number>`coalesce(sum(case when ${attempts.correct} then 1 else 0 end), 0)::int`,
      ms: sql<number>`coalesce(sum(least(${attempts.ms}, 300000)), 0)::int`,
    })
    .from(attempts)
    .where(and(eq(attempts.studentId, studentId), gte(attempts.createdAt, since)));
  return rows[0] ?? { count: 0, correct: 0, ms: 0 };
}

/** Most recent wrong answer for each misconception and skill, keyed "misconceptionId|skillId" (examples for guardians). */
export async function misconceptionExamples(db: Db, studentId: string) {
  const rows = await db
    .select({ misconceptionId: attempts.misconceptionId, skillId: attempts.skillId, prompt: attempts.prompt, shown: attempts.shown, createdAt: attempts.createdAt })
    .from(attempts)
    .where(and(eq(attempts.studentId, studentId), sql`${attempts.misconceptionId} is not null`))
    .orderBy(desc(attempts.createdAt))
    .limit(100);
  const byId = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const key = `${r.misconceptionId}|${r.skillId}`;
    if (r.misconceptionId && !byId.has(key)) byId.set(key, r);
  }
  return byId;
}

// ── AI cache, usage and word-problem bank ───────────────────

export async function getAiCache<T>(db: Db, key: string): Promise<T | null> {
  const rows = await db.select().from(aiCache).where(eq(aiCache.key, key)).limit(1);
  return (rows[0]?.value as T) ?? null;
}

export async function setAiCache(db: Db, key: string, kind: string, value: unknown, model: string) {
  await db.insert(aiCache).values({ key, kind, value, model }).onConflictDoNothing();
}

export async function recordAiUsage(
  db: Db,
  u: { feature: string; model: string; ok: boolean; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number },
) {
  await db.insert(aiUsage).values(u);
}

export async function findBankedPrompt(db: Db, sourceItemId: string) {
  const rows = await db.select().from(itemBank).where(eq(itemBank.sourceItemId, sourceItemId)).limit(1);
  return rows[0]?.prompt ?? null;
}

export async function bankPrompt(db: Db, row: { skillId: string; difficulty: number; theme: string; sourceItemId: string; prompt: string; model: string }) {
  await db.insert(itemBank).values(row).onConflictDoNothing();
}
