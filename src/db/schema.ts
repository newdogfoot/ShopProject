/**
 * Database schema (PostgreSQL; PGlite locally). Only guardians have login
 * credentials. Children are profiles under a guardian with a nickname, grade,
 * semester and interest theme — no real names, birthdays or schools.
 */
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { SkillState } from "@/domain/model/learner";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const guardians = pgTable("guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    guardianId: uuid("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("auth_sessions_guardian_idx").on(t.guardianId)],
);

/** Consent records: what was agreed to, which version, and when. */
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guardianId: uuid("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    version: text("version").notNull(),
    agreedAt: timestamp("agreed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("consents_guardian_idx").on(t.guardianId)],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guardianId: uuid("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    grade: integer("grade").notNull(),
    semester: integer("semester").notNull(),
    theme: text("theme").notNull().default("snack"),
    readAloud: boolean("read_aloud").notNull().default(false),
    diagnosedAt: timestamp("diagnosed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("students_guardian_idx").on(t.guardianId)],
);

/** Learner model: one row per (student, skill). */
export const skillStates = pgTable(
  "skill_states",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    state: jsonb("state").$type<SkillState>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.skillId] })],
);

/** Diagnosis and learning sessions; `state` is the engine's JSON state (resumable). */
export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"diagnosis" | "learning">().notNull(),
    status: text("status").$type<"active" | "finished">().notNull().default("active"),
    state: jsonb("state").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("learning_sessions_student_idx").on(t.studentId, t.kind, t.status)],
);

/** Every answered item (first attempt), for reports and later calibration. */
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => learningSessions.id, { onDelete: "set null" }),
    skillId: text("skill_id").notNull(),
    itemId: text("item_id").notNull(),
    purpose: text("purpose").notNull(),
    prompt: text("prompt").notNull(),
    answer: jsonb("answer").notNull(),
    shown: text("shown").notNull(),
    correct: boolean("correct").notNull(),
    misconceptionId: text("misconception_id"),
    hintsUsed: integer("hints_used").notNull().default(0),
    ms: integer("ms").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("attempts_student_idx").on(t.studentId, t.createdAt)],
);

/** Word problems written by AI that passed validation, reused across students. */
export const itemBank = pgTable(
  "item_bank",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillId: text("skill_id").notNull(),
    difficulty: integer("difficulty").notNull(),
    theme: text("theme").notNull(),
    sourceItemId: text("source_item_id").notNull().unique(),
    prompt: text("prompt").notNull(),
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("item_bank_lookup_idx").on(t.skillId, t.difficulty, t.theme)],
);

/** Cached AI output (explanations), keyed by a hash of the inputs and prompt version. */
export const aiCache = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  kind: text("kind").notNull(),
  value: jsonb("value").notNull(),
  model: text("model").notNull(),
  createdAt: createdAt(),
});

/** Token usage per AI call, for cost tracking. */
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  feature: text("feature").notNull(),
  model: text("model").notNull(),
  ok: boolean("ok").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
  createdAt: createdAt(),
});
