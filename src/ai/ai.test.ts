import { describe, expect, it } from "vitest";
import { getExplanation, getHint, getWordProblem } from "./features";
import { looseAnswerMatches, onlyKnownNumbers, revealsAnswer, sameNumbers, hasBannedContent } from "./validators";
import type { AiDeps, AiStore, AiUsage, StructuredCaller, StructuredRequest, StructuredResult } from "./types";
import { generateItem, generateWordItem } from "@/domain/items";
import { rat } from "@/domain/math/rational";

/** In-memory store that records what was cached, banked and logged. */
function memoryStore() {
  const cache = new Map<string, unknown>();
  const bank = new Map<string, string>();
  const usage: AiUsage[] = [];
  const store: AiStore = {
    getCache: async <T,>(k: string) => (cache.get(k) as T) ?? null,
    setCache: async (k, _kind, v) => void cache.set(k, v),
    recordUsage: async (u) => void usage.push(u),
    findBanked: async (id) => bank.get(id) ?? null,
    bank: async (row) => void bank.set(row.sourceItemId, row.prompt),
  };
  return { store, cache, bank, usage };
}

/** Fake Claude: answers by feature with canned outputs (or a refusal). */
function fakeCaller(outputs: Partial<Record<string, unknown | "refusal">>): StructuredCaller & { calls: string[] } {
  const calls: string[] = [];
  return {
    model: "fake-model",
    calls,
    async call<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      calls.push(req.feature);
      expect(req.system.length).toBeGreaterThan(500); // fixed system prompt is sent every time
      const out = outputs[req.feature];
      const usage = { feature: req.feature, model: "fake-model", ok: true, inputTokens: 100, outputTokens: 50, cacheReadTokens: 90, cacheWriteTokens: 0 };
      if (out === undefined || out === "refusal") return { data: null, usage: { ...usage, ok: false }, error: "refusal" };
      const parsed = req.schema.safeParse(out);
      return parsed.success ? { data: parsed.data, usage } : { data: null, usage: { ...usage, ok: false }, error: "invalid_output" };
    },
  };
}

function deps(caller: StructuredCaller | null) {
  const mem = memoryStore();
  return { deps: { caller, store: mem.store } satisfies AiDeps, mem };
}

const example = generateItem("AS_2D_BORROW_SUB", 101, 2);

describe("AI explanations", () => {
  const input = { skillId: "AS_2D_BORROW_SUB", strategy: "concrete" as const, misconceptionId: null, example, gradeBand: "1-2" as const };

  it("uses the template when AI is off", async () => {
    const { deps: d } = deps(null);
    const e = await getExplanation(d, input);
    expect(e.source).toBe("template");
    expect(e.steps.length).toBeGreaterThan(1);
  });

  it("uses valid AI output and caches it", async () => {
    const caller = fakeCaller({
      explain: {
        title: "십 모형을 바꿔요",
        steps: [{ text: `${example.prompt}에서 일의 자리는 뺄 수 없어요.` }, { text: "십 모형 1개를 일 모형 10개로 바꿔요.", visual: { type: "base-ten", hundreds: 0, tens: 1, ones: 10 } }],
        summary: "모자라면 10을 받아내려요.",
      },
    });
    const { deps: d, mem } = deps(caller);
    const first = await getExplanation(d, input);
    expect(first.source).toBe("ai");
    expect(mem.usage).toHaveLength(1);
    const second = await getExplanation(d, input);
    expect(second).toEqual(first);
    expect(caller.calls).toEqual(["explain"]); // second time came from the cache
  });

  it("rejects explanations with made-up numbers or unsafe text", async () => {
    const bad = fakeCaller({ explain: { title: "설명", steps: [{ text: "4721을 생각해 봐요." }, { text: "끝" }], summary: "정리" } });
    expect((await getExplanation(deps(bad).deps, input)).source).toBe("template");
    const unsafe = fakeCaller({ explain: { title: "설명", steps: [{ text: "www.example.com 에서 보세요" }, { text: "끝" }], summary: "정리" } });
    expect((await getExplanation(deps(unsafe).deps, input)).source).toBe("template");
  });

  it("falls back on refusal or schema errors", async () => {
    expect((await getExplanation(deps(fakeCaller({ explain: "refusal" })).deps, input)).source).toBe("template");
    expect((await getExplanation(deps(fakeCaller({ explain: { title: "x" } })).deps, input)).source).toBe("template");
  });
});

describe("AI hints", () => {
  const item = generateItem("AS_2D_CARRY_ADD", 5, 2);

  it("uses code-made feedback for known misconceptions without calling AI", async () => {
    const caller = fakeCaller({ hint: { hint: "다시 해 봐요", errorType: "procedure" } });
    const r = await getHint(deps(caller).deps, { item, level: 1, studentAnswer: "1", bugFeedback: "받아올림을 확인해요", grade: 2 });
    expect(r).toEqual({ text: "받아올림을 확인해요", source: "template" });
    expect(caller.calls).toEqual([]);
  });

  it("never gives the answer away", async () => {
    const answer = item.answer.kind === "integer" ? item.answer.value : 0;
    const leaky = fakeCaller({ hint: { hint: `답은 ${answer}이에요.`, errorType: "procedure" } });
    const r = await getHint(deps(leaky).deps, { item, level: 1, studentAnswer: "3", bugFeedback: null, grade: 2 });
    expect(r.source).toBe("template");

    const good = fakeCaller({ hint: { hint: "일의 자리끼리 더한 값을 다시 확인해 볼까요?", errorType: "careless" } });
    const ok = await getHint(deps(good).deps, { item, level: 1, studentAnswer: "3", bugFeedback: null, grade: 2 });
    expect(ok.source).toBe("ai");
  });
});

describe("AI word problems", () => {
  const word = generateWordItem("AS_2D_CARRY_ADD", 9, 2, "animal");
  const correct = word.answer.kind === "integer" ? String(word.answer.value) : "";

  it("keeps the template when the numbers change", async () => {
    const caller = fakeCaller({ "word-problem": { story: "다람쥐가 도토리 999개를 모았어요. 모두 몇 개일까요?" }, solve: { answer: correct } });
    const r = await getWordProblem(deps(caller).deps, word, "animal", 2);
    expect(r.source).toBe("template");
    expect(r.item.prompt).toBe(word.prompt);
  });

  it("accepts a story only when an independent solve agrees, then banks it", async () => {
    const story = `${word.prompt.replace(/\?$/, "")}? `.trim();
    const wrong = fakeCaller({ "word-problem": { story }, solve: { answer: "1" } });
    expect((await getWordProblem(deps(wrong).deps, word, "animal", 2)).source).toBe("template");

    const right = fakeCaller({ "word-problem": { story }, solve: { answer: `${correct}개` } });
    const { deps: d, mem } = deps(right);
    const r = await getWordProblem(d, word, "animal", 2);
    expect(r.source).toBe("ai");
    expect(mem.bank.get(word.id)).toBe(story);
    const again = await getWordProblem(d, word, "animal", 2);
    expect(again.source).toBe("bank");
    expect(right.calls).toEqual(["word-problem", "solve"]);
  });
});

describe("validators", () => {
  it("checks numbers, answers and banned content", () => {
    expect(onlyKnownNumbers("52에서 38을 빼요", ["52 − 38 = □"])).toBe(true);
    expect(onlyKnownNumbers("52에서 4721을 빼요", ["52 − 38 = □"])).toBe(false);
    expect(sameNumbers("사탕 {3/4}kg과 2kg", "2kg과 {3/4}kg")).toBe(true);
    expect(sameNumbers("사탕 3개", "사탕 4개")).toBe(false);
    expect(revealsAnswer("정답은 85예요", "85", "47 + 38 = □")).toBe(true);
    expect(revealsAnswer("일의 자리를 더해 봐요", "85", "47 + 38 = □")).toBe(false);
    expect(looseAnswerMatches("1 1/2", { kind: "fraction", value: rat(3, 2), form: "reduced" })).toBe(true);
    expect(looseAnswerMatches("몫 12, 나머지 2", { kind: "quotient-remainder", quotient: 12, remainder: 2 })).toBe(true);
    expect(looseAnswerMatches("2.5 L", { kind: "decimal", value: rat(5, 2) })).toBe(true);
    expect(hasBannedContent("바보처럼")).toBe(true);
    expect(hasBannedContent("사탕을 나누어요")).toBe(false);
  });
});
