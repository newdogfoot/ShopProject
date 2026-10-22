/** Generators for the 분수 strand. */
import { formatRational, gcd, lcm, rat, type Rational } from "../../math/rational";
import { josa, withJosa } from "../../math/korean";
import type { Rng } from "../../math/rng";
import { cmpAns, COMPARE_GUESS, flipSymbol, fracAns, intAns, pushBug, SHORT_ANSWER_GUESS } from "../helpers";
import type { CompareSymbol, Expr, GeneratedItem, QuantityUnit } from "../types";
import { COMPARE_INSTRUCTION, type Generator } from "./number";

/** Raw fraction markup without reducing: fm(2, 4) → "{2/4}", fm(1, 3, 2) → "{2 1/3}". */
export function fm(n: number, d: number, whole = 0): string {
  if (n === 0) return String(whole);
  return whole ? `{${whole} ${n}/${d}}` : `{${n}/${d}}`;
}

/** Splits n/d (not reduced) into a mixed-number markup: 7/3 → "{2 1/3}", 6/3 → "2". */
export function mixedRaw(n: number, d: number): string {
  const w = Math.floor(n / d);
  const r = n % d;
  if (r === 0) return String(w);
  return fm(r, d, w);
}

/** Normalized answer markup (lowest terms, mixed when larger than 1). */
const fr = (r: Rational) => formatRational(r, "mixed");
const num = (v: number | Rational): Expr => ({ k: "num", v });
const ratE = (n: number, d: number): Expr => ({ k: "div", a: num(n), b: num(d) });
const mixedE = (w: number, n: number, d: number): Expr => ({ k: "add", a: num(w), b: ratE(n, d) });

const UNITS: QuantityUnit[] = ["L", "kg", "m"];
const REDUCED = "기약분수로 나타내세요.";

function cmpSym(a: Rational, b: Rational): CompareSymbol {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l < r ? "<" : l > r ? ">" : "=";
}

/** Adds a "= {reduced}" line when the raw result can be simplified. */
function simplifySteps(rawN: number, rawD: number, value: Rational): string[] {
  const raw = fm(rawN, rawD);
  const final = fr(value);
  return raw === final ? [] : [`${raw} = ${final}`];
}

export const genFracMeaning: Generator = (rng, difficulty) => {
  const p = rng.int(difficulty === 3 ? 3 : 2, 8);
  const s = rng.int(difficulty === 3 ? 2 : 1, p - 1);
  const value = rat(s, p);
  const answer = fracAns(value);
  const bugs: GeneratedItem["bugs"] = [];
  if (difficulty === 1) {
    pushBug(bugs, "FRAC_PART_PART", fracAns(rat(s, p - s)), answer, `분모는 전체 조각 수예요. 색칠하지 않은 조각 수가 아니라 전체 ${p}조각을 분모로 써요.`);
    pushBug(bugs, "FRAC_INVERTED", fracAns(rat(p, s)), answer, "분모(아래)에는 전체 조각 수, 분자(위)에는 색칠한 조각 수를 써요.");
    return {
      prompt: "색칠한 부분은 전체의 얼마인지 분수로 나타내세요.",
      answer,
      bugs,
      steps: [`전체를 똑같이 ${p}조각으로 나누었으니 분모는 ${withJosa(p, "이에요/예요")}.`, `색칠한 조각이 ${s}개이니 분자는 ${withJosa(s, "이에요/예요")}.`, `답: ${fm(s, p)}`],
      visual: { type: "fraction-bar", parts: p, shaded: s },
      showVisual: true,
      guessRate: SHORT_ANSWER_GUESS,
      check: ratE(s, p),
    };
  }
  if (difficulty === 2) {
    pushBug(bugs, "FRAC_INVERTED", fracAns(rat(p, s)), answer, "분모(아래)에는 전체를 나눈 수, 분자(위)에는 그중 몇 개인지를 써요.");
    return {
      prompt: `전체를 똑같이 ${withJosa(p, "으로/로")} 나눈 것 중의 ${withJosa(s, "을/를")} 분수로 나타내세요.`,
      answer,
      bugs,
      steps: [`전체를 ${withJosa(p, "으로/로")} 나누었으니 분모는 ${withJosa(p, "이에요/예요")}.`, `그중 ${s}이니까 분자는 ${withJosa(s, "이에요/예요")}.`, `답: ${fm(s, p)}`],
      visual: { type: "fraction-bar", parts: p, shaded: s },
      guessRate: SHORT_ANSWER_GUESS,
      check: ratE(s, p),
    };
  }
  return {
    prompt: `${withJosa(fm(1, p), "이/가")} ${s}개인 수를 분수로 나타내세요.`,
    answer,
    bugs,
    steps: [`${withJosa(fm(1, p), "이/가")} ${s}개이면 분모는 그대로 ${p}, 분자는 ${withJosa(s, "이/가")} 돼요.`, `답: ${fm(s, p)}`],
    visual: { type: "fraction-bar", parts: p, shaded: s },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: num(rat(1, p)), b: num(s) },
  };
};

export const genFracCompare: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const a = rng.int(2, 10);
    let b = rng.int(2, 10);
    while (b === a) b = rng.int(2, 10);
    const sym = cmpSym(rat(1, a), rat(1, b));
    const answer = cmpAns(sym);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "FRAC_BIGGER_DEN_BIGGER", cmpAns(flipSymbol(sym)), answer, "분자가 1로 같으면 분모가 클수록 더 잘게 나눈 거라서 한 조각이 작아요.");
    return {
      prompt: `${fm(1, a)} ○ ${fm(1, b)}`,
      instruction: COMPARE_INSTRUCTION,
      answer,
      bugs,
      steps: ["분자가 1로 같을 때는 분모가 작을수록 한 조각이 커요.", `${fm(1, a)}${josa(fm(1, a), "은/는")} ${a}조각 중 1조각, ${fm(1, b)}${josa(fm(1, b), "은/는")} ${b}조각 중 1조각이에요.`, `그래서 ${fm(1, a)} ${sym} ${fm(1, b)}`],
      visual: { type: "fraction-bar", parts: Math.min(a, b), shaded: 1 },
      guessRate: COMPARE_GUESS,
      check: { k: "cmp", a: num(rat(1, a)), b: num(rat(1, b)) },
    };
  }
  if (difficulty === 2) {
    const d = rng.int(3, 12);
    const x = rng.int(1, d - 1);
    let y = rng.int(1, d - 1);
    while (y === x) y = rng.int(1, d - 1);
    const sym = cmpSym(rat(x, d), rat(y, d));
    return {
      prompt: `${fm(x, d)} ○ ${fm(y, d)}`,
      instruction: COMPARE_INSTRUCTION,
      answer: cmpAns(sym),
      bugs: [],
      steps: ["분모가 같으면 분자가 클수록 큰 분수예요.", `분자 ${withJosa(x, "과/와")} ${y}${josa(y, "을/를")} 비교하면 ${x} ${sym} ${y}`, `그래서 ${fm(x, d)} ${sym} ${fm(y, d)}`],
      guessRate: COMPARE_GUESS,
      check: { k: "cmp", a: num(rat(x, d)), b: num(rat(y, d)) },
    };
  }
  const dens = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3);
  const smallest = Math.min(...dens);
  const largest = Math.max(...dens);
  const answer = fracAns(rat(1, smallest));
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_BIGGER_DEN_BIGGER", fracAns(rat(1, largest)), answer, "단위분수는 분모가 클수록 한 조각이 작아요. 가장 큰 분수는 분모가 가장 작은 분수예요.");
  return {
    prompt: `가장 큰 분수를 쓰세요: ${dens.map((d) => fm(1, d)).join(", ")}`,
    answer,
    bugs,
    steps: ["분자가 모두 1이면 분모가 가장 작은 분수가 가장 커요.", `분모 중 가장 작은 수는 ${withJosa(smallest, "이에요/예요")}.`, `답: ${fm(1, smallest)}`],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "max", items: dens.map((d) => num(rat(1, d))) },
  };
};

export const genFracOfQuantity: Generator = (rng, difficulty) => {
  const den = difficulty === 1 ? rng.int(2, 8) : rng.int(3, 8);
  const n = difficulty === 1 ? 1 : rng.int(2, den - 1);
  const k = difficulty === 3 ? rng.int(4, 12) : rng.int(2, 6);
  const total = den * k;
  const ans = k * n;
  const answer = intAns(ans);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_OF_UNIT_ONLY", intAns(k), answer, `${total}${josa(total, "을/를")} ${den}묶음으로 나눈 한 묶음(${k})만 구한 것 같아요. ${fm(n, den)}${josa(fm(n, den), "은/는")} 그중 ${n}묶음이에요.`);
  return {
    prompt: `${total}의 ${withJosa(fm(n, den), "은/는")} 얼마일까요?`,
    answer,
    bugs,
    steps: [
      `${withJosa(total, "을/를")} ${den}묶음으로 똑같이 나누면 한 묶음은 ${total} ÷ ${den} = ${k}`,
      n === 1 ? `${withJosa(fm(1, den), "은/는")} 그중 1묶음이니까 ${k}` : `${withJosa(fm(n, den), "은/는")} 그중 ${n}묶음이니까 ${k} × ${n} = ${ans}`,
    ],
    visual: total <= 48 ? { type: "dots", count: total, groupSize: k } : undefined,
    story: { kind: "frac-of", total, frac: rat(n, den) },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: num(total), b: num(rat(n, den)) },
  };
};

function properPair(rng: Rng, minDen = 2, maxDen = 9): { num: number; den: number } {
  for (;;) {
    const den = rng.int(minDen, maxDen);
    const n = rng.int(1, den - 1);
    if (gcd(n, den) === 1) return { num: n, den };
  }
}

export const genFracMixedImproper: Generator = (rng, difficulty) => {
  const { num: n, den } = properPair(rng);
  const whole = rng.int(1, 4);
  const N = whole * den + n;
  if (difficulty === 1) {
    return {
      prompt: `${withJosa(fm(N, den), "을/를")} 대분수로 나타내세요.`,
      answer: fracAns(rat(N, den), "mixed"),
      bugs: [],
      steps: [`${N} ÷ ${den} = ${whole} … ${n}`, `자연수 부분은 ${whole}, 남은 ${withJosa(n, "은/는")} 분자가 돼요.`, `${fm(N, den)} = ${fm(n, den, whole)}`],
      visual: { type: "fraction-bar", parts: den, shaded: N, bars: whole + 1 },
      guessRate: SHORT_ANSWER_GUESS,
      check: ratE(N, den),
    };
  }
  if (difficulty === 2) {
    const answer = fracAns(rat(N, den), "improper");
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "MIXED_TO_IMPROPER_ADD", fracAns(rat(whole + n, den), "improper"), answer, `자연수 ${withJosa(whole, "은/는")} ${withJosa(fm(den, den), "이/가")} ${whole}개예요. 자연수를 먼저 분수로 바꾼 다음 분자를 더해 보세요.`);
    return {
      prompt: `${withJosa(fm(n, den, whole), "을/를")} 가분수로 나타내세요.`,
      answer,
      bugs,
      steps: [`자연수 ${withJosa(whole, "은/는")} ${withJosa(fm(den, den), "이/가")} ${whole}개 → ${fm(whole * den, den)}`, `${fm(whole * den, den)} + ${fm(n, den)} = ${fm(N, den)}`],
      visual: { type: "fraction-bar", parts: den, shaded: N, bars: whole + 1 },
      guessRate: SHORT_ANSWER_GUESS,
      check: mixedE(whole, n, den),
    };
  }
  let M = N + rng.pick([-2, -1, 1, 2]);
  if (M <= 0 || M === N) M = N + 1;
  const sym = cmpSym(rat(N, den), rat(M, den));
  return {
    prompt: `${fm(n, den, whole)} ○ ${fm(M, den)}`,
    instruction: COMPARE_INSTRUCTION,
    answer: cmpAns(sym),
    bugs: [],
    steps: [`${withJosa(fm(n, den, whole), "을/를")} 가분수로 바꾸면 ${fm(N, den)}`, `분모가 같으니 분자 ${withJosa(N, "과/와")} ${withJosa(M, "을/를")} 비교해요.`, `그래서 ${fm(n, den, whole)} ${sym} ${fm(M, den)}`],
    guessRate: COMPARE_GUESS,
    check: { k: "cmp", a: mixedE(whole, n, den), b: ratE(M, den) },
  };
};

export const genFracSameDenAdd: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  for (;;) {
    const den = rng.int(3, 12);
    const a = rng.int(1, den - 1);
    const b = rng.int(1, den - 1);
    const s = a + b;
    if (difficulty === 1 && s >= den) continue;
    if (difficulty >= 2 && s <= den) continue;
    if (difficulty <= 2) {
      const value = rat(s, den);
      const answer = fracAns(value);
      const bugs: GeneratedItem["bugs"] = [];
      pushBug(bugs, "FRAC_ADD_DENOMINATORS", fracAns(rat(s, 2 * den)), answer, "분모는 조각의 크기라서 더하지 않아요. 분모는 그대로 두고 분자끼리만 더해요.");
      return {
        prompt: `${fm(a, den)} + ${fm(b, den)} = □`,
        answer,
        bugs,
        steps: [
          `분모가 같으니 분모는 그대로 두고 분자끼리 더해요: ${a} + ${b} = ${s}`,
          `${fm(a, den)} + ${fm(b, den)} = ${fm(s, den)}`,
          ...(s >= den ? [`${fm(s, den)} = ${mixedRaw(s, den)}`] : []),
        ],
        visual: { type: "fraction-bar", parts: den, shaded: s, bars: Math.ceil(s / den) },
        story: { kind: "qty-add", a: fm(a, den), b: fm(b, den), unit },
        guessRate: SHORT_ANSWER_GUESS,
        check: { k: "add", a: ratE(a, den), b: ratE(b, den) },
      };
    }
    const w1 = rng.int(1, 3);
    const w2 = rng.int(1, 3);
    const W = w1 + w2;
    const value = rat(W * den + s, den);
    const answer = fracAns(value);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "FRAC_ADD_DENOMINATORS", fracAns(rat(W * 2 * den + s, 2 * den)), answer, "분모는 그대로 두고 분자끼리만 더해요. 분수 부분의 합이 1보다 크면 자연수로 1을 올려요.");
    return {
      prompt: `${fm(a, den, w1)} + ${fm(b, den, w2)} = □`,
      answer,
      bugs,
      steps: [
        `자연수끼리 더해요: ${w1} + ${w2} = ${W}`,
        `분수끼리 더해요: ${fm(a, den)} + ${fm(b, den)} = ${fm(s, den)} = ${mixedRaw(s, den)}`,
        `${W} + ${mixedRaw(s, den)} = ${mixedRaw(W * den + s, den)}`,
      ],
      story: { kind: "qty-add", a: fm(a, den, w1), b: fm(b, den, w2), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "add", a: mixedE(w1, a, den), b: mixedE(w2, b, den) },
    };
  }
};

export const genFracSameDenSub: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  const den = rng.int(3, 12);
  if (difficulty === 1) {
    const a = rng.int(2, den - 1);
    const b = rng.int(1, a - 1);
    return {
      prompt: `${fm(a, den)} − ${fm(b, den)} = □`,
      answer: fracAns(rat(a - b, den)),
      bugs: [],
      steps: [`분모가 같으니 분모는 그대로 두고 분자끼리 빼요: ${a} − ${b} = ${a - b}`, `${fm(a, den)} − ${fm(b, den)} = ${fm(a - b, den)}`],
      visual: { type: "fraction-bar", parts: den, shaded: a },
      story: { kind: "qty-sub", a: fm(a, den), b: fm(b, den), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "sub", a: ratE(a, den), b: ratE(b, den) },
    };
  }
  if (difficulty === 2) {
    const W = rng.int(1, 5);
    const b = rng.int(1, den - 1);
    const borrowed = W - 1 === 0 ? fm(den, den) : fm(den, den, W - 1);
    return {
      prompt: `${W} − ${fm(b, den)} = □`,
      answer: fracAns(rat(W * den - b, den)),
      bugs: [],
      steps: [`자연수 ${W}에서 1을 분수로 바꿔요: ${W} = ${borrowed}`, `${borrowed} − ${fm(b, den)} = ${mixedRaw(W * den - b, den)}`],
      story: { kind: "qty-sub", a: String(W), b: fm(b, den), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "sub", a: num(W), b: ratE(b, den) },
    };
  }
  const w1 = rng.int(2, 5);
  const w2 = rng.int(1, w1 - 1);
  const a = rng.int(1, den - 2);
  const b = rng.int(a + 1, den - 1);
  const top = w1 * den + a;
  const bottom = w2 * den + b;
  const value = rat(top - bottom, den);
  const answer = fracAns(value);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_SUB_SMALLER_FROM_LARGER", fracAns(rat((w1 - w2) * den + (b - a), den)), answer, `분자 ${a}에서 ${withJosa(b, "을/를")} 뺄 수 없으면, 자연수에서 1을 받아내려 ${withJosa(fm(den, den), "으로/로")} 바꾼 다음 빼요.`);
  const borrowedTop = fm(a + den, den, w1 - 1);
  return {
    prompt: `${fm(a, den, w1)} − ${fm(b, den, w2)} = □`,
    answer,
    bugs,
    steps: [
      `분자 ${a}에서 ${withJosa(b, "을/를")} 뺄 수 없으니 자연수에서 1을 받아내려요: ${fm(a, den, w1)} = ${borrowedTop}`,
      `자연수끼리: ${w1 - 1} − ${w2} = ${w1 - 1 - w2}, 분수끼리: ${fm(a + den, den)} − ${fm(b, den)} = ${fm(a + den - b, den)}`,
      `답: ${mixedRaw(top - bottom, den)}`,
    ],
    story: { kind: "qty-sub", a: fm(a, den, w1), b: fm(b, den, w2), unit },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "sub", a: mixedE(w1, a, den), b: mixedE(w2, b, den) },
  };
};

export const genFracEquiv: Generator = (rng, difficulty) => {
  const { num: p, den: q } = properPair(rng);
  if (difficulty === 1) {
    const k = rng.int(2, 6);
    return {
      prompt: `${withJosa(fm(p * k, q * k), "을/를")} 기약분수로 나타내세요.`,
      answer: fracAns(rat(p, q), "reduced"),
      bugs: [],
      steps: [`${withJosa(p * k, "과/와")} ${q * k}의 최대공약수는 ${withJosa(k, "이에요/예요")}.`, `분자와 분모를 ${withJosa(k, "으로/로")} 나누면 ${fm(p * k, q * k)} = ${fm(p, q)}`],
      guessRate: SHORT_ANSWER_GUESS,
      check: ratE(p * k, q * k),
    };
  }
  if (difficulty === 2) {
    const m = rng.int(2, 6);
    const T = q * m;
    const answer = intAns(p * m);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "FRAC_EQUIV_ADD_SAME", intAns(p + (T - q)), answer, `분자와 분모에 같은 수를 더하면 크기가 달라져요. 분모 ${withJosa(q, "을/를")} ${withJosa(T, "으로/로")} 만들 때 몇을 곱했는지 생각해 보세요.`);
    return {
      prompt: `${withJosa(fm(p, q), "과/와")} 크기가 같은 분수 중에서 분모가 ${T}인 분수의 분자는 얼마일까요?`,
      answer,
      bugs,
      steps: [`분모 ${withJosa(q, "을/를")} ${withJosa(T, "으로/로")} 만들려면 ${withJosa(m, "을/를")} 곱해요.`, `분자에도 ${withJosa(m, "을/를")} 곱해요: ${p} × ${m} = ${p * m}`, `${fm(p, q)} = ${fm(p * m, T)}`],
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: num(p), b: { k: "div", a: num(T), b: num(q) } },
    };
  }
  for (;;) {
    const a = rng.int(2, 10);
    const b = rng.int(2, 10);
    if (a === b) continue;
    const x = coprimeNumerator(rng, a);
    const y = coprimeNumerator(rng, b);
    const sym = cmpSym(rat(x, a), rat(y, b));
    if (sym === "=") continue;
    const L = lcm(a, b);
    return {
      prompt: `${fm(x, a)} ○ ${fm(y, b)}`,
      instruction: COMPARE_INSTRUCTION,
      answer: cmpAns(sym),
      bugs: [],
      steps: [`분모 ${withJosa(a, "과/와")} ${b}의 최소공배수 ${withJosa(L, "으로/로")} 통분해요.`, `${fm(x, a)} = ${fm((x * L) / a, L)}, ${fm(y, b)} = ${fm((y * L) / b, L)}`, `분자를 비교하면 ${(x * L) / a} ${sym} ${(y * L) / b} → ${fm(x, a)} ${sym} ${fm(y, b)}`],
      guessRate: COMPARE_GUESS,
      check: { k: "cmp", a: ratE(x, a), b: ratE(y, b) },
    };
  }
};

function pickDens(rng: Rng, difficulty: number): [number, number] {
  for (;;) {
    if (difficulty === 1) {
      const a = rng.int(2, 6);
      const b = a * rng.int(2, 3);
      if (b > 12) continue;
      return rng.bool() ? [a, b] : [b, a];
    }
    const a = rng.int(2, 10);
    const b = rng.int(2, 10);
    if (a === b || a % b === 0 || b % a === 0) continue;
    if (lcm(a, b) > 40) continue;
    return [a, b];
  }
}

/** Numerator in 1..den−1 that is coprime with den (so the fraction is in lowest terms). */
function coprimeNumerator(rng: Rng, den: number): number {
  for (;;) {
    const x = rng.int(1, den - 1);
    if (gcd(x, den) === 1) return x;
  }
}

export const genFracDiffDenAdd: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  const [a, b] = pickDens(rng, difficulty);
  const x = coprimeNumerator(rng, a);
  const y = coprimeNumerator(rng, b);
  const L = lcm(a, b);
  const xs = (x * L) / a;
  const ys = (y * L) / b;
  const s = xs + ys;
  const w1 = difficulty === 3 ? rng.int(1, 3) : 0;
  const w2 = difficulty === 3 ? rng.int(1, 3) : 0;
  const W = w1 + w2;
  const value = rat(W * L + s, L);
  const answer = fracAns(value, "reduced");
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_ADD_DENOMINATORS", fracAns(rat(W * (a + b) + x + y, a + b)), answer, `분모끼리 더하면 안 돼요. 분모 ${withJosa(a, "과/와")} ${b}의 최소공배수로 통분한 다음 분자끼리 더해요.`);
  const fracPart = [
    `분모 ${withJosa(a, "과/와")} ${b}의 최소공배수 ${withJosa(L, "으로/로")} 통분해요.`,
    `${fm(x, a)} + ${fm(y, b)} = ${fm(xs, L)} + ${fm(ys, L)} = ${fm(s, L)}`,
  ];
  const steps =
    W === 0
      ? [...fracPart, ...simplifySteps(s, L, rat(s, L)), `답: ${fr(value)}`]
      : [`자연수끼리 더해요: ${w1} + ${w2} = ${W}`, ...fracPart, `${W} + ${fr(rat(s, L))} = ${fr(value)}`, `답: ${fr(value)}`];
  return {
    prompt: `${fm(x, a, w1)} + ${fm(y, b, w2)} = □`,
    instruction: REDUCED,
    answer,
    bugs,
    steps,
    story: { kind: "qty-add", a: fm(x, a, w1), b: fm(y, b, w2), unit },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "add", a: mixedE(w1, x, a), b: mixedE(w2, y, b) },
  };
};

export const genFracDiffDenSub: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  for (;;) {
    const [a, b] = pickDens(rng, difficulty);
    const x = coprimeNumerator(rng, a);
    const y = coprimeNumerator(rng, b);
    const L = lcm(a, b);
    const xs = (x * L) / a;
    const ys = (y * L) / b;
    if (difficulty <= 2) {
      if (xs <= ys) continue;
      const value = rat(xs - ys, L);
      const answer = fracAns(value, "reduced");
      const bugs: GeneratedItem["bugs"] = [];
      if (a > b && x >= y) {
        pushBug(bugs, "FRAC_SUB_DENOMINATORS", fracAns(rat(x - y, a - b)), answer, "분모끼리 빼면 안 돼요. 먼저 통분해서 분모를 같게 만든 다음 분자끼리 빼요.");
      }
      return {
        prompt: `${fm(x, a)} − ${fm(y, b)} = □`,
        instruction: REDUCED,
        answer,
        bugs,
        steps: [
          `분모 ${withJosa(a, "과/와")} ${b}의 최소공배수 ${withJosa(L, "으로/로")} 통분해요.`,
          `${fm(x, a)} − ${fm(y, b)} = ${fm(xs, L)} − ${fm(ys, L)} = ${fm(xs - ys, L)}`,
          ...simplifySteps(xs - ys, L, value),
          `답: ${fr(value)}`,
        ],
        story: { kind: "qty-sub", a: fm(x, a), b: fm(y, b), unit },
        guessRate: SHORT_ANSWER_GUESS,
        check: { k: "sub", a: ratE(x, a), b: ratE(y, b) },
      };
    }
    if (xs >= ys) continue; // force a borrow from the whole part
    const w1 = rng.int(2, 4);
    const w2 = rng.int(1, w1 - 1);
    const top = w1 * L + xs;
    const bottom = w2 * L + ys;
    const value = rat(top - bottom, L);
    return {
      prompt: `${fm(x, a, w1)} − ${fm(y, b, w2)} = □`,
      instruction: REDUCED,
      answer: fracAns(value, "reduced"),
      bugs: [],
      steps: [
        `분모를 ${withJosa(L, "으로/로")} 통분해요: ${fm(xs, L, w1)} − ${fm(ys, L, w2)}`,
        `분자 ${xs}에서 ${withJosa(ys, "을/를")} 뺄 수 없으니 자연수에서 1을 받아내려요: ${fm(xs, L, w1)} = ${fm(xs + L, L, w1 - 1)}`,
        `${fm(xs + L, L, w1 - 1)} − ${fm(ys, L, w2)} = ${mixedRaw(top - bottom, L)}`,
        `답: ${fr(value)}`,
      ],
      story: { kind: "qty-sub", a: fm(x, a, w1), b: fm(y, b, w2), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "sub", a: mixedE(w1, x, a), b: mixedE(w2, y, b) },
    };
  }
};

export const genFracMul: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  if (difficulty === 1) {
    const { num: x, den: a } = properPair(rng, 3, 9);
    const k = rng.int(2, 6);
    const value = rat(x * k, a);
    const answer = fracAns(value, "reduced");
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "FRAC_MUL_WHOLE_TO_BOTH", fracAns(rat(x * k, a * k)), answer, `${fm(x, a)} × ${k}${josa(k, "은/는")} ${withJosa(fm(x, a), "을/를")} ${k}번 더한 거예요. 분자에만 ${withJosa(k, "을/를")} 곱해요.`);
    return {
      prompt: `${fm(x, a)} × ${k} = □`,
      instruction: REDUCED,
      answer,
      bugs,
      steps: [`분자에 자연수를 곱해요: ${x} × ${k} = ${x * k}`, `${fm(x, a)} × ${k} = ${fm(x * k, a)}`, ...simplifySteps(x * k, a, value), `답: ${fr(value)}`],
      story: { kind: "qty-mul-rate", rate: fm(x, a), times: String(k), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: ratE(x, a), b: num(k) },
    };
  }
  if (difficulty === 2) {
    const { num: x, den: a } = properPair(rng, 2, 9);
    const { num: y, den: b } = properPair(rng, 2, 9);
    const value = rat(x * y, a * b);
    return {
      prompt: `${fm(x, a)} × ${fm(y, b)} = □`,
      instruction: REDUCED,
      answer: fracAns(value, "reduced"),
      bugs: [],
      steps: [`분자끼리, 분모끼리 곱해요: ${fm(x, a)} × ${fm(y, b)} = ${fm(x * y, a * b)}`, ...simplifySteps(x * y, a * b, value), `답: ${fr(value)}`],
      story: { kind: "qty-frac-of", total: fm(x, a), frac: fm(y, b), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: ratE(x, a), b: ratE(y, b) },
    };
  }
  const { num: n1, den: d1 } = properPair(rng, 2, 5);
  const { num: n2, den: d2 } = properPair(rng, 2, 5);
  const w1 = rng.int(1, 2);
  const w2 = rng.int(1, 3);
  const N1 = w1 * d1 + n1;
  const N2 = w2 * d2 + n2;
  const value = rat(N1 * N2, d1 * d2);
  const answer = fracAns(value, "reduced");
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_MUL_MIXED_PARTS", fracAns(rat(w1 * w2 * d1 * d2 + n1 * n2, d1 * d2)), answer, "자연수끼리, 분수끼리 따로 곱하면 빠지는 부분이 생겨요. 대분수를 가분수로 바꾼 다음 곱해 보세요.");
  return {
    prompt: `${fm(n1, d1, w1)} × ${fm(n2, d2, w2)} = □`,
    instruction: REDUCED,
    answer,
    bugs,
    steps: [
      `대분수를 가분수로 바꿔요: ${fm(n1, d1, w1)} = ${fm(N1, d1)}, ${fm(n2, d2, w2)} = ${fm(N2, d2)}`,
      `${fm(N1, d1)} × ${fm(N2, d2)} = ${fm(N1 * N2, d1 * d2)}`,
      ...simplifySteps(N1 * N2, d1 * d2, value),
      `답: ${fr(value)}`,
    ],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: mixedE(w1, n1, d1), b: mixedE(w2, n2, d2) },
  };
};

export const genFracDivNat: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  if (difficulty === 1) {
    const b = rng.int(2, 9);
    const a = rng.int(1, 9);
    if (a === b) return genFracDivNat(rng, difficulty);
    const answer = fracAns(rat(a, b));
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "FRAC_DIV_INVERTED", fracAns(rat(b, a)), answer, "나누어지는 수가 분자, 나누는 수가 분모가 돼요.");
    return {
      prompt: `${a} ÷ ${b}의 몫을 분수로 나타내세요.`,
      answer,
      bugs,
      steps: [`${a} ÷ ${b}${josa(b, "은/는")} ${withJosa(a, "을/를")} ${withJosa(b, "으로/로")} 똑같이 나눈 것 중의 하나예요.`, `${a} ÷ ${b} = ${fm(a, b)}`],
      story: { kind: "qty-div-share", total: String(a), parts: b, unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "div", a: num(a), b: num(b) },
    };
  }
  const k = rng.int(2, 4);
  const a = rng.int(5, 12);
  const divisible = difficulty === 2;
  let x: number;
  if (divisible) {
    const q = rng.int(1, Math.max(1, Math.floor((a - 1) / k)));
    x = q * k;
  } else {
    x = rng.int(1, a - 1);
    if (x % k === 0) x = x === 1 ? 1 : x - 1;
    if (x % k === 0) x = 1;
  }
  if (x >= a || x < 1) return genFracDivNat(rng, difficulty);
  const value = rat(x, a * k);
  const answer = fracAns(value, "reduced");
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_DIV_MULTIPLIED", fracAns(rat(x * k, a)), answer, "나누면 크기가 작아져야 해요. 자연수로 나누는 것은 그 자연수분의 1을 곱하는 것과 같아요.");
  const steps = divisible
    ? [`분자 ${withJosa(x, "을/를")} ${withJosa(k, "으로/로")} 나누어요: ${x} ÷ ${k} = ${x / k}`, `${fm(x, a)} ÷ ${k} = ${fm(x / k, a)}`, ...simplifySteps(x / k, a, value), `답: ${fr(value)}`]
    : [`÷ ${k}${josa(k, "은/는")} × ${withJosa(fm(1, k), "과/와")} 같아요.`, `${fm(x, a)} × ${fm(1, k)} = ${fm(x, a * k)}`, ...simplifySteps(x, a * k, value), `답: ${fr(value)}`];
  return {
    prompt: `${fm(x, a)} ÷ ${k} = □`,
    instruction: REDUCED,
    answer,
    bugs,
    steps,
    story: { kind: "qty-div-share", total: fm(x, a), parts: k, unit },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "div", a: ratE(x, a), b: num(k) },
  };
};

export const genFracDivFrac: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  let dividend: { n: number; d: number; w: number };
  let divisor: { n: number; d: number };
  if (difficulty === 1) {
    const den = rng.int(5, 12);
    const y = rng.int(1, 3);
    const q = rng.int(2, Math.max(2, Math.floor((den - 1) / y)));
    if (y * q >= den) return genFracDivFrac(rng, difficulty);
    dividend = { n: y * q, d: den, w: 0 };
    divisor = { n: y, d: den };
  } else if (difficulty === 2) {
    const p = properPair(rng, 2, 9);
    const r = properPair(rng, 2, 9);
    dividend = { n: p.num, d: p.den, w: 0 };
    divisor = { n: r.num, d: r.den };
  } else {
    const p = properPair(rng, 2, 6);
    const r = properPair(rng, 2, 6);
    dividend = { n: p.num, d: p.den, w: rng.int(1, 3) };
    divisor = { n: r.num, d: r.den };
  }
  const N = dividend.w * dividend.d + dividend.n;
  const value = rat(N * divisor.d, dividend.d * divisor.n);
  const answer = fracAns(value, "reduced");
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "FRAC_DIV_NO_INVERT", fracAns(rat(N * divisor.n, dividend.d * divisor.d)), answer, `분수로 나눌 때는 나누는 분수 ${fm(divisor.n, divisor.d)}의 분모와 분자를 바꾸어 곱해요.`);
  pushBug(bugs, "FRAC_DIV_INVERT_WRONG", fracAns(rat(dividend.d * divisor.n, N * divisor.d)), answer, "분모와 분자를 바꾸는 것은 ÷ 뒤의 나누는 분수예요. 앞의 분수는 그대로 두어요.");
  const first = dividend.w ? fm(N, dividend.d) : fm(dividend.n, dividend.d);
  const steps = [
    ...(dividend.w ? [`대분수를 가분수로 바꿔요: ${fm(dividend.n, dividend.d, dividend.w)} = ${first}`] : []),
    `나누는 분수 ${fm(divisor.n, divisor.d)}의 분모와 분자를 바꾸어 곱해요.`,
    `${first} ÷ ${fm(divisor.n, divisor.d)} = ${first} × ${fm(divisor.d, divisor.n)} = ${fm(N * divisor.d, dividend.d * divisor.n)}`,
    ...simplifySteps(N * divisor.d, dividend.d * divisor.n, value),
    `답: ${fr(value)}`,
  ];
  return {
    prompt: `${fm(dividend.n, dividend.d, dividend.w)} ÷ ${fm(divisor.n, divisor.d)} = □`,
    instruction: REDUCED,
    answer,
    bugs,
    steps,
    story: value.d === 1 ? { kind: "qty-div-group", total: fm(dividend.n, dividend.d, dividend.w), size: fm(divisor.n, divisor.d), unit } : undefined,
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "div", a: mixedE(dividend.w, dividend.n, dividend.d), b: ratE(divisor.n, divisor.d) },
  };
};
