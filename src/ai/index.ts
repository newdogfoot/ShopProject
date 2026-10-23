/** Server-side wiring: real Claude caller + database store + a simple rate limit. */
import "server-only";
import { getDb } from "@/db/client";
import { bankPrompt, findBankedPrompt, getAiCache, recordAiUsage, setAiCache } from "@/db/queries";
import { createAnthropicCaller, DEFAULT_MODEL } from "./anthropic";
import { createFakeCaller } from "./fake";
import type { AiDeps, AiStore, StructuredCaller, StructuredRequest, StructuredResult } from "./types";

/** Test-only fake AI (AI_FAKE=1, end-to-end tests). Never set it in production. */
export function aiFake(): boolean {
  return process.env.AI_FAKE === "1";
}

export function aiEnabled(): boolean {
  return aiFake() || (process.env.AI_ENABLED !== "false" && Boolean(process.env.ANTHROPIC_API_KEY));
}

export function aiModel(): string {
  return process.env.CLAUDE_MODEL || DEFAULT_MODEL;
}

const globalForAi = globalThis as unknown as { __aiCaller?: StructuredCaller; __aiCalls?: Map<string, number[]> };

function caller(): StructuredCaller | null {
  if (!aiEnabled()) return null;
  globalForAi.__aiCaller ??= aiFake() ? createFakeCaller() : createAnthropicCaller({ apiKey: process.env.ANTHROPIC_API_KEY!, model: aiModel() });
  return globalForAi.__aiCaller;
}

/** At most 40 AI calls per child per 10 minutes; beyond that, templates are used. */
const WINDOW_MS = 10 * 60_000;
const MAX_CALLS = 40;

export function allowAiCall(studentId: string, now = Date.now()): boolean {
  const calls = (globalForAi.__aiCalls ??= new Map());
  const recent = (calls.get(studentId) ?? []).filter((t: number) => now - t < WINDOW_MS);
  if (recent.length >= MAX_CALLS) {
    calls.set(studentId, recent);
    return false;
  }
  recent.push(now);
  calls.set(studentId, recent);
  return true;
}

export async function getAiDeps(studentId: string): Promise<AiDeps> {
  const db = await getDb();
  const store: AiStore = {
    getCache: (key) => getAiCache(db, key),
    setCache: (key, kind, value, model) => setAiCache(db, key, kind, value, model),
    recordUsage: (u) => recordAiUsage(db, u),
    findBanked: (id) => findBankedPrompt(db, id),
    bank: (row) => bankPrompt(db, row),
  };
  const c = caller();
  return { caller: c ? limitedFor(c, studentId) : null, store };
}

/** Counts every real call against the child's limit; over the limit, features fall back to templates. */
function limitedFor(c: StructuredCaller, studentId: string): StructuredCaller {
  return {
    model: c.model,
    call<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      if (!allowAiCall(studentId)) return Promise.resolve({ data: null, usage: null, error: "rate_limited" });
      return c.call(req);
    },
  };
}
