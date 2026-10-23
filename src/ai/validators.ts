/** Checks on AI output before a child ever sees it. */
import { numbersIn } from "@/domain/math/markup";
import { add, fromDecimalString, rat, type Rational } from "@/domain/math/rational";
import type { AnswerSpec } from "@/domain/items/types";

/** Small numbers and place values that may appear in any explanation. */
const ALWAYS_OK = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "100", "1000", "10000"]);

const BANNED = [
  /https?:|www\.|\.com|\.kr/i,
  /죽|피를|총으로|칼로|폭력|때리|바보|멍청|못생|뚱뚱/,
  /전화번호|주소를|학교 이름|이름이 뭐|어디 살/,
  /[a-z]{4,}/i, // stray English words (units like kg, cm are fine)
];

export function hasBannedContent(text: string): boolean {
  return BANNED.some((re) => re.test(text));
}

/** Every number in `text` must appear in the allowed texts (or be a small number). */
export function onlyKnownNumbers(text: string, allowedSources: string[]): boolean {
  const allowed = new Set(allowedSources.flatMap((s) => numbersIn(s)));
  return numbersIn(text).every((n) => ALWAYS_OK.has(n) || allowed.has(n));
}

/** Same numbers, same count, any order. */
export function sameNumbers(a: string, b: string): boolean {
  const na = numbersIn(a).sort();
  const nb = numbersIn(b).sort();
  return na.length === nb.length && na.every((x, i) => x === nb[i]);
}

/** Whether the hint gives away the answer (an answer number that is not already in the problem). */
export function revealsAnswer(hint: string, answerText: string, problem: string): boolean {
  const inProblem = new Set(numbersIn(problem));
  const answerNumbers = numbersIn(answerText).filter((n) => !inProblem.has(n) && !ALWAYS_OK.has(n));
  if (answerNumbers.length === 0) return false;
  const inHint = new Set(numbersIn(hint));
  return answerNumbers.every((n) => inHint.has(n));
}

function parseLooseNumber(text: string): Rational | null {
  const s = text.replace(/[,\s]+/g, " ").trim();
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixed) return Number(mixed[3]) === 0 ? null : add(rat(Number(mixed[1])), rat(Number(mixed[2]), Number(mixed[3])));
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (frac) return Number(frac[2]) === 0 ? null : rat(Number(frac[1]), Number(frac[2]));
  return fromDecimalString(s.replace(/\s/g, ""));
}

/** Compares an AI's free-form answer ("85", "1 1/2", "12 2", "몫 12, 나머지 2") with the item's answer. */
export function looseAnswerMatches(text: string, spec: AnswerSpec): boolean {
  const cleaned = text.replace(/[{}]/g, "").replace(/(L|kg|m|개|마리|명|장|송이|봉지|병|도막|일|cm)\b/g, "").trim();
  switch (spec.kind) {
    case "integer":
    case "decimal":
    case "fraction": {
      const v = parseLooseNumber(cleaned.replace(/[^\d./\s]/g, " ").trim());
      const expected = spec.kind === "integer" ? rat(spec.value) : spec.value;
      return v !== null && v.n === expected.n && v.d === expected.d;
    }
    case "quotient-remainder": {
      const nums = cleaned.match(/\d+/g)?.map(Number) ?? [];
      if (nums.length === 1) return spec.remainder === 0 && nums[0] === spec.quotient;
      return nums.length >= 2 && nums[0] === spec.quotient && nums[1] === spec.remainder;
    }
    case "units": {
      // "2시간 10분", "1 m 5 cm" or everything in the smallest unit ("130분").
      let total = 0;
      let found = false;
      for (const part of spec.parts) {
        const label = part.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // "m" must not be the start of "mm"/"mL", nor "시" the start of "시간".
        const m = new RegExp(`(\\d[\\d,]*)\\s*${label}(?![a-zA-Z])${part.label === "시" ? "(?!간)" : ""}`).exec(text.replace(/[{}]/g, ""));
        if (m) {
          total += Number(m[1].replace(/,/g, "")) * part.per;
          found = true;
        }
      }
      return found && total === spec.value;
    }
    default:
      return false;
  }
}
