/** Generators for 혼합 계산, 약수와 배수, 최대공약수·최소공배수. */
import { gcd, lcm } from "../../math/rational";
import { josa, withJosa } from "../../math/korean";
import type { Rng } from "../../math/rng";
import { factorsOf, intAns, pushBug, SHORT_ANSWER_GUESS } from "../helpers";
import type { Expr, GeneratedItem } from "../types";
import type { Generator } from "./number";

type Op = "+" | "−" | "×" | "÷";
type Token = number | Op | "(" | ")";

function apply(a: number, op: Op, b: number): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b >= 0 ? a - b : null;
    case "×":
      return a * b;
    case "÷":
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

/** Index of the next operator to evaluate inside a flat (parenthesis-free) token list. */
function nextOpIndex(tokens: Token[], leftToRight: boolean): number {
  if (!leftToRight) {
    const hi = tokens.findIndex((t) => t === "×" || t === "÷");
    if (hi >= 0) return hi;
  }
  return tokens.findIndex((t) => t === "+" || t === "−" || t === "×" || t === "÷");
}

interface Reduction {
  tokens: Token[];
  /** "3 × 4 = 12" or null when only parentheses were removed. */
  step: string | null;
}

/** Performs one evaluation step (innermost parentheses first). */
function reduceOnce(tokens: Token[], leftToRight = false): Reduction | null {
  const open = tokens.lastIndexOf("(");
  if (open >= 0) {
    const close = tokens.indexOf(")", open);
    const inner = tokens.slice(open + 1, close);
    if (inner.length === 1) {
      return { tokens: [...tokens.slice(0, open), inner[0], ...tokens.slice(close + 1)], step: null };
    }
    const r = reduceOnce(inner, leftToRight);
    if (!r) return null;
    // Drop the parentheses as soon as only one number is left inside.
    if (r.tokens.length === 1) {
      return { tokens: [...tokens.slice(0, open), r.tokens[0], ...tokens.slice(close + 1)], step: r.step };
    }
    return { tokens: [...tokens.slice(0, open + 1), ...r.tokens, ...tokens.slice(close)], step: r.step };
  }
  const i = nextOpIndex(tokens, leftToRight);
  if (i < 0) return null;
  const a = tokens[i - 1] as number;
  const op = tokens[i] as Op;
  const b = tokens[i + 1] as number;
  const v = apply(a, op, b);
  if (v === null) return null;
  return { tokens: [...tokens.slice(0, i - 1), v, ...tokens.slice(i + 2)], step: `${a} ${op} ${b} = ${v}` };
}

/** Evaluates fully; returns the value and the worked steps, or null if a step is not a natural number. */
export function evaluateTokens(tokens: Token[], mode: "correct" | "left-to-right" | "ignore-parens" = "correct"): { value: number; steps: string[] } | null {
  let current = mode === "ignore-parens" ? tokens.filter((t) => t !== "(" && t !== ")") : [...tokens];
  const steps: string[] = [];
  while (current.length > 1) {
    const r = reduceOnce(current, mode === "left-to-right");
    if (!r) return null;
    current = r.tokens;
    if (r.step) steps.push(current.length > 1 ? `${r.step} → ${tokensText(current)}` : r.step);
  }
  return typeof current[0] === "number" ? { value: current[0], steps } : null;
}

export function tokensText(tokens: Token[]): string {
  return tokens
    .map((t) => String(t))
    .join(" ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");
}

/** Parses tokens into an expression tree with normal precedence (for independent checking). */
export function tokensToExpr(tokens: Token[]): Expr {
  let pos = 0;
  const parsePrimary = (): Expr => {
    const t = tokens[pos++];
    if (t === "(") {
      const e = parseSum();
      pos++; // ")"
      return e;
    }
    return { k: "num", v: t as number };
  };
  const parseProduct = (): Expr => {
    let left = parsePrimary();
    while (tokens[pos] === "×" || tokens[pos] === "÷") {
      const op = tokens[pos++] === "×" ? "mul" : "div";
      left = { k: op, a: left, b: parsePrimary() };
    }
    return left;
  };
  const parseSum = (): Expr => {
    let left = parseProduct();
    while (tokens[pos] === "+" || tokens[pos] === "−") {
      const op = tokens[pos++] === "+" ? "add" : "sub";
      left = { k: op, a: left, b: parseProduct() };
    }
    return left;
  };
  return parseSum();
}

function exprTemplate(rng: Rng, difficulty: number): Token[] {
  if (difficulty === 1) {
    const low = rng.pick<Op>(["+", "−"]);
    const high = rng.pick<Op>(["×", "÷"]);
    if (high === "×") {
      const b = rng.int(2, 9);
      const c = rng.int(2, 9);
      const a = low === "+" ? rng.int(2, 40) : rng.int(b * c + 1, b * c + 40);
      return [a, low, b, high, c];
    }
    const c = rng.int(2, 9);
    const b = c * rng.int(2, 9);
    const a = low === "+" ? rng.int(2, 40) : rng.int(b / c + 1, b / c + 40);
    return [a, low, b, high, c];
  }
  if (difficulty === 2) {
    const form = rng.int(0, 3);
    if (form === 0) {
      const a = rng.int(2, 20);
      const b = rng.int(2, 20);
      return ["(", a, "+", b, ")", "×", rng.int(2, 6)];
    }
    if (form === 1) {
      const c = rng.int(2, 9);
      const b = c + rng.int(2, 9);
      return [rng.int(2, 9), "×", "(", b, "−", c, ")"];
    }
    if (form === 2) {
      const c = rng.int(2, 9);
      const q = rng.int(2, 9);
      const b = rng.int(2, 20);
      return ["(", c * q + b, "−", b, ")", "÷", c];
    }
    const b = rng.int(2, 6);
    const c = rng.int(2, 6);
    return [(b + c) * rng.int(2, 9), "÷", "(", b, "+", c, ")"];
  }
  const e = rng.int(2, 9);
  const d = e * rng.int(2, 9);
  const b = rng.int(2, 9);
  const c = rng.int(2, 9);
  const a = rng.int(d / e + 1, d / e + 50);
  return [a, "+", b, "×", c, "−", d, "÷", e];
}

export const genMixOrder: Generator = (rng, difficulty) => {
  for (;;) {
    const tokens = exprTemplate(rng, difficulty);
    const correct = evaluateTokens(tokens);
    if (!correct) continue;
    const answer = intAns(correct.value);
    const bugs: GeneratedItem["bugs"] = [];
    const hasParens = tokens.includes("(");
    if (hasParens) {
      const np = evaluateTokens(tokens, "ignore-parens");
      if (np) pushBug(bugs, "MIX_IGNORE_PARENS", intAns(np.value), answer, "괄호가 있으면 괄호 안을 가장 먼저 계산해요. 괄호 부분에 밑줄을 긋고 다시 계산해 보세요.");
    } else {
      const ltr = evaluateTokens(tokens, "left-to-right");
      if (ltr) pushBug(bugs, "MIX_LEFT_TO_RIGHT", intAns(ltr.value), answer, "곱셈과 나눗셈은 덧셈과 뺄셈보다 먼저 계산해요. 먼저 계산할 부분을 찾아 보세요.");
    }
    return {
      prompt: `${tokensText(tokens)} = □`,
      answer,
      bugs,
      steps: [
        hasParens ? "괄호 안을 가장 먼저 계산해요." : "곱셈과 나눗셈을 덧셈과 뺄셈보다 먼저 계산해요.",
        ...correct.steps,
        `답: ${correct.value}`,
      ],
      guessRate: SHORT_ANSWER_GUESS,
      check: tokensToExpr(tokens),
    };
  }
};

const FACTOR_TARGETS = [6, 8, 10, 12, 14, 15, 16, 18, 20, 21, 24, 28, 30, 32, 36];
const MANY_FACTORS = [24, 30, 36, 40, 42, 48, 54, 56, 60];

function factorPairsText(n: number): string {
  const pairs: string[] = [];
  for (let i = 1; i * i <= n; i++) if (n % i === 0) pairs.push(`${i} × ${n / i}`);
  return pairs.join(", ");
}

export const genFactorMultiple: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const base = rng.int(2, 12);
    const k = rng.int(2, 9);
    const list = Array.from({ length: k }, (_, i) => base * (i + 1)).join(", ");
    return {
      prompt: `${base}의 배수를 작은 수부터 차례로 쓸 때 ${k}번째 수는 무엇일까요?`,
      answer: intAns(base * k),
      bugs: [],
      steps: [`${base}의 배수는 ${withJosa(base, "을/를")} 1배, 2배, 3배… 한 수예요: ${list}`, `${k}번째 수는 ${base} × ${k} = ${base * k}`],
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: { k: "num", v: base }, b: { k: "num", v: k } },
    };
  }
  if (difficulty === 2) {
    const target = rng.pick(FACTOR_TARGETS);
    const factors = factorsOf(target);
    return {
      prompt: `${target}의 약수를 모두 쓰세요.`,
      instruction: "수와 수 사이는 쉼표(,)로 구분해요.",
      answer: { kind: "integer-list", values: factors },
      bugs: [
        { misconceptionId: "FACTOR_MULTIPLE_CONFUSE", rule: { type: "listed-multiples", n: target }, feedback: `약수는 ${withJosa(target, "을/를")} 나누어떨어지게 하는 수예요. ${target}보다 큰 수는 약수가 될 수 없어요.` },
        { misconceptionId: "FACTOR_MISSING_TRIVIAL", rule: { type: "factors-missing-trivial", n: target }, feedback: `1과 ${target} 자신도 약수예요. ${target} ÷ 1과 ${target} ÷ ${withJosa(target, "을/를")} 생각해 보세요.` },
      ],
      steps: [`곱해서 ${withJosa(target, "이/가")} 되는 두 수를 짝지어 찾아요: ${factorPairsText(target)}`, `${target}의 약수: ${factors.join(", ")}`],
      guessRate: 0.01,
      check: { k: "factors", n: target },
    };
  }
  const target = rng.pick(MANY_FACTORS);
  const count = factorsOf(target).length;
  const answer = intAns(count);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FACTOR_MISSING_TRIVIAL", intAns(count - 2), answer, `1과 ${target} 자신도 약수에 넣었는지 확인해 보세요.`);
  return {
    prompt: `${target}의 약수는 모두 몇 개일까요?`,
    answer,
    bugs,
    steps: [`곱해서 ${withJosa(target, "이/가")} 되는 두 수를 짝지어 찾아요: ${factorPairsText(target)}`, `${target}의 약수: ${factorsOf(target).join(", ")}`, `모두 ${count}개`],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "count-factors", n: target },
  };
};

function multiplesUntil(n: number, limit: number): number[] {
  const out: number[] = [];
  for (let m = n; m <= limit; m += n) out.push(m);
  return out;
}

export const genGcdLcm: Generator = (rng, difficulty) => {
  for (;;) {
    const g = difficulty === 3 ? rng.int(2, 12) : rng.int(2, 6);
    const x = rng.int(1, 5);
    const y = rng.int(2, 6);
    if (x === y || gcd(x, y) !== 1) continue;
    const a = g * x;
    const b = g * y;
    const limit = difficulty === 3 ? 72 : 36;
    if (a > limit || b > limit || a === b) continue;
    const [p, q] = rng.bool() ? [a, b] : [b, a];
    const askGcd = difficulty === 1 || (difficulty === 3 && rng.bool());
    const G = gcd(p, q);
    const L = lcm(p, q);
    if (askGcd) {
      if (G === Math.min(p, q) && rng.bool(0.7)) continue; // prefer cases where the gcd is not one of the numbers
      const answer = intAns(G);
      const bugs: GeneratedItem["bugs"] = [];
      pushBug(bugs, "GCD_LCM_CONFUSE", intAns(L), answer, `최대공약수는 두 수를 모두 나누어떨어지게 하는 수 중 가장 큰 수라서 ${p}보다 클 수 없어요.`);
      const common = factorsOf(G);
      return {
        prompt: `${withJosa(p, "과/와")} ${q}의 최대공약수는 무엇일까요?`,
        answer,
        bugs,
        steps: [`${p}의 약수: ${factorsOf(p).join(", ")}`, `${q}의 약수: ${factorsOf(q).join(", ")}`, `공약수: ${common.join(", ")}`, `가장 큰 공약수 ${withJosa(G, "이/가")} 최대공약수예요.`],
        story: { kind: "gcd", a: p, b: q },
        guessRate: SHORT_ANSWER_GUESS,
        check: { k: "gcd", a: p, b: q },
      };
    }
    const answer = intAns(L);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "LCM_AS_PRODUCT", intAns(p * q), answer, `두 수의 곱 ${p * q}${josa(p * q, "은/는")} 공배수이지만 가장 작은 공배수가 아닐 수 있어요. 두 수의 배수를 차례로 써서 처음 같아지는 수를 찾아보세요.`);
    pushBug(bugs, "GCD_LCM_CONFUSE", intAns(G), answer, `최소공배수는 두 수의 배수 중 가장 작은 공통인 수라서 ${q}보다 작을 수 없어요.`);
    const short = L / p <= 8 && L / q <= 8;
    return {
      prompt: `${withJosa(p, "과/와")} ${q}의 최소공배수는 무엇일까요?`,
      answer,
      bugs,
      steps: short
        ? [`${p}의 배수: ${multiplesUntil(p, L).join(", ")}`, `${q}의 배수: ${multiplesUntil(q, L).join(", ")}`, `처음으로 같은 배수 ${withJosa(L, "이/가")} 최소공배수예요.`]
        : [`최대공약수 ${G}${josa(G, "을/를")} 이용해요: ${p} = ${G} × ${p / G}, ${q} = ${G} × ${q / G}`, `최소공배수 = ${G} × ${p / G} × ${q / G} = ${L}`],
      story: { kind: "lcm", a: p, b: q },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "lcm", a: p, b: q },
    };
  }
};
