/**
 * AI features with template fallback. Each function returns usable content
 * whether or not AI is available; AI output is only used after validation.
 */
import { createHash } from "node:crypto";
import { getSkill } from "@/domain/curriculum/skills";
import type { SkillId } from "@/domain/curriculum/skills";
import { gradeBandOf, type GradeBand } from "@/domain/curriculum/types";
import { templateExplanation, templateHint, type Explanation, type ExplanationInput } from "@/domain/content/explanations";
import { SKILL_CONTENT } from "@/domain/content/skill-content";
import { THEMES, type Theme } from "@/domain/content/stories";
import { getMisconception } from "@/domain/items/misconceptions";
import { answerText } from "@/domain/items/helpers";
import { markupToPlain } from "@/domain/math/markup";
import type { Item } from "@/domain/items/types";
import type { Grade } from "@/domain/curriculum/types";
import { BAND_LABEL, ExplanationSchema, HintSchema, PROMPT_VERSION, SolveSchema, STRATEGY_GUIDE, SYSTEM_PROMPT, WordProblemSchema } from "./prompts";
import type { AiDeps, StructuredRequest } from "./types";
import { hasBannedContent, looseAnswerMatches, onlyKnownNumbers, revealsAnswer, sameNumbers } from "./validators";

function cacheKey(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

async function run<T>(deps: AiDeps, req: StructuredRequest<T>): Promise<T | null> {
  if (!deps.caller) return null;
  const result = await deps.caller.call(req);
  if (result.usage) await deps.store.recordUsage({ ...result.usage, ok: result.data !== null }).catch(() => undefined);
  return result.data;
}

// ── Explanations ───────────────────────────────────────────

/** Explanations being written right now, so a warm-up and a child waiting for the same one share a call. */
const inflight = new Map<string, Promise<Explanation>>();

export async function getExplanation(deps: AiDeps, input: ExplanationInput): Promise<Explanation> {
  const template = templateExplanation(input);
  if (!deps.caller) return template;
  const key = cacheKey({ v: PROMPT_VERSION, f: "explain", m: deps.caller.model, s: input.skillId, st: input.strategy, mc: input.misconceptionId, b: input.gradeBand });
  const cached = await deps.store.getCache<Explanation>(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;
  const work = writeExplanation(deps, input, template, key).finally(() => inflight.delete(key));
  inflight.set(key, work);
  return work;
}

async function writeExplanation(deps: AiDeps, input: ExplanationInput, template: Explanation, key: string): Promise<Explanation> {
  if (!deps.caller) return template;

  const skill = getSkill(input.skillId);
  const content = SKILL_CONTENT[input.skillId as SkillId];
  const misconception = input.misconceptionId ? getMisconception(input.misconceptionId) : null;
  const exampleText = [input.example.prompt, ...input.example.steps].map(markupToPlain).join("\n");
  const user = [
    "[작업] 개념 설명 쓰기",
    `학년군: ${BAND_LABEL[input.gradeBand]}`,
    `개념: ${skill.name} — ${skill.goal}`,
    `핵심 아이디어: ${markupToPlain(content.keyIdea)}`,
    `설명 방식: ${STRATEGY_GUIDE[input.strategy]}`,
    misconception ? `아이의 오개념: ${misconception.name} — ${misconception.childExplain}` : "",
    `참고용 기본 설명:\n${template.steps.map((s) => `- ${markupToPlain(s.text)}`).join("\n")}`,
    `예시 문제와 풀이(코드로 계산한 값입니다. 숫자를 바꾸지 마세요):\n${exampleText}`,
    "요구 사항: title은 20자 이내, steps는 2~5개(각 80자 이내), summary는 30자 이내 한 줄 정리. 예시의 숫자만 쓰세요.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const out = await run(deps, { feature: "explain", system: SYSTEM_PROMPT, user, schema: ExplanationSchema, effort: "medium", maxTokens: 6000, timeoutMs: 20_000 });
  if (!out) return template;
  const allText = [out.title, out.summary, ...out.steps.map((s) => s.text)].join("\n");
  const sources = [exampleText, content.keyIdea, ...template.steps.map((s) => s.text), misconception?.childExplain ?? "", skill.goal];
  if (hasBannedContent(allText) || !onlyKnownNumbers(allText, sources)) return template;
  const explanation: Explanation = { title: out.title, steps: out.steps, summary: out.summary, source: "ai" };
  await deps.store.setCache(key, "explain", explanation, deps.caller.model).catch(() => undefined);
  return explanation;
}

// ── Hints ──────────────────────────────────────────────────

export interface HintInput {
  item: Item;
  level: number;
  /** The child's last wrong answer as shown on screen (markup). */
  studentAnswer: string | null;
  bugFeedback: string | null;
  grade: Grade;
}

export async function getHint(deps: AiDeps, input: HintInput): Promise<{ text: string; source: "template" | "ai" }> {
  const fallback = { text: templateHint(input.item, input.level, input.bugFeedback ?? undefined), source: "template" as const };
  // Known misconceptions and later levels are fully covered by code-made text.
  if (!deps.caller || input.bugFeedback || input.level !== 1 || !input.studentAnswer) return fallback;
  const correct = answerText(input.item.answer);
  const user = [
    "[작업] 힌트 쓰기 — 정답을 직접 말하지 마세요.",
    `학년군: ${BAND_LABEL[gradeBandOf(input.grade)]}`,
    `문제: ${markupToPlain(input.item.prompt)}`,
    input.item.instruction ? `조건: ${input.item.instruction}` : "",
    `정답(아이에게 말하지 마세요): ${markupToPlain(correct)}`,
    `학생 답: ${markupToPlain(input.studentAnswer)}`,
    `풀이 단계:\n${input.item.steps.map(markupToPlain).join("\n")}`,
    "요구 사항: 학생 답에서 어디가 어긋났을지 짐작하고, 다음에 무엇을 확인하면 좋을지 질문이나 방향으로 한두 문장(60자 이내) 쓰세요. errorType도 고르세요.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const out = await run(deps, { feature: "hint", system: SYSTEM_PROMPT, user, schema: HintSchema, effort: "low", maxTokens: 2000, timeoutMs: 8_000 });
  if (!out) return fallback;
  const sources = [input.item.prompt, ...input.item.steps.slice(0, 1), input.studentAnswer];
  if (hasBannedContent(out.hint) || revealsAnswer(out.hint, correct, input.item.prompt) || !onlyKnownNumbers(out.hint, sources)) return fallback;
  return { text: out.hint, source: "ai" };
}

// ── Word problems ─────────────────────────────────────────

/** A banked (already checked) AI story for this word problem, if there is one. Never calls the AI. */
export async function bankedWordProblem(deps: AiDeps, item: Item): Promise<Item | null> {
  if (item.format !== "word") return null;
  const banked = await deps.store.findBanked(item.id).catch(() => null);
  return banked ? { ...item, prompt: banked } : null;
}

/**
 * Writes, checks and banks an AI story for this word problem (or reuses a banked one).
 * Slow (two AI calls), so the app runs it in the background and shows the template meanwhile.
 */
export async function getWordProblem(deps: AiDeps, item: Item, theme: Theme, grade: Grade): Promise<{ item: Item; source: "template" | "ai" | "bank" }> {
  if (item.format !== "word") return { item, source: "template" };
  const banked = await deps.store.findBanked(item.id).catch(() => null);
  if (banked) return { item: { ...item, prompt: banked }, source: "bank" };
  if (!deps.caller) return { item, source: "template" };

  const band: GradeBand = gradeBandOf(grade);
  const themeName = THEMES.find((t) => t.id === theme)?.name ?? "간식";
  const user = [
    "[작업] 문장제 다시 쓰기",
    `학년군: ${BAND_LABEL[band]}`,
    `관심 주제: ${themeName}`,
    `기본 문장제: ${item.prompt}`,
    "요구 사항: 기본 문장제와 같은 수, 같은 단위, 같은 질문을 유지하면서 주제에 맞게 조금 더 재미있는 2~3문장으로 다시 쓰세요. 새 수를 추가하지 말고, 분수는 {3/4} 형식을 유지하고, 마지막 문장은 질문으로 끝내세요. 100자 안팎.",
  ].join("\n\n");
  const out = await run(deps, { feature: "word-problem", system: SYSTEM_PROMPT, user, schema: WordProblemSchema, effort: "low", maxTokens: 2000, timeoutMs: 15_000 });
  if (!out) return { item, source: "template" };
  const story = out.story.trim();
  if (hasBannedContent(story) || !sameNumbers(story, item.prompt) || !/[?？]$/.test(story)) return { item, source: "template" };

  // Independent check: a separate call solves the new story; it must reach the code's answer.
  const solved = await run(deps, {
    feature: "solve",
    system: SYSTEM_PROMPT,
    user: [
      "[작업] 검산용으로 문제 풀기",
      `문제: ${markupToPlain(story)}`,
      "답만 쓰세요. 자연수·소수는 숫자로, 분수는 3/4 또는 1 2/3처럼, 몫과 나머지는 '몫 나머지' 두 수로 쓰세요.",
    ].join("\n\n"),
    schema: SolveSchema,
    effort: "low",
    maxTokens: 3000,
    timeoutMs: 20_000,
  });
  if (!solved || !looseAnswerMatches(solved.answer, item.answer)) return { item, source: "template" };

  await deps.store
    .bank({ skillId: item.skillId, difficulty: item.difficulty, theme, sourceItemId: item.id, prompt: story, model: deps.caller.model })
    .catch(() => undefined);
  return { item: { ...item, prompt: story }, source: "ai" };
}
