/**
 * Independent evaluator for an item's `check` expression. Tests use it to verify
 * that every generator's answer is right, without trusting the generator's own
 * arithmetic (gcd/lcm/factors are brute-forced, Korean readings are parsed).
 */
import { add, cmp, div, mul, rat, sub, toDecimalString, toRational, type Rational } from "../math/rational";
import { parseKoreanNumber } from "../math/korean";
import type { AnswerSpec, CompareSymbol, Expr } from "./types";

export type CheckValue =
  | { type: "number"; value: Rational }
  | { type: "compare"; value: CompareSymbol }
  | { type: "divmod"; q: number; r: number }
  | { type: "list"; values: number[] }
  | { type: "label"; value: string };

function bruteGcd(a: number, b: number): number {
  for (let g = Math.min(a, b); g >= 1; g--) if (a % g === 0 && b % g === 0) return g;
  return 1;
}

function bruteLcm(a: number, b: number): number {
  for (let m = Math.max(a, b); ; m++) if (m % a === 0 && m % b === 0) return m;
}

function bruteFactors(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
}

function digitValue(n: number | Rational, digit: number): Rational {
  const r = toRational(n);
  const text = toDecimalString(r);
  if (!text) throw new Error("digit-value needs a terminating decimal");
  const [intPart, fracPart = ""] = text.split(".");
  const intIdx = intPart.indexOf(String(digit));
  const fracIdx = fracPart.indexOf(String(digit));
  if (intIdx >= 0 && fracIdx < 0) return rat(digit * 10 ** (intPart.length - 1 - intIdx));
  if (fracIdx >= 0 && intIdx < 0) return rat(digit, 10 ** (fracIdx + 1));
  throw new Error(`digit ${digit} is not unique in ${text}`);
}

export function evaluateExpr(e: Expr): CheckValue {
  const numberOf = (x: Expr): Rational => {
    const v = evaluateExpr(x);
    if (v.type !== "number") throw new Error("expected a number");
    return v.value;
  };
  switch (e.k) {
    case "num":
      return { type: "number", value: toRational(e.v) };
    case "add":
      return { type: "number", value: add(numberOf(e.a), numberOf(e.b)) };
    case "sub":
      return { type: "number", value: sub(numberOf(e.a), numberOf(e.b)) };
    case "mul":
      return { type: "number", value: mul(numberOf(e.a), numberOf(e.b)) };
    case "div":
      return { type: "number", value: div(numberOf(e.a), numberOf(e.b)) };
    case "cmp": {
      const c = cmp(numberOf(e.a), numberOf(e.b));
      return { type: "compare", value: c < 0 ? "<" : c > 0 ? ">" : "=" };
    }
    case "divmod":
      return { type: "divmod", q: Math.floor(e.a / e.b), r: e.a - Math.floor(e.a / e.b) * e.b };
    case "gcd":
      return { type: "number", value: rat(bruteGcd(e.a, e.b)) };
    case "lcm":
      return { type: "number", value: rat(bruteLcm(e.a, e.b)) };
    case "factors":
      return { type: "list", values: bruteFactors(e.n) };
    case "count-factors":
      return { type: "number", value: rat(bruteFactors(e.n).length) };
    case "places":
      return { type: "number", value: rat(e.terms.reduce((s, [u, c]) => s + u * c, 0)) };
    case "digit-value":
      return { type: "number", value: digitValue(e.n, e.digit) };
    case "korean": {
      const v = parseKoreanNumber(e.text);
      if (v === null) throw new Error(`cannot parse ${e.text}`);
      return { type: "number", value: rat(v) };
    }
    case "max": {
      const values = e.items.map(numberOf);
      return { type: "number", value: values.reduce((m, v) => (cmp(v, m) > 0 ? v : m)) };
    }
    case "label":
      return { type: "label", value: e.value };
  }
}

/** Whether an answer spec agrees with the independently computed value. */
export function answerMatches(spec: AnswerSpec, v: CheckValue): boolean {
  switch (spec.kind) {
    case "integer":
      return (
        (v.type === "number" && v.value.d === 1 && v.value.n === spec.value) ||
        (v.type === "divmod" && v.r === 0 && v.q === spec.value)
      );
    case "decimal":
    case "fraction":
      return v.type === "number" && v.value.n === spec.value.n && v.value.d === spec.value.d;
    case "compare":
      return v.type === "compare" && v.value === spec.value;
    case "quotient-remainder":
      return (
        (v.type === "divmod" && v.q === spec.quotient && v.r === spec.remainder) ||
        (v.type === "number" && spec.remainder === 0 && v.value.d === 1 && v.value.n === spec.quotient)
      );
    case "integer-list":
      return v.type === "list" && v.values.length === spec.values.length && v.values.every((x, i) => x === [...spec.values].sort((a, b) => a - b)[i]);
    case "choice":
      // Options may be shuffled, so compare the chosen option's text.
      return v.type === "label" && spec.options[spec.value] === v.value;
    case "text":
      return v.type === "label" && spec.model === v.value;
  }
}
