/** Generators for the 소수 strand. */
import { decimalPlaces, mul as rmul, rat, toDecimalString, type Rational } from "../../math/rational";
import { josa, withJosa } from "../../math/korean";
import type { Rng } from "../../math/rng";
import {
  additionSteps,
  addNoCarry,
  cmpAns,
  COMPARE_GUESS,
  decAns,
  flipSymbol,
  pushBug,
  SHORT_ANSWER_GUESS,
  subSmallerFromLarger,
  subtractionSteps,
} from "../helpers";
import type { CompareSymbol, Expr, GeneratedItem, QuantityUnit } from "../types";
import { COMPARE_INSTRUCTION, type Generator } from "./number";
import { fm } from "./fraction";

const UNITS: QuantityUnit[] = ["L", "kg", "m"];
const num = (v: number | Rational): Expr => ({ k: "num", v });

/** Decimal text: 2.5, 0.35, 3. */
export function dt(r: Rational): string {
  const s = toDecimalString(r);
  if (s === null) throw new Error("not a terminating decimal");
  return s;
}

/** Decimal text padded to exactly `places` digits after the point: (2.8, 2) → "2.80". */
export function dtPad(r: Rational, places: number): string {
  const digits = String(Math.round((r.n * 10 ** places) / r.d)).padStart(places + 1, "0");
  if (places === 0) return digits;
  return `${digits.slice(0, -places)}.${digits.slice(-places)}`;
}

function places(r: Rational): number {
  return decimalPlaces(r) ?? 0;
}

function scaledInt(r: Rational, p: number): number {
  return Math.round((r.n * 10 ** p) / r.d);
}

function placeNames(p: number): string[] {
  const frac = ["소수 첫째 자리", "소수 둘째 자리", "소수 셋째 자리"].slice(0, p).reverse();
  return [...frac, "일의 자리", "십의 자리", "백의 자리", "천의 자리"];
}

function cmpSym(a: Rational, b: Rational): CompareSymbol {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l < r ? "<" : l > r ? ">" : "=";
}

export const genDecTenths: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const k = rng.int(1, 9);
    const v = rat(k, 10);
    return {
      prompt: `0.1이 ${k}개인 수는 얼마일까요?`,
      answer: decAns(v),
      bugs: [],
      steps: [`0.1이 ${k}개이면 ${withJosa(dt(v), "이에요/예요")}.`],
      visual: { type: "fraction-bar", parts: 10, shaded: k },
      showVisual: true,
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: num(rat(1, 10)), b: num(k) },
    };
  }
  if (difficulty === 2) {
    const k = rng.int(1, 9);
    if (rng.bool()) {
      return {
        prompt: `${withJosa(fm(k, 10), "을/를")} 소수로 나타내세요.`,
        answer: decAns(rat(k, 10)),
        bugs: [],
        steps: [`${withJosa(fm(1, 10), "은/는")} 0.1이에요.`, `${withJosa(fm(k, 10), "은/는")} 0.1이 ${k}개이니까 ${dt(rat(k, 10))}`],
        visual: { type: "fraction-bar", parts: 10, shaded: k },
        guessRate: SHORT_ANSWER_GUESS,
        check: { k: "div", a: num(k), b: num(10) },
      };
    }
    const w = rng.int(1, 9);
    const v = rat(w * 10 + k, 10);
    return {
      prompt: `1이 ${w}개, 0.1이 ${k}개인 수는 얼마일까요?`,
      answer: decAns(v),
      bugs: [],
      steps: [`1이 ${w}개 → ${w}`, `0.1이 ${k}개 → 0.${k}`, `${w} + 0.${k} = ${dt(v)}`],
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "add", a: num(w), b: { k: "mul", a: num(rat(1, 10)), b: num(k) } },
    };
  }
  let k = rng.int(11, 39);
  if (k % 10 === 0) k += 1;
  const v = rat(k, 10);
  const answer = decAns(v);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "DEC_PLACE_VALUE", decAns(rat(k, 100)), answer, "0.1이 10개이면 1이에요. 0.1이 10개보다 많으면 자연수 부분이 생겨요.");
  return {
    prompt: `0.1이 ${k}개인 수는 얼마일까요?`,
    answer,
    bugs,
    steps: ["0.1이 10개이면 1이에요.", `0.1이 ${k}개는 1이 ${Math.floor(k / 10)}개와 0.1이 ${k % 10}개예요.`, `그래서 ${dt(v)}`],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: num(rat(1, 10)), b: num(k) },
  };
};

export const genDecHundredths: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    let k = rng.int(11, 99);
    if (k % 10 === 0) k += 1;
    const v = rat(k, 100);
    const answer = decAns(v);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "DEC_PLACE_VALUE", decAns(rat(k, 10)), answer, "0.01은 0.1을 10으로 나눈 수예요. 0.01이 100개여야 1이 돼요.");
    return {
      prompt: `0.01이 ${k}개인 수는 얼마일까요?`,
      answer,
      bugs,
      steps: ["0.01이 10개이면 0.1, 100개이면 1이에요.", `0.01이 ${k}개는 0.1이 ${Math.floor(k / 10)}개와 0.01이 ${k % 10}개 → ${dt(v)}`],
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: num(rat(1, 100)), b: num(k) },
    };
  }
  if (difficulty === 2) {
    const w = rng.int(0, 3);
    const c = rng.int(2, 9);
    const a = rng.int(0, c - 1);
    const b = rng.int(1, 9);
    const longer = rat(w * 100 + a * 10 + b, 100);
    const shorter = rat(w * 10 + c, 10);
    const [left, right] = rng.bool() ? [longer, shorter] : [shorter, longer];
    const sym = cmpSym(left, right);
    const answer = cmpAns(sym);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "DEC_LONGER_IS_BIGGER", cmpAns(flipSymbol(sym)), answer, "소수점 아래 숫자가 많다고 큰 수가 아니에요. 소수 첫째 자리부터 차례로 비교해요.");
    return {
      prompt: `${dt(left)} ○ ${dt(right)}`,
      instruction: COMPARE_INSTRUCTION,
      answer,
      bugs,
      steps: [
        `자연수 부분이 같으니 소수 첫째 자리를 비교해요: ${dt(longer)}의 ${a}, ${dt(shorter)}의 ${c}`,
        `${a} < ${c}이니까 ${dt(longer)} < ${dt(shorter)}`,
        `답: ${dt(left)} ${sym} ${dt(right)}`,
      ],
      guessRate: COMPARE_GUESS,
      check: { k: "cmp", a: num(left), b: num(right) },
    };
  }
  const digits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4);
  const [w, a, b, c] = digits;
  const n = rat(w * 1000 + a * 100 + b * 10 + c, 1000);
  const askThousandths = rng.bool();
  const digit = askThousandths ? c : b;
  const value = askThousandths ? rat(c, 1000) : rat(b, 100);
  const answer = decAns(value);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "DEC_PLACE_VALUE", decAns(rmul(value, rat(10))), answer, `숫자 ${digit}${josa(digit, "이/가")} 소수 몇째 자리에 있는지 다시 세어 보세요. 소수 첫째 자리는 0.1, 둘째 자리는 0.01, 셋째 자리는 0.001이 몇 개인지 나타내요.`);
  return {
    prompt: `${dt(n)}에서 숫자 ${digit}${josa(digit, "이/가")} 나타내는 값은 얼마일까요?`,
    answer,
    bugs,
    steps: [`숫자 ${digit}${josa(digit, "은/는")} 소수 ${askThousandths ? "셋째" : "둘째"} 자리에 있어요.`, `그래서 ${dt(askThousandths ? rat(1, 1000) : rat(1, 100))}이 ${digit}개 → ${dt(value)}`],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "digit-value", n, digit },
  };
};

function tenths(rng: Rng, min: number, max: number): number {
  let v = rng.int(min, max);
  if (v % 10 === 0) v += 1;
  return v;
}

export const genDecAdd: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  for (;;) {
    let a: Rational;
    let b: Rational;
    if (difficulty <= 2) {
      const x = rng.int(1, 8);
      const u = rng.int(1, 9 - x);
      const y = rng.int(1, 9);
      const v = rng.int(1, 9);
      if (difficulty === 1 && y + v >= 10) continue;
      if (difficulty === 2 && y + v < 10) continue;
      a = rat(x * 10 + y, 10);
      b = rat(u * 10 + v, 10);
    } else {
      a = rat(tenths(rng, 11, 89), 10);
      b = rat(rng.int(101, 899), 100);
      if (b.d !== 100 && rng.bool()) continue;
      if (rng.bool()) [a, b] = [b, a];
    }
    const P = Math.max(places(a), places(b));
    const A = scaledInt(a, P);
    const B = scaledInt(b, P);
    const sum = rat(A + B, 10 ** P);
    const answer = decAns(sum);
    const bugs: GeneratedItem["bugs"] = [];
    if (places(a) !== places(b)) {
      const wrong = scaledInt(a, places(a)) + scaledInt(b, places(b));
      pushBug(bugs, "DEC_ALIGN_RIGHT", decAns(rat(wrong, 10 ** P)), answer, "소수를 더할 때는 끝자리가 아니라 소수점끼리 맞추어야 해요. 모자란 자리에 0을 채워 자릿수를 맞춰 보세요.");
    }
    const nc = addNoCarry(A, B);
    if (nc !== null) pushBug(bugs, "ADD_NO_CARRY", decAns(rat(nc, 10 ** P)), answer, "같은 자리끼리 더한 값이 10을 넘으면 윗자리로 받아올려야 해요.");
    return {
      prompt: `${dt(a)} + ${dt(b)} = □`,
      answer,
      bugs,
      steps: [`소수점끼리 맞추어 써요: ${dtPad(a, P)} + ${dtPad(b, P)}`, ...additionSteps(A, B, placeNames(P)), `답: ${dt(sum)}`],
      story: { kind: "qty-add", a: dt(a), b: dt(b), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "add", a: num(a), b: num(b) },
    };
  }
};

export const genDecSub: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  for (;;) {
    let a: Rational;
    let b: Rational;
    if (difficulty <= 2) {
      const x = rng.int(2, 9);
      const u = rng.int(1, x - 1);
      const y = rng.int(0, 9);
      const v = rng.int(1, 9);
      if (difficulty === 1 && y < v) continue;
      if (difficulty === 2 && y >= v) continue;
      a = rat(x * 10 + y, 10);
      b = rat(u * 10 + v, 10);
    } else {
      if (rng.bool()) {
        a = rat(rng.int(201, 999), 100);
        b = rat(tenths(rng, 11, 89), 10);
      } else {
        a = rat(tenths(rng, 21, 99), 10);
        b = rat(rng.int(101, 899), 100);
      }
      if (a.d === b.d) continue;
    }
    const P = Math.max(places(a), places(b));
    const A = scaledInt(a, P);
    const B = scaledInt(b, P);
    if (A <= B) continue;
    const diff = rat(A - B, 10 ** P);
    const answer = decAns(diff);
    const bugs: GeneratedItem["bugs"] = [];
    if (places(a) !== places(b)) {
      const wrong = scaledInt(a, places(a)) - scaledInt(b, places(b));
      if (wrong >= 0) pushBug(bugs, "DEC_ALIGN_RIGHT", decAns(rat(wrong, 10 ** P)), answer, "소수를 뺄 때는 끝자리가 아니라 소수점끼리 맞추어야 해요. 모자란 자리에 0을 채워 자릿수를 맞춰 보세요.");
    }
    const sl = subSmallerFromLarger(A, B);
    if (sl !== null) pushBug(bugs, "SUB_SMALLER_FROM_LARGER", decAns(rat(sl, 10 ** P)), answer, "위의 숫자가 작은 자리에서는 아래 숫자에서 위의 숫자를 빼면 안 돼요. 윗자리에서 받아내려 계산해요.");
    return {
      prompt: `${dt(a)} − ${dt(b)} = □`,
      answer,
      bugs,
      steps: [`소수점끼리 맞추어 써요: ${dtPad(a, P)} − ${dtPad(b, P)}`, ...subtractionSteps(A, B, placeNames(P)), `답: ${dt(diff)}`],
      story: { kind: "qty-sub", a: dt(a), b: dt(b), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "sub", a: num(a), b: num(b) },
    };
  }
};

export const genDecMul: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  if (difficulty === 1) {
    const twoPlaces = rng.bool(0.3);
    const m = twoPlaces ? rng.int(101, 499) : tenths(rng, 2, 99);
    const a = rat(m, twoPlaces ? 100 : 10);
    const k = rng.int(2, 9);
    const product = rmul(a, rat(k));
    const pa = places(a);
    return {
      prompt: `${dt(a)} × ${k} = □`,
      answer: decAns(product),
      bugs: [],
      steps: [
        `소수점을 생각하지 않고 곱해요: ${scaledInt(a, pa)} × ${k} = ${scaledInt(a, pa) * k}`,
        `${dt(a)}${josa(dt(a), "은/는")} 소수 ${pa}자리 수이니까 곱도 소수 ${pa}자리로 나타내요: ${dtPad(product, pa)}`,
        ...(dtPad(product, pa) !== dt(product) ? [`소수점 아래 끝자리의 0은 생략해요: ${dt(product)}`] : []),
        `답: ${dt(product)}`,
      ],
      story: { kind: "qty-mul-rate", rate: dt(a), times: String(k), unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: num(a), b: num(k) },
    };
  }
  const [m1, d1, m2, d2] = difficulty === 2 ? [tenths(rng, 11, 99), 10, tenths(rng, 11, 49), 10] : [rng.int(1, 9), 100, rng.int(1, 9), 10];
  const a = rat(m1, d1);
  const b = rat(m2, d2);
  const product = rmul(a, b);
  const pa = places(a);
  const pb = places(b);
  const raw = scaledInt(a, pa) * scaledInt(b, pb);
  const answer = decAns(product);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "DEC_MUL_POINT", decAns(rat(raw, 10 ** Math.max(pa, pb))), answer, `소수끼리 곱하면 소수점 아래 자리 수를 더한 만큼(${pa} + ${pb} = ${pa + pb}자리) 소수점 아래 자리가 생겨요.`);
  return {
    prompt: `${dt(a)} × ${dt(b)} = □`,
    answer,
    bugs,
    steps: [
      `소수점을 생각하지 않고 곱해요: ${scaledInt(a, pa)} × ${scaledInt(b, pb)} = ${raw}`,
      `소수점 아래 자리 수를 더해요: ${pa} + ${pb} = ${pa + pb}자리`,
      `${raw}에서 소수점 아래 ${pa + pb}자리가 되도록 소수점을 찍어요: ${dtPad(product, pa + pb)}`,
      ...(dtPad(product, pa + pb) !== dt(product) ? [`소수점 아래 끝자리의 0은 생략해요: ${dt(product)}`] : []),
      `답: ${dt(product)}`,
    ],
    story: difficulty === 2 ? { kind: "qty-mul-rate", rate: dt(a), times: dt(b), unit } : undefined,
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: num(a), b: num(b) },
  };
};

export const genDecDivNat: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  for (;;) {
    const k = rng.int(2, 9);
    let q: Rational;
    if (difficulty === 1) q = rat(tenths(rng, 11, 49), 10);
    else if (difficulty === 2) q = rat(rng.int(1, 9), 10);
    else {
      const m = rng.int(11, 99);
      if (m % 10 === 0 || (m * k) % 10 !== 0) continue;
      q = rat(m, 100);
    }
    const a = rmul(q, rat(k));
    const P = places(q);
    const pa = places(a);
    if (pa !== 1) continue;
    const A = scaledInt(a, P);
    const Q = scaledInt(q, P);
    const answer = decAns(q);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "DEC_DIV_IGNORE_POINT", decAns(rmul(q, rat(10))), answer, `몫에도 소수점을 찍어야 해요. ${dt(a)}${josa(dt(a), "을/를")} ${withJosa(k, "으로/로")} 나눈 몫이 ${dt(a)}보다 클 수 있는지 생각해 보세요.`);
    return {
      prompt: `${dt(a)} ÷ ${k} = □`,
      answer,
      bugs,
      steps: [
        ...(P > pa ? [`나누어떨어지지 않으면 0을 붙여 계산해요: ${dt(a)} = ${dtPad(a, P)}`] : []),
        `자연수의 나눗셈처럼 계산해요: ${A} ÷ ${k} = ${Q}`,
        `${dtPad(a, P)}${josa(dtPad(a, P), "은/는")} ${A}의 ${fm(1, 10 ** P)}이니까 몫도 ${fm(1, 10 ** P)} → ${dt(q)}`,
      ],
      story: { kind: "qty-div-share", total: dt(a), parts: k, unit },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "div", a: num(a), b: num(k) },
    };
  }
};

export const genDecDivDec: Generator = (rng, difficulty) => {
  const unit = rng.pick(UNITS);
  for (;;) {
    let q: Rational;
    let b: Rational;
    if (difficulty === 1) {
      q = rat(rng.int(2, 9));
      b = rat(rng.int(2, 9), 10);
    } else if (difficulty === 2) {
      q = rat(tenths(rng, 11, 49), 10);
      b = rat(tenths(rng, 11, 49), 10);
    } else {
      const m = rng.int(2, 9);
      const qi = rng.int(11, 40);
      if ((qi * m) % 10 !== 0) continue;
      q = rat(qi);
      b = rat(m, 10);
    }
    const a = rmul(q, b);
    if (places(a) > 2) continue;
    const a10 = rmul(a, rat(10));
    const b10 = rmul(b, rat(10));
    const answer = decAns(q);
    const bugs: GeneratedItem["bugs"] = [];
    pushBug(bugs, "DEC_DIV_POINT", decAns(rmul(q, rat(1, 10))), answer, "나누는 수와 나누어지는 수의 소수점을 똑같이 옮기면 몫은 그대로예요. 몫의 소수점을 다시 확인해 보세요.");
    return {
      prompt: `${dt(a)} ÷ ${dt(b)} = □`,
      answer,
      bugs,
      steps: [
        `나누는 수 ${dt(b)}${josa(dt(b), "이/가")} 자연수가 되도록 두 수에 10을 곱해요: ${dt(a)} ÷ ${dt(b)} = ${dt(a10)} ÷ ${dt(b10)}`,
        `${dt(a10)} ÷ ${dt(b10)} = ${dt(q)}`,
        `답: ${dt(q)}`,
      ],
      story: q.d === 1 ? { kind: "qty-div-group", total: dt(a), size: dt(b), unit } : undefined,
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "div", a: num(a), b: num(b) },
    };
  }
};
