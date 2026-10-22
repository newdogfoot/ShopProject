/**
 * Minimal math markup used in problem text, explanations and AI output:
 *   {3/4}    → fraction three quarters
 *   {1 3/4}  → mixed number one and three quarters
 * Everything else is plain text with the symbols + − × ÷ = □ ○ < >.
 */
import { readDecimalKo, readFractionKo, readNumberKo, withJosa } from "./korean";

export type MathSegment =
  | { type: "text"; text: string }
  | { type: "frac"; whole?: number; n: number; d: number };

const FRACTION_RE = /\{(?:(\d+)\s+)?(\d+)\/(\d+)\}/g;

export function parseMarkup(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(FRACTION_RE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ type: "text", text: text.slice(last, index) });
    out.push({
      type: "frac",
      whole: m[1] !== undefined ? Number(m[1]) : undefined,
      n: Number(m[2]),
      d: Number(m[3]),
    });
    last = index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

/** Plain text for logs and AI prompts: {1 3/4} → "1 3/4". */
export function markupToPlain(text: string): string {
  return text.replace(FRACTION_RE, (_m, w, n, d) => (w ? `${w} ${n}/${d}` : `${n}/${d}`));
}

/** Every number that appears in the text (fractions count as their parts), for AI output checks. */
export function numbersIn(text: string): string[] {
  const plain = markupToPlain(text).replace(/(\d),(\d{3})/g, "$1$2");
  return plain.match(/\d+(?:\.\d+)?/g) ?? [];
}

/** Text for the browser's speech synthesis: fractions and symbols read in Korean. */
export function markupToSpeech(text: string): string {
  let s = text;
  // "47 + 38 = □" → "47 더하기 38은 얼마일까요" needs the right particle before "=".
  s = s.replace(/(\{(?:\d+\s+)?\d+\/\d+\}|\d[\d,]*(?:\.\d+)?|\))\s*=\s*□/g, (_m, before: string) => {
    return `${withJosa(before, "은/는")} 얼마일까요`;
  });
  s = s.replace(/(\{(?:\d+\s+)?\d+\/\d+\}|\d[\d,]*(?:\.\d+)?|\))\s*=/g, (_m, before: string) => {
    return `${withJosa(before, "은/는")} `;
  });
  s = s.replace(FRACTION_RE, (_m, w, n, d) => readFractionKo(Number(n), Number(d), w ? Number(w) : undefined));
  s = s.replace(/(\d+)\.(\d+)/g, (m) => readDecimalKo(m));
  s = s
    .replace(/\+/g, " 더하기 ")
    .replace(/[−-]/g, " 빼기 ")
    .replace(/×/g, " 곱하기 ")
    .replace(/÷/g, " 나누기 ")
    .replace(/□/g, " 네모 ")
    .replace(/○/g, " 동그라미 ")
    .replace(/…/g, " 나머지 ");
  // Large numbers with commas are fine for TTS; read small integers as-is.
  return s.replace(/\s+/g, " ").trim();
}

/** Korean reading of an integer, re-exported for components. */
export { readNumberKo };
