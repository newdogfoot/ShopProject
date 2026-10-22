/**
 * Claude API caller: structured outputs (zod), explicit effort, server-side
 * fallback on refusals, prompt caching of the fixed system prompt, and typed
 * error handling. Never sends sampling parameters.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { StructuredCaller, StructuredRequest, StructuredResult } from "./types";

export const DEFAULT_MODEL = "claude-opus-5-5";

function errorName(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return "rate_limit";
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (err instanceof Anthropic.APIConnectionError) return "connection";
  if (err instanceof Anthropic.AuthenticationError) return "auth";
  if (err instanceof Anthropic.BadRequestError) return "bad_request";
  if (err instanceof Anthropic.APIError) return `api_${err.status ?? "error"}`;
  if (err instanceof Anthropic.AnthropicError) return "invalid_output";
  return "unknown";
}

export function createAnthropicCaller(opts: { apiKey: string; model?: string }): StructuredCaller {
  const model = opts.model || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 1 });
  return {
    model,
    async call<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
      try {
        const message = await client.beta.messages.parse(
          {
            model,
            max_tokens: req.maxTokens,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: req.user }],
            output_config: { effort: req.effort, format: betaZodOutputFormat(req.schema) },
          },
          { timeout: req.timeoutMs },
        );
        const u = message.usage;
        const usage = {
          feature: req.feature,
          model: message.model ?? model,
          ok: true,
          inputTokens: u.input_tokens ?? 0,
          outputTokens: u.output_tokens ?? 0,
          cacheReadTokens: u.cache_read_input_tokens ?? 0,
          cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
        };
        if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") {
          return { data: null, usage: { ...usage, ok: false }, error: message.stop_reason };
        }
        return { data: (message.parsed_output as T | null) ?? null, usage };
      } catch (err) {
        return { data: null, usage: null, error: errorName(err) };
      }
    },
  };
}
