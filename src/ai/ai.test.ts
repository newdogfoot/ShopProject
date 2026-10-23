import { describe, expect, it } from "vitest";
import { bankedWordProblem, explainStep, getExplanation, getHint, getWordProblem, gradeExplanation } from "./features";
import { isEmptyExplanation, scrubPersonalInfo } from "./privacy";
import { createFakeCaller } from "./fake";
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

  it("shares one AI call between a warm-up and a child asking at the same time", async () => {
    const caller = fakeCaller({
      explain: { title: "십 모형을 바꿔요", steps: [{ text: "일의 자리는 뺄 수 없어요." }, { text: "십 모형 1개를 일 모형 10개로 바꿔요." }], summary: "모자라면 10을 받아내려요." },
    });
    const { deps: d } = deps(caller);
    const both = await Promise.all([getExplanation(d, { ...input, strategy: "analogy" }), getExplanation(d, { ...input, strategy: "analogy" })]);
    expect(both[0]).toEqual(both[1]);
    expect(caller.calls).toEqual(["explain"]);
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

describe("banked word problems", () => {
  it("returns a banked story without calling the AI, or nothing", async () => {
    const caller = fakeCaller({});
    const { deps: d, mem } = deps(caller);
    const item = generateWordItem("AS_2D_CARRY_ADD", 3, 2, "space");
    expect(await bankedWordProblem(d, item)).toBeNull();
    mem.bank.set(item.id, "우주선이 별을 모았어요. 몇 개일까요?");
    expect((await bankedWordProblem(d, item))?.prompt).toBe("우주선이 별을 모았어요. 몇 개일까요?");
    expect(caller.calls).toEqual([]);
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
    const hourMin = { kind: "units" as const, parts: [{ label: "시간", per: 60 }, { label: "분", per: 1 }], value: 130 };
    expect(looseAnswerMatches("2시간 10분", hourMin)).toBe(true);
    expect(looseAnswerMatches("130분이에요", hourMin)).toBe(true);
    expect(looseAnswerMatches("2시간 20분", hourMin)).toBe(false);
    const mCm = { kind: "units" as const, parts: [{ label: "m", per: 100 }, { label: "cm", per: 1 }], value: 105 };
    expect(looseAnswerMatches("1 m 5 cm", mCm)).toBe(true);
    expect(looseAnswerMatches("105cm", mCm)).toBe(true);
    expect(looseAnswerMatches("1 m 15 mm", mCm)).toBe(false);
    const clock = { kind: "units" as const, parts: [{ label: "시", per: 60 }, { label: "분", per: 1 }], value: 205 };
    expect(looseAnswerMatches("3시 25분", clock)).toBe(true);
    expect(looseAnswerMatches("3시간 25분", clock)).toBe(false);
    expect(hasBannedContent("바보처럼")).toBe(true);
    expect(hasBannedContent("사탕을 나누어요")).toBe(false);
  });
});

describe("written explanations", () => {
  const input = {
    prompt: "{1/2}+{1/3}을 계산할 때 먼저 통분하는 까닭은 무엇일까요?",
    rubric: ["분모가 다르면 조각의 크기가 다름", "통분해서 같은 크기 조각으로 바꿈", "{3/6}+{2/6}={5/6}"],
    model: "{1/2}과 {1/3}은 조각의 크기가 달라요. 둘 다 분모 6으로 바꾸면 {3/6}과 {2/6}이 되고, 같은 크기 조각끼리 더해 {5/6}이에요.",
    text: "분모가 다르면 조각 크기가 달라서 6으로 똑같이 맞춰야 더할 수 있어요",
    grade: 5 as const,
  };

  it("grades with the AI and keeps only valid rubric numbers", async () => {
    // Item 3 is within the schema but beyond this question's two-item rubric, so it is dropped.
    const caller = fakeCaller({ "grade-explanation": { score: 2, met: [1, 2, 3], feedback: "조각의 크기를 맞춘 점이 좋아요. 6은 어떻게 찾았나요?", confidence: "high" } });
    const r = await gradeExplanation(deps(caller).deps, { ...input, rubric: input.rubric.slice(0, 2) });
    expect(r).toMatchObject({ score: 2, source: "ai", confidence: "high", met: [0, 1] });
    expect(caller.calls).toEqual(["grade-explanation"]);
  });

  it("answers 'I don't know' without calling the AI", async () => {
    const caller = fakeCaller({});
    const r = await gradeExplanation(deps(caller).deps, { ...input, text: "몰라요" });
    expect(r).toMatchObject({ score: 0, source: "rule" });
    expect(caller.calls).toEqual([]);
    expect(isEmptyExplanation("음..")).toBe(true);
    expect(isEmptyExplanation("분모가 달라서")).toBe(false);
  });

  it("waits for a guardian when AI is off, fails, or writes unsafe feedback", async () => {
    expect((await gradeExplanation(deps(null).deps, input)).score).toBeNull();
    expect((await gradeExplanation(deps(fakeCaller({ "grade-explanation": "refusal" })).deps, input)).source).toBe("pending");
    const link = fakeCaller({ "grade-explanation": { score: 2, met: [1], feedback: "www.example.com 을 보세요", confidence: "high" } });
    expect((await gradeExplanation(deps(link).deps, input)).source).toBe("pending");
    const madeUp = fakeCaller({ "grade-explanation": { score: 1, met: [1], feedback: "47을 생각해 볼까요?", confidence: "medium" } });
    expect((await gradeExplanation(deps(madeUp).deps, input)).source).toBe("pending");
  });

  it("removes personal details before anything is sent", () => {
    const r = scrubPersonalInfo("제 번호는 010-1234-5678 이고 kid@example.com 이에요. www.test.kr 분모가 달라요");
    expect(r.removed).toBe(true);
    expect(r.text).not.toMatch(/010|1234|example|test\.kr/);
    expect(r.text).toContain("분모가 달라요");
    expect(scrubPersonalInfo("0.3은 0.30과 같아서 더 커요").removed).toBe(false);
    expect(scrubPersonalInfo("가".repeat(300)).text.length).toBe(100);
  });
});

describe("why? on a solution step", () => {
  const item = generateItem("AS_2D_BORROW_SUB", 77, 2);

  it("uses a valid AI answer once and caches it", async () => {
    const caller = fakeCaller({ why: { text: "일의 자리에서 뺄 수 없어서 십의 자리에서 10을 받아내렸기 때문이에요." } });
    const { deps: d } = deps(caller);
    const first = await explainStep(d, { item, stepIndex: 0, grade: 2 });
    expect(first.source).toBe("ai");
    const again = await explainStep(d, { item, stepIndex: 0, grade: 2 });
    expect(again).toEqual(first);
    expect(caller.calls).toEqual(["why"]);
  });

  it("falls back to the key idea for made-up numbers, bad steps or no AI", async () => {
    const madeUp = fakeCaller({ why: { text: "9876을 생각해 봐요." } });
    expect((await explainStep(deps(madeUp).deps, { item, stepIndex: 0, grade: 2 })).source).toBe("template");
    expect((await explainStep(deps(fakeCaller({})).deps, { item, stepIndex: 99, grade: 2 })).source).toBe("template");
    expect((await explainStep(deps(null).deps, { item, stepIndex: 0, grade: 2 })).text).toContain("이 단계는");
  });

  it("returns the AI's guess of the error type with a hint", async () => {
    const h = await getHint(deps(fakeCaller({ hint: { hint: "십의 자리를 다시 볼까요?", errorType: "careless" } })).deps, {
      item,
      level: 1,
      studentAnswer: "1",
      bugFeedback: null,
      grade: 2,
    });
    expect(h.errorType).toBe("careless");
  });
});

describe("test-only fake AI", () => {
  it("passes every check it is used for", async () => {
    const caller = createFakeCaller();
    const { deps: d } = deps(caller);
    expect((await gradeExplanation(d, { prompt: "왜?", rubric: ["핵심"], model: "모범", text: "분모가 다르면 크기가 달라서 맞춰요", grade: 4 })).score).toBe(2);
    expect((await explainStep(d, { item: generateItem("MUL_FACTS", 5, 2), stepIndex: 0, grade: 2 })).source).toBe("ai");
    const e = await getExplanation(d, { skillId: "MUL_FACTS", strategy: "concrete", misconceptionId: null, example: generateItem("MUL_FACTS", 5, 2), gradeBand: "1-2" });
    expect(e.source).toBe("ai");
  });
});
