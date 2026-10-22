/** Generators for the 덧셈과 뺄셈 strand. */
import { josa, withJosa } from "../../math/korean";
import type { Rng } from "../../math/rng";
import {
  additionSteps,
  addNoCarry,
  addWriteAll,
  digitsOf,
  intAns,
  pushBug,
  SHORT_ANSWER_GUESS,
  SMALL_RANGE_GUESS,
  subBorrowNoDecrement,
  subSmallerFromLarger,
  subtractionSteps,
} from "../helpers";
import type { GeneratedItem } from "../types";
import type { Generator } from "./number";

const n = (v: number) => ({ k: "num" as const, v });

/** Base-ten block counts for a number below 1000. */
export function blocks(v: number): { hundreds: number; tens: number; ones: number } {
  return { hundreds: Math.floor(v / 100), tens: Math.floor(v / 10) % 10, ones: v % 10 };
}

function addItem(a: number, b: number, opts: { bugs?: boolean; steps?: string[] } = {}): GeneratedItem {
  const sum = a + b;
  const answer = intAns(sum);
  const bugs: GeneratedItem["bugs"] = [];
  if (opts.bugs) {
    const nc = addNoCarry(a, b);
    if (nc !== null) {
      pushBug(bugs, "ADD_NO_CARRY", intAns(nc), answer, "같은 자리끼리 더한 값이 10이거나 10보다 크면 윗자리로 1을 받아올려야 해요. 받아올린 1을 윗자리에 더했는지 확인해 보세요.");
    }
    const wa = addWriteAll(a, b);
    if (wa !== null) {
      pushBug(bugs, "ADD_CARRY_WRITE_ALL", intAns(wa), answer, "한 자리에는 숫자를 하나만 쓸 수 있어요. 더한 값이 두 자리이면 일의 자리 숫자만 쓰고 10은 윗자리로 받아올려요.");
    }
  }
  return {
    prompt: `${a} + ${b} = □`,
    answer,
    bugs,
    steps: opts.steps ?? [...additionSteps(a, b), `답: ${sum}`],
    visual: a + b < 1000 ? { type: "base-ten", ...blocks(a), plus: blocks(b) } : undefined,
    story: { kind: "add", a, b },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "add", a: n(a), b: n(b) },
  };
}

function subItem(a: number, b: number, opts: { bugs?: boolean; steps?: string[] } = {}): GeneratedItem {
  const diff = a - b;
  const answer = intAns(diff);
  const bugs: GeneratedItem["bugs"] = [];
  if (opts.bugs) {
    const sl = subSmallerFromLarger(a, b);
    if (sl !== null) {
      pushBug(bugs, "SUB_SMALLER_FROM_LARGER", intAns(sl), answer, "위의 수가 아래 수보다 작은 자리에서 아래 수에서 위의 수를 뺀 것 같아요. 이럴 때는 윗자리에서 10을 받아내려서 계산해요.");
    }
    const nd = subBorrowNoDecrement(a, b);
    if (nd !== null) {
      pushBug(bugs, "SUB_BORROW_NO_DECREMENT", intAns(nd), answer, "10을 받아내린 윗자리는 1만큼 작아져요. 받아내린 자리의 숫자를 1 줄였는지 확인해 보세요.");
    }
  }
  return {
    prompt: `${a} − ${b} = □`,
    answer,
    bugs,
    steps: opts.steps ?? [...subtractionSteps(a, b), `답: ${diff}`],
    visual: a < 1000 ? { type: "base-ten", ...blocks(a) } : undefined,
    story: { kind: "sub-takeaway", a, b },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "sub", a: n(a), b: n(b) },
  };
}

/** Random number with exactly `digits` digits. */
function nDigit(rng: Rng, digits: number): number {
  return rng.int(10 ** (digits - 1), 10 ** digits - 1);
}

/** Count of columns that carry when adding a and b. */
export function carryCount(a: number, b: number): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let carry = 0;
  let count = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const s = (da[i] ?? 0) + (db[i] ?? 0) + carry;
    carry = s >= 10 ? 1 : 0;
    count += carry;
  }
  return count;
}

/** Count of columns that need a borrow when subtracting b from a. */
export function borrowCount(a: number, b: number): number {
  return carryCount(a - b, b);
}

export const genAs1dBasic: Generator = (rng, difficulty) => {
  if (difficulty === 3) {
    const total = rng.int(4, 9);
    const known = rng.int(1, total - 1);
    const missing = total - known;
    return {
      prompt: `${known} + □ = ${total}`,
      instruction: "□ 안에 알맞은 수를 쓰세요.",
      answer: intAns(missing),
      bugs: [],
      steps: [`${known}에서 ${total}까지 몇 번 더 세어야 하는지 생각해요: ${Array.from({ length: missing }, (_, i) => known + i + 1).join(", ")}`, `${missing}만큼 더 세었으니 □는 ${withJosa(missing, "이에요/예요")}.`],
      guessRate: SMALL_RANGE_GUESS,
      check: { k: "sub", a: n(total), b: n(known) },
    };
  }
  const max = difficulty === 1 ? 5 : 9;
  if (rng.bool()) {
    const a = rng.int(1, max - 1);
    const b = rng.int(1, max - a);
    const counts = Array.from({ length: b }, (_, i) => a + i + 1).join(", ");
    return {
      ...addItem(a, b, { steps: [`${a}에서 ${b}만큼 이어 세어요: ${counts}`, `${a} + ${b} = ${a + b}`] }),
      visual: { type: "dots", count: a + b, groupSize: a },
      guessRate: SMALL_RANGE_GUESS,
    };
  }
  const a = rng.int(2, max);
  const b = rng.int(1, a - 1);
  const counts = Array.from({ length: b }, (_, i) => a - i - 1).join(", ");
  return {
    ...subItem(a, b, { steps: [`${a}에서 ${b}만큼 거꾸로 세어요: ${counts}`, `${a} − ${b} = ${a - b}`] }),
    visual: { type: "dots", count: a },
    guessRate: SMALL_RANGE_GUESS,
  };
};

export const genAsMake10: Generator = (rng, difficulty) => {
  const a = rng.int(1, 9);
  const b = 10 - a;
  if (difficulty === 1) {
    return {
      prompt: `${withJosa(a, "과/와")} □를 모으면 10이 돼요. □ 안에 알맞은 수는 무엇일까요?`,
      answer: intAns(b),
      bugs: [],
      steps: [`${a}에서 10까지 세어 봐요: ${Array.from({ length: b }, (_, i) => a + i + 1).join(", ")}`, `${b}만큼 더 세었으니 □는 ${withJosa(b, "이에요/예요")}.`],
      visual: { type: "dots", count: 10, groupSize: a },
      guessRate: SMALL_RANGE_GUESS,
      check: { k: "sub", a: n(10), b: n(a) },
    };
  }
  if (difficulty === 2) {
    return {
      prompt: `10은 ${withJosa(a, "과/와")} □로 가를 수 있어요. □ 안에 알맞은 수는 무엇일까요?`,
      answer: intAns(b),
      bugs: [],
      steps: [`${withJosa(a, "과/와")} 몇을 모으면 10이 되는지 생각해요.`, `${a} + ${b} = 10이니까 □는 ${withJosa(b, "이에요/예요")}.`],
      visual: { type: "dots", count: 10, groupSize: a },
      guessRate: SMALL_RANGE_GUESS,
      check: { k: "sub", a: n(10), b: n(a) },
    };
  }
  return {
    prompt: `10 − ${a} = □`,
    answer: intAns(b),
    bugs: [],
    steps: [`10은 ${withJosa(a, "과/와")} ${withJosa(b, "으로/로")} 가를 수 있어요.`, `그래서 10 − ${a} = ${b}`],
    visual: { type: "dots", count: 10 },
    guessRate: SMALL_RANGE_GUESS,
    check: { k: "sub", a: n(10), b: n(a) },
  };
};

export const genAs1dCarryAdd: Generator = (rng, difficulty) => {
  let a: number;
  let b: number;
  if (difficulty === 1) {
    a = 9;
    b = rng.int(2, 9);
  } else if (difficulty === 2) {
    a = rng.int(5, 9);
    b = rng.int(11 - a, 9);
  } else {
    a = rng.int(6, 9);
    b = rng.int(Math.max(6, 11 - a), 9);
  }
  if (rng.bool()) [a, b] = [b, a];
  const sum = a + b;
  const toTen = 10 - a;
  const rest = b - toTen;
  const answer = intAns(sum);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "ADD_NO_CARRY", intAns(sum % 10), answer, `${a} + ${b}${josa(b, "은/는")} 10보다 커요. ${withJosa(b, "을/를")} ${withJosa(toTen, "과/와")} ${withJosa(rest, "으로/로")} 갈라서 ${a}에 ${withJosa(toTen, "을/를")} 먼저 더해 10을 만들어 보세요.`);
  return {
    prompt: `${a} + ${b} = □`,
    answer,
    bugs,
    steps: [`${withJosa(b, "을/를")} ${withJosa(toTen, "과/와")} ${withJosa(rest, "으로/로")} 갈라요.`, `${a} + ${toTen} = 10`, `10 + ${rest} = ${sum}`],
    visual: { type: "dots", count: sum, groupSize: 10 },
    story: { kind: "add", a, b },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "add", a: n(a), b: n(b) },
  };
};

export const genAs1dBorrowSub: Generator = (rng, difficulty) => {
  const b = difficulty === 1 ? 9 : rng.int(difficulty === 2 ? 3 : 6, 9);
  const onesA = rng.int(0, b - 1);
  const a = 10 + onesA;
  const diff = a - b;
  const answer = intAns(diff);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "SUB_SMALLER_FROM_LARGER", intAns(10 + (b - onesA)), answer, `일의 자리 ${onesA}에서 ${withJosa(b, "을/를")} 뺄 수 없어서 ${b} − ${withJosa(onesA, "을/를")} 계산한 것 같아요. ${withJosa(a, "을/를")} 10과 ${withJosa(onesA, "으로/로")} 갈라서 10에서 ${withJosa(b, "을/를")} 먼저 빼 보세요.`);
  return {
    prompt: `${a} − ${b} = □`,
    answer,
    bugs,
    steps: [`${withJosa(a, "을/를")} 10과 ${withJosa(onesA, "으로/로")} 갈라요.`, `10 − ${b} = ${10 - b}`, `${10 - b} + ${onesA} = ${diff}`],
    visual: { type: "dots", count: a, groupSize: 10 },
    story: { kind: "sub-takeaway", a, b },
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "sub", a: n(a), b: n(b) },
  };
};

export const genAs2dNoCarry: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const tens = rng.int(1, 8);
    const ones = rng.int(0, 8);
    const b = rng.int(1, 9 - ones);
    const a = tens * 10 + ones;
    const item = addItem(a, b);
    const bugs: GeneratedItem["bugs"] = [];
    if (a + b * 10 < 100) {
      pushBug(bugs, "ADD_PLACE_MISALIGN", intAns(a + b * 10), item.answer, `${withJosa(b, "은/는")} 일의 자리 수예요. 일의 자리끼리 맞춰서 ${withJosa(ones, "과/와")} ${withJosa(b, "을/를")} 더해 보세요.`);
    }
    return { ...item, bugs };
  }
  // Two-digit ± two-digit with no carry/borrow.
  if (rng.bool()) {
    const ta = rng.int(1, 7);
    const oa = rng.int(0, 8);
    const tb = rng.int(1, 8 - ta);
    const ob = rng.int(0, 9 - oa);
    return addItem(ta * 10 + oa, tb * 10 + ob);
  }
  const ta = rng.int(3, 9);
  const oa = rng.int(difficulty === 3 ? 5 : 2, 9);
  const tb = rng.int(1, ta - 1);
  const ob = rng.int(0, oa);
  return subItem(ta * 10 + oa, tb * 10 + ob);
};

export const genAs2dCarryAdd: Generator = (rng, difficulty) => {
  for (;;) {
    let a: number;
    let b: number;
    if (difficulty === 1) {
      a = rng.int(11, 89);
      b = rng.int(2, 9);
    } else if (difficulty === 2) {
      a = rng.int(11, 79);
      b = rng.int(11, 89 - Math.floor(a / 10) * 10);
    } else {
      a = rng.int(25, 99);
      b = rng.int(25, 99);
    }
    const sum = a + b;
    if ((a % 10) + (b % 10) < 10) continue;
    if (difficulty <= 2 && sum >= 100) continue;
    if (difficulty === 3 && sum < 100) continue;
    return addItem(a, b, { bugs: true });
  }
};

export const genAs2dBorrowSub: Generator = (rng, difficulty) => {
  for (;;) {
    let a: number;
    let b: number;
    if (difficulty === 1) {
      a = rng.int(20, 99);
      b = rng.int(2, 9);
    } else {
      a = rng.int(30, 99);
      b = rng.int(11, a - 1);
    }
    if (a % 10 >= b % 10) continue;
    if (difficulty === 3 && a - b > 20) continue;
    return subItem(a, b, { bugs: true });
  }
};

export const genAs3dAdd: Generator = (rng, difficulty) => {
  for (;;) {
    const a = nDigit(rng, 3);
    const b = nDigit(rng, 3);
    const carries = carryCount(a, b);
    const sum = a + b;
    if (difficulty === 1 && (carries !== 1 || sum >= 1000)) continue;
    if (difficulty === 2 && (carries !== 2 || sum >= 1000)) continue;
    if (difficulty === 3 && sum < 1000) continue;
    return addItem(a, b, { bugs: true });
  }
};

export const genAs3dSub: Generator = (rng, difficulty) => {
  for (;;) {
    let a = nDigit(rng, 3);
    if (difficulty === 3 && rng.bool(0.7)) a = Math.floor(a / 100) * 100 + (a % 10); // zero in the tens place
    if (a < 200) continue;
    const b = rng.int(100, a - 1);
    if (b < 100 || a - b < 1) continue;
    const borrows = borrowCount(a, b);
    if (difficulty === 1 && borrows !== 1) continue;
    if (difficulty >= 2 && borrows !== 2) continue;
    if (difficulty === 3 && Math.floor(a / 10) % 10 !== 0) continue;
    return subItem(a, b, { bugs: true });
  }
};

export { addItem, subItem, nDigit };
