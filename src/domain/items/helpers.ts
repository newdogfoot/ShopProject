/**
 * Shared helpers for item generators: answer builders, digit-wise algorithms
 * (correct and "buggy" versions that model misconceptions), and worked steps.
 */
import { formatRational, rat, toDecimalString, type Rational } from "../math/rational";
import { formatInt, withJosa } from "../math/korean";
import type { AnswerSpec, BugSpec, CompareSymbol, FractionForm } from "./types";

export const intAns = (value: number): AnswerSpec => ({ kind: "integer", value });
export const decAns = (value: Rational): AnswerSpec => ({ kind: "decimal", value });
export const fracAns = (value: Rational, form: FractionForm = "any"): AnswerSpec => ({ kind: "fraction", value, form });
export const cmpAns = (value: CompareSymbol): AnswerSpec => ({ kind: "compare", value });
export const qrAns = (quotient: number, remainder: number): AnswerSpec => ({ kind: "quotient-remainder", quotient, remainder });

export const SHORT_ANSWER_GUESS = 0.03;
export const SMALL_RANGE_GUESS = 0.1;
export const COMPARE_GUESS = 1 / 3;

export function compareSymbol(a: number, b: number): CompareSymbol {
  return a < b ? "<" : a > b ? ">" : "=";
}

export function flipSymbol(s: CompareSymbol): CompareSymbol {
  return s === "<" ? ">" : s === ">" ? "<" : "=";
}

/** Digits of a non-negative integer, least significant first. */
export function digitsOf(n: number): number[] {
  if (n === 0) return [0];
  const out: number[] = [];
  while (n > 0) {
    out.push(n % 10);
    n = Math.floor(n / 10);
  }
  return out;
}

function numberFromText(text: string): number | null {
  const trimmed = text.replace(/^0+(?=\d)/, "");
  if (trimmed.length > 15) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

/** Column addition that ignores every carry; the leftmost column writes its full sum. (47+38 → 75) */
export function addNoCarry(a: number, b: number): number | null {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const len = Math.max(da.length, db.length);
  let text = "";
  for (let i = len - 1; i >= 0; i--) {
    const s = (da[i] ?? 0) + (db[i] ?? 0);
    text += i === len - 1 ? String(s) : String(s % 10);
  }
  return numberFromText(text);
}

/** Column addition writing each column sum in full. (47+38 → 715) */
export function addWriteAll(a: number, b: number): number | null {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const len = Math.max(da.length, db.length);
  let text = "";
  for (let i = len - 1; i >= 0; i--) text += String((da[i] ?? 0) + (db[i] ?? 0));
  return numberFromText(text);
}

/** Subtracts the smaller digit from the larger in every column. (52−38 → 26) */
export function subSmallerFromLarger(a: number, b: number): number | null {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let text = "";
  for (let i = da.length - 1; i >= 0; i--) text += String(Math.abs(da[i] - (db[i] ?? 0)));
  return numberFromText(text);
}

/** Borrows 10 when needed but never decreases the next column. (52−38 → 24) */
export function subBorrowNoDecrement(a: number, b: number): number | null {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let text = "";
  for (let i = da.length - 1; i >= 0; i--) {
    const top = da[i];
    const bottom = db[i] ?? 0;
    text += String(top < bottom ? top + 10 - bottom : top - bottom);
  }
  return numberFromText(text);
}

/** Multiplies each digit by m without adding carries; leftmost writes its full product. (27×3 → 61) */
export function mulNoCarry(a: number, m: number): number | null {
  const da = digitsOf(a);
  let text = "";
  for (let i = da.length - 1; i >= 0; i--) {
    const p = da[i] * m;
    text += i === da.length - 1 ? String(p) : String(p % 10);
  }
  return numberFromText(text);
}

/** Adds the carry to the next digit before multiplying. (27×3 → 121) */
export function mulCarryWrongOrder(a: number, m: number): number | null {
  const da = digitsOf(a);
  let carry = 0;
  const written: string[] = [];
  for (let i = 0; i < da.length; i++) {
    const p = (da[i] + carry) * m;
    if (i === da.length - 1) written.unshift(String(p));
    else {
      written.unshift(String(p % 10));
      carry = Math.floor(p / 10);
    }
  }
  return numberFromText(written.join(""));
}

/** Product of two-digit numbers multiplying only digits in the same place. (23×14 → 212) */
export function mulOnlySamePlace(a: number, b: number): number | null {
  const da = digitsOf(a);
  const db = digitsOf(b);
  if (da.length !== db.length) return null;
  let text = "";
  for (let i = da.length - 1; i >= 0; i--) text += String(da[i] * db[i]);
  return numberFromText(text);
}

/** Adds a bug only when its wrong answer is valid and differs from the correct one. */
export function pushBug(
  bugs: BugSpec[],
  misconceptionId: string,
  wrong: AnswerSpec | null | undefined,
  correct: AnswerSpec,
  feedback: string,
): void {
  if (!wrong) return;
  if (sameValue(wrong, correct)) return;
  if (bugs.some((b) => b.answer && sameValue(b.answer, wrong))) return;
  bugs.push({ misconceptionId, answer: wrong, feedback });
}

export function sameValue(a: AnswerSpec, b: AnswerSpec): boolean {
  const va = numericValue(a);
  const vb = numericValue(b);
  if (va && vb) return va.n === vb.n && va.d === vb.d;
  if (a.kind === "compare" && b.kind === "compare") return a.value === b.value;
  if (a.kind === "quotient-remainder" && b.kind === "quotient-remainder") {
    return a.quotient === b.quotient && a.remainder === b.remainder;
  }
  if (a.kind === "integer-list" && b.kind === "integer-list") {
    const sa = [...new Set(a.values)].sort((x, y) => x - y);
    const sb = [...new Set(b.values)].sort((x, y) => x - y);
    return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
  }
  if (a.kind === "choice" && b.kind === "choice") return a.options[a.value] === b.options[b.value];
  return false;
}

export function numericValue(a: AnswerSpec): Rational | null {
  switch (a.kind) {
    case "integer":
      return rat(a.value);
    case "decimal":
    case "fraction":
      return a.value;
    default:
      return null;
  }
}

/** Child-facing text for an answer, in math markup. */
export function answerText(a: AnswerSpec): string {
  switch (a.kind) {
    case "integer":
      return formatInt(a.value);
    case "decimal":
      return toDecimalString(a.value) ?? formatRational(a.value);
    case "fraction":
      return formatRational(a.value, a.form === "improper" ? "fraction" : "mixed");
    case "quotient-remainder":
      return a.remainder === 0 ? `몫 ${a.quotient}` : `몫 ${a.quotient}, 나머지 ${a.remainder}`;
    case "compare":
      return a.value;
    case "integer-list":
      return [...a.values].sort((x, y) => x - y).join(", ");
    case "choice":
      return a.options[a.value];
    case "text":
      return a.model;
  }
}

const PLACE_NAMES = ["일의 자리", "십의 자리", "백의 자리", "천의 자리", "만의 자리", "십만의 자리"];

/** Column-by-column addition steps with carry notes. */
export function additionSteps(a: number, b: number, placeNames: string[] = PLACE_NAMES): string[] {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const len = Math.max(da.length, db.length);
  const steps: string[] = [];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    const x = da[i] ?? 0;
    const y = db[i] ?? 0;
    const s = x + y + carry;
    const carryText = carry ? ` + ${carry}(받아올림)` : "";
    const place = placeNames[i];
    if (s >= 10 && i < len - 1) {
      steps.push(`${place}: ${x} + ${y}${carryText} = ${s} → ${withJosa(s % 10, "을/를")} 쓰고 1을 받아올려요.`);
      carry = 1;
    } else {
      steps.push(`${place}: ${x} + ${y}${carryText} = ${s}`);
      carry = 0;
    }
  }
  return steps;
}

/** Column-by-column subtraction steps with borrow notes. */
export function subtractionSteps(a: number, b: number, placeNames: string[] = PLACE_NAMES): string[] {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const steps: string[] = [];
  const top = [...da];
  for (let i = 0; i < da.length; i++) {
    const y = db[i] ?? 0;
    const place = placeNames[i];
    if (top[i] < y) {
      // Borrow from the next non-zero column.
      let j = i + 1;
      while (top[j] === 0) j++;
      top[j] -= 1;
      for (let k = j - 1; k > i; k--) top[k] += 9;
      const before = top[i];
      top[i] += 10;
      const from = j === i + 1 ? placeNames[j] : `${placeNames[j]}(가운데 0은 9가 돼요)`;
      steps.push(`${place}: ${withJosa(before, "은/는")} ${y}보다 작아서 ${from}에서 10을 받아내려요. ${top[i]} − ${y} = ${top[i] - y}`);
    } else {
      steps.push(`${place}: ${top[i]} − ${y} = ${top[i] - y}`);
    }
  }
  return steps;
}

/** Long division steps: one line per digit brought down. */
export function longDivisionSteps(dividend: number, divisor: number): string[] {
  const digits = String(dividend).split("").map(Number);
  const steps: string[] = [];
  let current = 0;
  let started = false;
  const quotientDigits: number[] = [];
  for (let i = 0; i < digits.length; i++) {
    current = current * 10 + digits[i];
    const q = Math.floor(current / divisor);
    if (!started && q === 0 && i < digits.length - 1) continue;
    started = true;
    quotientDigits.push(q);
    const rest = current - q * divisor;
    if (q === 0) {
      steps.push(`${withJosa(current, "은/는")} ${divisor}로 나눌 수 없어서 몫의 이 자리에 0을 써요.`);
    } else {
      steps.push(`${current} ÷ ${divisor} → 몫 ${q}, ${divisor} × ${q} = ${q * divisor}, 남는 수 ${rest}`);
    }
    current = rest;
  }
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  steps.push(
    remainder === 0
      ? `확인: ${divisor} × ${quotient} = ${dividend}`
      : `확인: ${divisor} × ${quotient} + ${remainder} = ${dividend}`,
  );
  return steps;
}

export function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

/** Plain decimal text with a fixed number of places: (346, 2) → "3.46". */
export function decText(value: Rational): string {
  const s = toDecimalString(value);
  if (s === null) throw new Error("non-terminating decimal");
  return s;
}

/** Integer digits of a terminating decimal at a given number of places: (1.2, 2) → 120. */
export function scaled(value: Rational, places: number): number {
  return (value.n * 10 ** places) / value.d;
}
