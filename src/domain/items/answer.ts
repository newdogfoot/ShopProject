/**
 * Grading. Answers are compared as exact values; a value that is right but
 * written in the wrong form (for example not reduced when the problem asks for
 * lowest terms) gets status "form" so the child can fix it without it counting
 * as a mistake.
 */
import { add, eq, fromDecimalString, gcd, rat, toDecimalString, type Rational } from "../math/rational";
import { answerText, factorsOf } from "./helpers";
import type { AnswerSpec, BugRule, BugSpec, FractionForm, Item, StudentAnswer } from "./types";

export type GradeStatus = "correct" | "form" | "wrong" | "invalid";

export interface GradeResult {
  status: GradeStatus;
  /** Message for a "form" result. */
  formMessage?: string;
  /** Misconception matched by a wrong answer. */
  bug?: BugSpec;
  /** The child's answer as math markup, for display. */
  shown: string;
}

const FULLWIDTH = /[０-９]/g;

function clean(text: string): string {
  return text
    .replace(FULLWIDTH, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s,]/g, "")
    .trim();
}

function parseNatural(text: string): number | null {
  const s = clean(text);
  if (!/^\d{1,15}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

interface ParsedFraction {
  whole: number;
  num: number;
  den: number;
  value: Rational;
}

function parseFraction(input: { whole: string; num: string; den: string }): ParsedFraction | null {
  const wholeText = clean(input.whole);
  const numText = clean(input.num);
  const denText = clean(input.den);
  const whole = wholeText === "" ? 0 : parseNatural(wholeText);
  if (whole === null) return null;
  if (numText === "" && denText === "") {
    if (wholeText === "") return null;
    return { whole, num: 0, den: 1, value: rat(whole) };
  }
  const num = parseNatural(numText);
  const den = parseNatural(denText);
  if (num === null || den === null || den === 0) return null;
  return { whole, num, den, value: add(rat(whole), rat(num, den)) };
}

function parseIntegerList(text: string): number[] | null {
  const parts = text
    .replace(FULLWIDTH, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .split(/[\s,，、]+/)
    .filter(Boolean);
  if (parts.length === 0) return null;
  const out: number[] = [];
  for (const p of parts) {
    const n = parseNatural(p);
    if (n === null) return null;
    out.push(n);
  }
  return out;
}

/** Numeric value of a student's answer, when it has one. */
export function studentValue(input: StudentAnswer): Rational | null {
  switch (input.kind) {
    case "integer": {
      const n = parseNatural(input.text);
      return n === null ? null : rat(n);
    }
    case "decimal":
      return fromDecimalString(clean(input.text));
    case "fraction":
      return parseFraction(input)?.value ?? null;
    default:
      return null;
  }
}

function shownFraction(f: ParsedFraction): string {
  if (f.num === 0) return String(f.whole);
  return f.whole ? `{${f.whole} ${f.num}/${f.den}}` : `{${f.num}/${f.den}}`;
}

function valueOf(spec: AnswerSpec): Rational | null {
  switch (spec.kind) {
    case "integer":
      return rat(spec.value);
    case "decimal":
    case "fraction":
      return spec.value;
    default:
      return null;
  }
}

function matchesRule(rule: BugRule, input: StudentAnswer): boolean {
  switch (rule.type) {
    case "remainder-too-big": {
      if (input.kind !== "quotient-remainder") return false;
      const q = parseNatural(input.quotient);
      const r = parseNatural(input.remainder === "" ? "0" : input.remainder);
      if (q === null || r === null) return false;
      return r >= rule.divisor && q * rule.divisor + r === rule.dividend;
    }
    case "listed-multiples": {
      if (input.kind !== "integer-list") return false;
      const values = parseIntegerList(input.text);
      if (!values) return false;
      return values.every((v) => v % rule.n === 0) && values.some((v) => v > rule.n);
    }
    case "factors-missing-trivial": {
      if (input.kind !== "integer-list") return false;
      const values = parseIntegerList(input.text);
      if (!values) return false;
      const set = new Set(values);
      const factors = factorsOf(rule.n);
      const missing = factors.filter((f) => !set.has(f));
      const extra = [...set].filter((v) => !factors.includes(v));
      return extra.length === 0 && missing.length > 0 && missing.every((m) => m === 1 || m === rule.n);
    }
  }
}

function matchesBug(bug: BugSpec, input: StudentAnswer): boolean {
  if (bug.rule) return matchesRule(bug.rule, input);
  if (!bug.answer) return false;
  const expected = bug.answer;
  switch (expected.kind) {
    case "integer":
    case "decimal":
    case "fraction": {
      const v = studentValue(input);
      const e = valueOf(expected);
      return v !== null && e !== null && eq(v, e);
    }
    case "compare":
      return input.kind === "compare" && input.value === expected.value;
    case "quotient-remainder": {
      if (input.kind !== "quotient-remainder") return false;
      const q = parseNatural(input.quotient);
      const r = parseNatural(input.remainder === "" ? "0" : input.remainder);
      return q === expected.quotient && r === expected.remainder;
    }
    case "integer-list": {
      if (input.kind !== "integer-list") return false;
      const values = parseIntegerList(input.text);
      if (!values) return false;
      const a = [...new Set(values)].sort((x, y) => x - y);
      const b = [...new Set(expected.values)].sort((x, y) => x - y);
      return a.length === b.length && a.every((x, i) => x === b[i]);
    }
  }
}

function wrong(item: Item, input: StudentAnswer, shown: string): GradeResult {
  const bug = item.bugs.find((b) => matchesBug(b, input));
  return { status: "wrong", bug, shown };
}

export function grade(item: Item, input: StudentAnswer): GradeResult {
  const spec = item.answer;
  switch (spec.kind) {
    case "integer": {
      const v = studentValue(input);
      if (v === null) return { status: "invalid", shown: "" };
      const shown = input.kind === "fraction" ? shownFraction(parseFraction(input)!) : toDecimalString(v) ?? "";
      return eq(v, rat(spec.value)) ? { status: "correct", shown } : wrong(item, input, shown);
    }
    case "decimal": {
      const v = studentValue(input);
      if (v === null) return { status: "invalid", shown: "" };
      const shown = toDecimalString(v) ?? "";
      return eq(v, spec.value) ? { status: "correct", shown } : wrong(item, input, shown);
    }
    case "fraction": {
      if (input.kind !== "fraction" && input.kind !== "integer") return { status: "invalid", shown: "" };
      const f = input.kind === "fraction" ? parseFraction(input) : (() => {
        const n = parseNatural(input.text);
        return n === null ? null : { whole: n, num: 0, den: 1, value: rat(n) };
      })();
      if (!f) return { status: "invalid", shown: "" };
      const shown = shownFraction(f);
      if (!eq(f.value, spec.value)) return wrong(item, input, shown);
      const formIssue = fractionFormIssue(f, spec.form, spec.value);
      return formIssue ? { status: "form", formMessage: formIssue, shown } : { status: "correct", shown };
    }
    case "quotient-remainder": {
      if (input.kind !== "quotient-remainder") return { status: "invalid", shown: "" };
      const q = parseNatural(input.quotient);
      const r = parseNatural(input.remainder === "" ? "0" : input.remainder);
      if (q === null || r === null) return { status: "invalid", shown: "" };
      const shown = r === 0 ? `몫 ${q}` : `몫 ${q}, 나머지 ${r}`;
      return q === spec.quotient && r === spec.remainder ? { status: "correct", shown } : wrong(item, input, shown);
    }
    case "compare": {
      if (input.kind !== "compare" || !["<", ">", "="].includes(input.value)) return { status: "invalid", shown: "" };
      return input.value === spec.value ? { status: "correct", shown: input.value } : wrong(item, input, input.value);
    }
    case "integer-list": {
      if (input.kind !== "integer-list") return { status: "invalid", shown: "" };
      const values = parseIntegerList(input.text);
      if (!values) return { status: "invalid", shown: "" };
      const shown = values.join(", ");
      const a = [...new Set(values)].sort((x, y) => x - y);
      const b = [...new Set(spec.values)].sort((x, y) => x - y);
      const ok = a.length === b.length && a.every((x, i) => x === b[i]);
      return ok ? { status: "correct", shown } : wrong(item, input, shown);
    }
  }
}

function fractionFormIssue(f: ParsedFraction, form: FractionForm, value: Rational): string | null {
  const reducedPart = f.num === 0 || gcd(f.num, f.den) === 1;
  const properPart = f.num < f.den;
  switch (form) {
    case "any":
      return null;
    case "reduced":
      if (!reducedPart) return "값은 맞았어요! 분자와 분모를 더 나눌 수 있어요. 기약분수로 나타내 볼까요?";
      if (f.whole > 0 && !properPart) return "값은 맞았어요! 대분수의 분수 부분은 진분수로 나타내요.";
      return null;
    case "mixed":
      if (value.d === 1) return f.num === 0 ? null : "값은 맞았어요! 이 수는 자연수로 나타낼 수 있어요.";
      if (f.whole === 0 || !properPart) return "값은 맞았어요! 자연수와 진분수로 된 대분수로 나타내 볼까요?";
      return null;
    case "improper":
      if (f.whole > 0) return "값은 맞았어요! 자연수 부분 없이 하나의 분수(가분수)로 나타내 볼까요?";
      return null;
  }
}

/** Child-facing text of the correct answer. */
export function correctAnswerText(item: Item): string {
  return answerText(item.answer);
}

/**
 * The keypad input that represents an answer (used by tests and the E2E helper).
 * Fractions are written in the form the problem asks for.
 */
export function answerToInput(spec: AnswerSpec): StudentAnswer {
  switch (spec.kind) {
    case "integer":
      return { kind: "integer", text: String(spec.value) };
    case "decimal":
      return { kind: "decimal", text: toDecimalString(spec.value) ?? "" };
    case "fraction": {
      const v = spec.value;
      if (v.d === 1) return { kind: "fraction", whole: String(v.n), num: "", den: "" };
      if (spec.form === "improper" || v.n < v.d) return { kind: "fraction", whole: "", num: String(v.n), den: String(v.d) };
      const whole = Math.floor(v.n / v.d);
      return { kind: "fraction", whole: String(whole), num: String(v.n - whole * v.d), den: String(v.d) };
    }
    case "quotient-remainder":
      return { kind: "quotient-remainder", quotient: String(spec.quotient), remainder: String(spec.remainder) };
    case "compare":
      return { kind: "compare", value: spec.value };
    case "integer-list":
      return { kind: "integer-list", text: spec.values.join(", ") };
  }
}

/** A keypad input that is certainly wrong (used by tests and the E2E helper). */
export function wrongInput(spec: AnswerSpec): StudentAnswer {
  switch (spec.kind) {
    case "integer":
      return { kind: "integer", text: String(spec.value + 1) };
    case "decimal":
      return { kind: "decimal", text: toDecimalString(add(spec.value, rat(1))) ?? "1" };
    case "fraction":
      return answerToInput({ ...spec, value: add(spec.value, rat(1)) });
    case "quotient-remainder":
      return { kind: "quotient-remainder", quotient: String(spec.quotient + 1), remainder: String(spec.remainder) };
    case "compare":
      return { kind: "compare", value: spec.value === "<" ? ">" : "<" };
    case "integer-list":
      return { kind: "integer-list", text: spec.values.length > 1 ? spec.values.slice(0, -1).join(", ") : String((spec.values[0] ?? 0) + 1) };
  }
}
