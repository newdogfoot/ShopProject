import type { z } from "zod";

export type AiFeature = "explain" | "hint" | "word-problem" | "solve" | "grade-explanation" | "why" | "weekly";

export interface AiUsage {
  feature: AiFeature;
  model: string;
  ok: boolean;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface StructuredRequest<T> {
  feature: AiFeature;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: "low" | "medium";
  maxTokens: number;
  timeoutMs: number;
}

export interface StructuredResult<T> {
  data: T | null;
  usage: AiUsage | null;
  /** Why there is no data: "refusal", "max_tokens", an API error name, … */
  error?: string;
}

/** Anything that can answer a structured request (the Claude API, or a fake in tests). */
export interface StructuredCaller {
  readonly model: string;
  call<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

/** Persistence the AI features need (backed by the database in the app). */
export interface AiStore {
  getCache<T>(key: string): Promise<T | null>;
  setCache(key: string, kind: string, value: unknown, model: string): Promise<void>;
  recordUsage(u: AiUsage): Promise<void>;
  findBanked(sourceItemId: string): Promise<string | null>;
  bank(row: { skillId: string; difficulty: number; theme: string; sourceItemId: string; prompt: string; model: string }): Promise<void>;
}

export interface AiDeps {
  /** null when AI is off (no API key, AI_ENABLED=false, or rate limited). */
  caller: StructuredCaller | null;
  store: AiStore;
}
