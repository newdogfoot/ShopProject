/** Generators for the 곱셈 and 나눗셈 strands. */
import { josa, withJosa } from "../../math/korean";
import type { Rng } from "../../math/rng";
import {
  digitsOf,
  intAns,
  longDivisionSteps,
  mulCarryWrongOrder,
  mulNoCarry,
  mulOnlySamePlace,
  pushBug,
  qrAns,
  SHORT_ANSWER_GUESS,
} from "../helpers";
import type { GeneratedItem } from "../types";
import type { Generator } from "./number";

const n = (v: number) => ({ k: "num" as const, v });

function mulBug(bugs: GeneratedItem["bugs"], a: number, b: number, answer: GeneratedItem["answer"]): void {
  pushBug(bugs, "MUL_ADDED_INSTEAD", intAns(a + b), answer, `${a} × ${b}${josa(b, "은/는")} ${withJosa(a, "을/를")} ${b}번 더한 수예요. 두 수를 한 번 더하는 것과 달라요.`);
}

export const genMulMeaning: Generator = (rng, difficulty) => {
  const each = rng.int(2, 5);
  const groups = rng.int(2, 5);
  const product = each * groups;
  const answer = intAns(product);
  const repeated = Array.from({ length: groups }, () => each).join(" + ");
  if (difficulty === 1) {
    const bugs: GeneratedItem["bugs"] = [];
    mulBug(bugs, each, groups, answer);
    return {
      prompt: `${each}씩 ${groups}묶음은 모두 몇 개일까요?`,
      answer,
      bugs,
      steps: [`${each}씩 ${groups}묶음은 ${withJosa(each, "을/를")} ${groups}번 더한 거예요: ${repeated} = ${product}`, `곱셈식으로 ${each} × ${groups} = ${product}`],
      visual: { type: "dots", count: product, groupSize: each },
      showVisual: true,
      story: { kind: "mul-groups", groups, each },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: n(each), b: n(groups) },
    };
  }
  if (difficulty === 2) {
    const bugs: GeneratedItem["bugs"] = [];
    mulBug(bugs, each, groups, answer);
    return {
      prompt: `${each}의 ${groups}배는 얼마일까요?`,
      answer,
      bugs,
      steps: [`${each}의 ${groups}배는 ${withJosa(each, "을/를")} ${groups}번 더한 수예요: ${repeated} = ${product}`, `${each} × ${groups} = ${product}`],
      visual: { type: "array", rows: groups, cols: each },
      story: { kind: "mul-groups", groups, each },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: n(each), b: n(groups) },
    };
  }
  return {
    prompt: `${repeated}${josa(each, "을/를")} 곱셈식으로 나타내면 ${each} × □예요. □ 안에 알맞은 수는?`,
    answer: intAns(groups),
    bugs: [],
    steps: [`${withJosa(each, "을/를")} 몇 번 더했는지 세어요: ${groups}번`, `그래서 ${repeated} = ${each} × ${groups}`],
    visual: { type: "array", rows: groups, cols: each },
    guessRate: 0.1,
    check: { k: "div", a: n(product), b: n(each) },
  };
};

const TABLES: Record<1 | 2 | 3, number[]> = { 1: [2, 5], 2: [3, 4, 6], 3: [7, 8, 9] };

export const genMulFacts: Generator = (rng, difficulty) => {
  const a = rng.pick(TABLES[difficulty]);
  const b = rng.int(2, 9);
  const [x, y] = rng.bool() ? [a, b] : [b, a];
  const product = x * y;
  const answer = intAns(product);
  const bugs: GeneratedItem["bugs"] = [];
  mulBug(bugs, x, y, answer);
  return {
    prompt: `${x} × ${y} = □`,
    answer,
    bugs,
    steps: [`${x} × ${y}${josa(y, "은/는")} ${withJosa(x, "을/를")} ${y}번 더한 수예요.`, `${x} × ${y - 1} = ${x * (y - 1)}에 ${withJosa(x, "을/를")} 더하면 ${product}`, `답: ${product}`],
    visual: { type: "array", rows: y, cols: x },
    story: { kind: "mul-groups", groups: y, each: x },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: n(x), b: n(y) },
  };
};

function nBy1Steps(a: number, m: number): string[] {
  const ds = digitsOf(a);
  const places = ["일", "십", "백", "천"];
  const steps: string[] = [];
  let carry = 0;
  for (let i = 0; i < ds.length; i++) {
    const p = ds[i] * m;
    const total = p + carry;
    const carryText = carry ? `, 올린 ${withJosa(carry, "을/를")} 더하면 ${total}` : "";
    if (i < ds.length - 1 && total >= 10) {
      steps.push(`${places[i]}의 자리: ${ds[i]} × ${m} = ${p}${carryText} → ${withJosa(total % 10, "을/를")} 쓰고 ${withJosa(Math.floor(total / 10), "을/를")} 올려요.`);
      carry = Math.floor(total / 10);
    } else {
      steps.push(`${places[i]}의 자리: ${ds[i]} × ${m} = ${p}${carryText}`);
      carry = 0;
    }
  }
  steps.push(`답: ${a * m}`);
  return steps;
}

export const genMulNBy1: Generator = (rng, difficulty) => {
  for (;;) {
    const a = difficulty === 3 ? rng.int(101, 499) : rng.int(11, 49);
    const m = rng.int(2, 9);
    if (a % 10 === 0) continue;
    const ds = digitsOf(a);
    const hasCarry = mulNoCarry(a, m) !== a * m;
    if (difficulty === 1 && ds.some((d) => d * m >= 10)) continue;
    if (difficulty >= 2 && !hasCarry) continue;
    const product = a * m;
    const answer = intAns(product);
    const bugs: GeneratedItem["bugs"] = [];
    const nc = mulNoCarry(a, m);
    if (nc !== null) pushBug(bugs, "MUL_NO_CARRY", intAns(nc), answer, "자리별 곱이 10을 넘으면 윗자리로 올려야 해요. 올린 수를 다음 자리 곱에 더했는지 확인해 보세요.");
    const wo = mulCarryWrongOrder(a, m);
    if (wo !== null) pushBug(bugs, "MUL_CARRY_WRONG_ORDER", intAns(wo), answer, "올린 수는 곱한 다음에 더해요. 윗자리 숫자에 먼저 더하고 곱하면 안 돼요.");
    return {
      prompt: `${a} × ${m} = □`,
      answer,
      bugs,
      steps: nBy1Steps(a, m),
      story: { kind: "mul-groups", groups: m, each: a },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "mul", a: n(a), b: n(m) },
    };
  }
};

export const genMulNBy2: Generator = (rng, difficulty) => {
  let a = difficulty === 1 ? rng.int(11, 19) : difficulty === 2 ? rng.int(21, 89) : rng.int(101, 399);
  let b = difficulty === 1 ? rng.int(11, 19) : rng.int(12, 49);
  if (a % 10 === 0) a += 1;
  if (b % 10 === 0) b += 1;
  const product = a * b;
  const bo = b % 10;
  const bt = Math.floor(b / 10);
  const answer = intAns(product);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "MUL_PARTIAL_NO_SHIFT", intAns(a * bo + a * bt), answer, `${b}의 십의 자리 ${withJosa(bt, "은/는")} 사실 ${withJosa(bt * 10, "이에요/예요")}. ${a} × ${withJosa(bt * 10, "을/를")} 계산해서 자리에 맞춰 더해 보세요.`);
  const sp = mulOnlySamePlace(a, b);
  if (sp !== null) pushBug(bugs, "MUL_ONLY_SAME_PLACE", intAns(sp), answer, `곱셈은 같은 자리끼리만 곱하지 않아요. ${a} × ${withJosa(bo, "과/와")} ${a} × ${withJosa(bt * 10, "을/를")} 각각 구해서 더해요.`);
  return {
    prompt: `${a} × ${b} = □`,
    answer,
    bugs,
    steps: [
      `${a} × ${bo} = ${a * bo}`,
      `${a} × ${bt * 10} = ${a * bt * 10} (십의 자리를 곱하니 한 칸 왼쪽에 써요)`,
      `${a * bo} + ${a * bt * 10} = ${product}`,
    ],
    story: { kind: "mul-groups", groups: b, each: a },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "mul", a: n(a), b: n(b) },
  };
};

function divConfusionBugs(bugs: GeneratedItem["bugs"], a: number, d: number, answer: GeneratedItem["answer"]): void {
  const fb = `${a} ÷ ${d}${josa(d, "은/는")} ${withJosa(a, "을/를")} ${d}묶음으로 똑같이 나누면 한 묶음이 몇인지 묻는 거예요. ${d} × □ = ${withJosa(a, "이/가")} 되는 수를 찾아보세요.`;
  pushBug(bugs, "DIV_OP_CONFUSION", intAns(a - d), answer, fb);
  pushBug(bugs, "DIV_OP_CONFUSION", intAns(a * d), answer, fb);
}

export const genDivMeaning: Generator = (rng, difficulty) => {
  const d = rng.int(2, 5);
  const q = rng.int(2, 6);
  const a = d * q;
  const answer = intAns(q);
  const bugs: GeneratedItem["bugs"] = [];
  divConfusionBugs(bugs, a, d, answer);
  const steps = [`${withJosa(a, "을/를")} ${d}묶음으로 똑같이 나누면 한 묶음에 ${q}개예요.`, `${d} × ${q} = ${a}이니까 ${a} ÷ ${d} = ${q}`];
  if (difficulty === 1) {
    return {
      prompt: `${a}개를 ${d}묶음으로 똑같이 나누면 한 묶음에 몇 개일까요?`,
      answer,
      bugs,
      steps,
      visual: { type: "dots", count: a, groupSize: q },
      showVisual: true,
      story: { kind: "div-share", total: a, parts: d, withRemainder: false },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "div", a: n(a), b: n(d) },
    };
  }
  if (difficulty === 2) {
    return {
      prompt: `곱셈식 ${d} × ${q} = ${withJosa(a, "을/를")} 보고 나눗셈의 몫을 구하세요. ${a} ÷ ${d} = □`,
      answer,
      bugs,
      steps: [`${d} × ${q} = ${a}에서 ${withJosa(a, "을/를")} ${withJosa(d, "으로/로")} 나누면 ${withJosa(q, "이/가")} 돼요.`, `${a} ÷ ${d} = ${q}`],
      visual: { type: "array", rows: d, cols: q },
      story: { kind: "div-share", total: a, parts: d, withRemainder: false },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: "div", a: n(a), b: n(d) },
    };
  }
  return {
    prompt: `${a} ÷ ${d} = □`,
    answer,
    bugs,
    steps,
    visual: { type: "dots", count: a, groupSize: q },
    story: { kind: "div-group", total: a, size: q, withRemainder: false },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "div", a: n(a), b: n(d) },
  };
};

export const genDivFacts: Generator = (rng, difficulty) => {
  const d = difficulty === 1 ? rng.int(2, 5) : rng.int(6, 9);
  const q = rng.int(2, 9);
  const a = d * q;
  const answer = intAns(q);
  const bugs: GeneratedItem["bugs"] = [];
  divConfusionBugs(bugs, a, d, answer);
  return {
    prompt: `${a} ÷ ${d} = □`,
    answer,
    bugs,
    steps: [`${d} × □ = ${withJosa(a, "이/가")} 되는 수를 곱셈구구 ${d}단에서 찾아요.`, `${d} × ${q} = ${a}`, `그래서 ${a} ÷ ${d} = ${q}`],
    visual: { type: "array", rows: d, cols: q },
    story: rng.bool() ? { kind: "div-share", total: a, parts: d, withRemainder: false } : { kind: "div-group", total: a, size: d, withRemainder: false },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "div", a: n(a), b: n(d) },
  };
};

/** Removes zeros inside a number (103 → 13). */
function dropInnerZeros(v: number): number {
  const s = String(v);
  return Number(s[0] + s.slice(1, -1).replace(/0/g, "") + (s.length > 1 ? s.slice(-1) : ""));
}

function divisionItem(rng: Rng, a: number, d: number, allowZeroBug: boolean): GeneratedItem {
  const q = Math.floor(a / d);
  const r = a % d;
  const answer = r === 0 ? intAns(q) : qrAns(q, r);
  const bugs: GeneratedItem["bugs"] = [];
  if (r !== 0) {
    bugs.push({
      misconceptionId: "DIV_REMAINDER_TOO_BIG",
      rule: { type: "remainder-too-big", dividend: a, divisor: d },
      feedback: `나머지는 나누는 수 ${d}보다 작아야 해요. 나머지가 ${d}보다 크면 몫을 더 크게 할 수 있어요.`,
    });
  }
  if (allowZeroBug && /\d0+\d/.test(String(q))) {
    const dz = dropInnerZeros(q);
    pushBug(bugs, "DIV_ZERO_IN_QUOTIENT_OMITTED", r === 0 ? intAns(dz) : qrAns(dz, r), answer, "나누어지는 수의 어떤 자리를 나눌 수 없을 때는 몫의 그 자리에 0을 써야 해요. 몫 × 나누는 수를 계산해서 확인해 보세요.");
  }
  void rng;
  return {
    prompt: `${a} ÷ ${d} = □`,
    instruction: r === 0 ? undefined : "몫과 나머지를 구하세요.",
    answer,
    bugs,
    steps: [...longDivisionSteps(a, d), r === 0 ? `답: ${q}` : `답: 몫 ${q}, 나머지 ${r}`],
    story: { kind: "div-share", total: a, parts: d, withRemainder: r !== 0 },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "divmod", a, b: d },
  };
}

export const genDivNBy1: Generator = (rng, difficulty) => {
  for (;;) {
    const d = rng.int(2, 9);
    if (difficulty === 1) {
      const q = rng.int(11, Math.floor(99 / d));
      if (q < 10) continue;
      return divisionItem(rng, q * d, d, false);
    }
    if (difficulty === 2) {
      const a = rng.int(20, 99);
      if (a % d === 0 || Math.floor(a / d) < 2) continue;
      return divisionItem(rng, a, d, false);
    }
    const q = rng.bool(0.5) ? rng.int(1, 9) * 100 + rng.int(1, 9) : rng.int(100, Math.floor(999 / d));
    const r = rng.bool() ? 0 : rng.int(1, d - 1);
    const a = q * d + r;
    if (a > 999 || q < 100) continue;
    return divisionItem(rng, a, d, true);
  }
};

export const genDivNBy2: Generator = (rng, difficulty) => {
  for (;;) {
    const d = rng.int(12, 49);
    if (difficulty === 1) {
      const q = rng.int(2, Math.floor(99 / d));
      if (q < 2) continue;
      return divisionItem(rng, q * d, d, false);
    }
    if (difficulty === 2) {
      const q = rng.int(11, Math.floor(999 / d));
      if (q < 11) continue;
      return divisionItem(rng, q * d, d, false);
    }
    const q = rng.int(4, Math.floor(999 / d));
    const r = rng.int(1, d - 1);
    const a = q * d + r;
    if (a > 999) continue;
    return { ...divisionItem(rng, a, d, false), story: { kind: "div-group", total: a, size: d, withRemainder: true } };
  }
};
