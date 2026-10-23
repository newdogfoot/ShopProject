/**
 * Deterministic stand-in for Claude, used only when AI_FAKE=1 so end-to-end tests
 * can exercise the AI screens (written explanations, "why?", weekly summary)
 * without an API key. Never enable it in production.
 */
import type { StructuredCaller, StructuredRequest, StructuredResult } from "./types";

function childText(user: string): string {
  return /아이가 쓴 설명: """([\s\S]*?)"""/.exec(user)?.[1] ?? "";
}

function fakeOutput(req: StructuredRequest<unknown>): unknown {
  switch (req.feature) {
    case "explain":
      return {
        title: "차근차근 알아봐요",
        steps: [{ text: "먼저 문제를 천천히 읽어요." }, { text: "같은 자리끼리, 같은 크기끼리 생각해요." }],
        summary: "천천히 하면 할 수 있어요.",
      };
    case "hint":
      return { hint: "어느 부분에서 달라졌는지 다시 살펴볼까요?", errorType: "procedure" };
    case "why":
      return { text: "앞 단계에서 구한 값을 이어서 쓰기 때문이에요." };
    case "grade-explanation":
      return childText(req.user).replace(/\s/g, "").length >= 12
        ? { score: 2, met: [1], feedback: "핵심을 잘 짚었어요. 아래 설명과도 비교해 볼까요?", confidence: "high" }
        : { score: 1, met: [], feedback: "좋은 시작이에요. 조금 더 자세히 말해 볼까요?", confidence: "low" };
    case "weekly":
      return { summary: "이번 주에도 꾸준히 공부했어요. 새로 익힌 개념을 칭찬해 주세요." };
    default:
      // Word problems and their check: refuse, so the built-in story is used.
      return null;
  }
}

export function createFakeCaller(): StructuredCaller {
  return {
    model: "fake-model",
    async call<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      const out = fakeOutput(req as StructuredRequest<unknown>);
      const usage = { feature: req.feature, model: "fake-model", ok: out !== null, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
      if (out === null) return { data: null, usage, error: "refusal" };
      const parsed = req.schema.safeParse(out);
      return parsed.success ? { data: parsed.data, usage } : { data: null, usage: { ...usage, ok: false }, error: "invalid_output" };
    },
  };
}
