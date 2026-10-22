/** Generators for the 수 (number sense) strand. */
import { formatInt, josa, parseKoreanNumber, readNumberKo, withJosa } from "../../math/korean";
import type { Rng } from "../../math/rng";
import {
  cmpAns,
  COMPARE_GUESS,
  compareSymbol,
  digitsOf,
  flipSymbol,
  intAns,
  pushBug,
  SHORT_ANSWER_GUESS,
  SMALL_RANGE_GUESS,
} from "../helpers";
import type { Difficulty, GeneratedItem } from "../types";

export type Generator = (rng: Rng, difficulty: Difficulty) => GeneratedItem;

const EMOJIS = ["🍎", "⭐", "🐟", "🌸", "🍓", "🚗", "🐥", "🎈"];
export const COMPARE_INSTRUCTION = "두 수의 크기를 비교하여 ○ 안에 >, =, < 중 알맞은 것을 고르세요.";

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function compareItem(a: number, b: number, steps: string[], extraBugs: GeneratedItem["bugs"] = []): GeneratedItem {
  return {
    prompt: `${formatInt(a)} ○ ${formatInt(b)}`,
    instruction: COMPARE_INSTRUCTION,
    answer: cmpAns(compareSymbol(a, b)),
    bugs: extraBugs,
    steps,
    guessRate: COMPARE_GUESS,
    check: { k: "cmp", a: { k: "num", v: a }, b: { k: "num", v: b } },
  };
}

/**
 * "As heard" writing: each spoken part written in full and joined.
 * Below 10000 every non-zero place is a part (704 → "700"+"4" → 7004);
 * from 10000 the 만 groups are the parts (34000 → "30000"+"4000").
 */
export function writeAsHeard(n: number): number | null {
  let text = "";
  if (n >= 10000) {
    const groups: number[] = [];
    for (let rest = n; rest > 0; rest = Math.floor(rest / 10000)) groups.push(rest % 10000);
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] !== 0) text += String(groups[i] * 10000 ** i);
    }
  } else {
    const ds = digitsOf(n);
    for (let i = ds.length - 1; i >= 0; i--) {
      if (ds[i] !== 0) text += String(ds[i] * 10 ** i);
    }
  }
  if (text.length > 15) return null;
  const v = Number(text);
  return Number.isSafeInteger(v) ? v : null;
}

/** Writing only the non-zero digits (305 → 35). */
function omitZeros(n: number): number | null {
  const text = String(n).replace(/0/g, "");
  return text ? Number(text) : null;
}

function placesPrompt(terms: Array<[number, number]>): string {
  return terms.map(([unit, count]) => `${unit}${josa(unit, "이/가")} ${count}개`).join(", ");
}

function placesItem(terms: Array<[number, number]>, rng: Rng, withZeroBug: boolean): GeneratedItem {
  const value = terms.reduce((s, [u, c]) => s + u * c, 0);
  const answer = intAns(value);
  const bugs: GeneratedItem["bugs"] = [];
  if (withZeroBug && terms.some(([, c]) => c === 0)) {
    const v = omitZeros(value);
    if (v !== null) {
      pushBug(bugs, "PLACE_VALUE_ZERO_OMIT", intAns(v), answer, "개수가 0인 자리에도 0을 써야 해요. 자릿값 칸을 그려서 빈 자리에 0을 채워 보세요.");
    }
  }
  void rng;
  return {
    prompt: `${placesPrompt(terms)}인 수는 얼마일까요?`,
    answer,
    bugs,
    steps: [
      ...terms.map(([u, c]) => `${u}${josa(u, "이/가")} ${c}개 → ${formatInt(u * c)}`),
      `모두 더하면 ${formatInt(value)}`,
    ],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "places", terms },
  };
}

function readingItem(n: number): GeneratedItem {
  const reading = readNumberKo(n);
  const answer = intAns(n);
  const bugs: GeneratedItem["bugs"] = [];
  const heard = writeAsHeard(n);
  if (heard !== null) {
    pushBug(bugs, "PLACE_VALUE_WRITE_AS_HEARD", intAns(heard), answer, "들리는 대로 숫자를 이어 쓰면 자리가 너무 많아져요. 각 숫자를 자기 자리(천, 백, 십, 일…)에 하나씩 써 보세요.");
  }
  let steps: string[];
  if (n >= 10000) {
    // Read by 만 groups as in the textbook: 삼억 / 구천만 → 300,000,000 + 90,000,000.
    const groups = reading.split(" ").map((g) => ({ g, v: parseKoreanNumber(g) ?? 0 }));
    steps = [...groups.map(({ g, v }) => `‘${g}’ → ${formatInt(v)}`), `모두 더하면 ${formatInt(n)}`];
  } else {
    const ds = digitsOf(n);
    const placeNames = ["일", "십", "백", "천"];
    const parts: string[] = [];
    for (let i = ds.length - 1; i >= 0; i--) parts.push(`${placeNames[i]}의 자리 ${ds[i]}`);
    steps = [`자리별로 숫자를 정해요: ${parts.join(", ")}`, `그래서 ${formatInt(n)}`];
  }
  return {
    prompt: `‘${reading}’${josa(reading, "을/를")} 수로 쓰세요.`,
    answer,
    bugs,
    steps,
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "korean", text: reading },
  };
}

/** Value of a unique non-zero digit in n (asks about a place of tens or higher). */
function digitValueItem(n: number, rng: Rng): GeneratedItem | null {
  const ds = digitsOf(n);
  const candidates = ds
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => i >= 1 && d !== 0 && ds.filter((x) => x === d).length === 1);
  if (candidates.length === 0) return null;
  const { d, i } = rng.pick(candidates);
  const value = d * 10 ** i;
  const answer = intAns(value);
  const bugs: GeneratedItem["bugs"] = [];
  pushBug(bugs, "PLACE_VALUE_DIGIT_ONLY", intAns(d), answer, `숫자 ${d}가 어느 자리에 있는지 먼저 찾아요. 그 자리의 값만큼을 나타내요.`);
  const placeNames = ["일", "십", "백", "천", "만", "십만", "백만", "천만", "억", "십억", "백억", "천억"];
  return {
    prompt: `${formatInt(n)}에서 숫자 ${d}${josa(d, "이/가")} 나타내는 값은 얼마일까요?`,
    answer,
    bugs,
    steps: [`숫자 ${d}${josa(d, "은/는")} ${placeNames[i]}의 자리에 있어요.`, `그래서 ${formatInt(value)}${josa(value, "을/를")} 나타내요.`],
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "digit-value", n, digit: d },
  };
}

function distinctDigitsNumber(rng: Rng, digits: number, allowZero: boolean): number {
  for (;;) {
    const ds = [rng.int(1, 9), ...Array.from({ length: digits - 1 }, () => rng.int(allowZero ? 0 : 1, 9))];
    const nonzero = ds.filter((d) => d !== 0);
    if (new Set(nonzero).size === nonzero.length) return Number(ds.join(""));
  }
}

export const genNumUpTo9: Generator = (rng, difficulty) => {
  if (difficulty === 1 || (difficulty === 2 && rng.bool())) {
    const count = difficulty === 1 ? rng.int(2, 5) : rng.int(5, 9);
    return {
      prompt: "그림을 보고 모두 몇 개인지 세어 보세요.",
      answer: intAns(count),
      bugs: [],
      steps: [`하나씩 짚으며 세어 봐요: ${range(1, count).join(", ")}`, `모두 ${count}개예요.`],
      visual: { type: "dots", count, emoji: rng.pick(EMOJIS) },
      showVisual: true,
      guessRate: SMALL_RANGE_GUESS,
      check: { k: "num", v: count },
    };
  }
  if (difficulty === 2) {
    const bigger = rng.bool();
    const n = bigger ? rng.int(1, 8) : rng.int(2, 9);
    const ans = bigger ? n + 1 : n - 1;
    return {
      prompt: `${n}보다 1 ${bigger ? "큰" : "작은"} 수는 무엇일까요?`,
      answer: intAns(ans),
      bugs: [],
      steps: bigger
        ? [`수를 순서대로 세어 봐요: ${range(Math.max(1, n - 2), n + 1).join(", ")}`, `${n} 바로 다음 수는 ${withJosa(ans, "이에요/예요")}.`]
        : [`수를 순서대로 세어 봐요: ${range(Math.max(1, ans - 1), n).join(", ")}`, `${n} 바로 앞의 수는 ${withJosa(ans, "이에요/예요")}.`],
      visual: { type: "number-line", min: 0, max: 10, step: 1, marks: [n] },
      guessRate: SMALL_RANGE_GUESS,
      check: bigger ? { k: "add", a: { k: "num", v: n }, b: { k: "num", v: 1 } } : { k: "sub", a: { k: "num", v: n }, b: { k: "num", v: 1 } },
    };
  }
  const a = rng.int(1, 9);
  let b = rng.int(1, 9);
  while (b === a) b = rng.int(1, 9);
  const sym = compareSymbol(a, b);
  return compareItem(a, b, [
    `수를 세는 순서에서 ${withJosa(a, "은/는")} ${b}보다 ${a < b ? "앞" : "뒤"}에 있어요.`,
    `그래서 ${a} ${sym} ${b}`,
  ]);
};

function bundlesItem(rng: Rng, tens: number, ones: number): GeneratedItem {
  const value = tens * 10 + ones;
  const answer = intAns(value);
  const bugs: GeneratedItem["bugs"] = [];
  if (ones > 0 && ones !== tens) {
    pushBug(bugs, "PLACE_VALUE_SWAP", intAns(ones * 10 + tens), answer, `10개씩 묶음의 수 ${withJosa(tens, "은/는")} 앞(십의 자리)에, 낱개의 수 ${withJosa(ones, "은/는")} 뒤(일의 자리)에 써요.`);
  }
  void rng;
  return {
    prompt: `10개씩 묶음 ${tens}개와 낱개 ${ones}개는 얼마일까요?`,
    answer,
    bugs,
    steps: [`10개씩 묶음 ${tens}개 → ${tens * 10}`, `낱개 ${ones}개를 더하면 ${tens * 10} + ${ones} = ${value}`],
    visual: { type: "base-ten", hundreds: 0, tens, ones },
    showVisual: true,
    guessRate: SHORT_ANSWER_GUESS,
    check: { k: "places", terms: [[10, tens], [1, ones]] },
  };
}

export const genNumUpTo50: Generator = (rng, difficulty) => {
  if (difficulty === 1) return bundlesItem(rng, rng.int(1, 4), rng.int(0, 9));
  if (difficulty === 2) {
    const n = rng.int(11, 49);
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const answer = intAns(tens);
    const bugs: GeneratedItem["bugs"] = [];
    if (ones !== tens) {
      pushBug(bugs, "PLACE_VALUE_SWAP", intAns(ones), answer, `앞에 있는 숫자가 10개씩 묶음의 수예요. ${withJosa(n, "은/는")} 10개씩 묶음 몇 개인지 생각해 보세요.`);
    }
    return {
      prompt: `${withJosa(n, "은/는")} 10개씩 묶음 몇 개와 낱개 ${ones}개일까요? 10개씩 묶음의 수를 쓰세요.`,
      answer,
      bugs,
      steps: [`${n}에서 십의 자리 숫자는 ${withJosa(tens, "이에요/예요")}.`, `그래서 10개씩 묶음 ${tens}개와 낱개 ${ones}개예요.`],
      visual: { type: "base-ten", hundreds: 0, tens, ones },
      guessRate: SMALL_RANGE_GUESS,
      check: { k: "div", a: { k: "sub", a: { k: "num", v: n }, b: { k: "num", v: ones } }, b: { k: "num", v: 10 } },
    };
  }
  const a = rng.int(10, 50);
  let b = rng.int(10, 50);
  while (b === a) b = rng.int(10, 50);
  const ta = Math.floor(a / 10);
  const tb = Math.floor(b / 10);
  const correct = cmpAns(compareSymbol(a, b));
  const bugs: GeneratedItem["bugs"] = [];
  if (ta !== tb && compareSymbol(a % 10, b % 10) === flipSymbol(compareSymbol(a, b))) {
    pushBug(bugs, "PLACE_VALUE_SWAP", cmpAns(compareSymbol(a % 10, b % 10)), correct, "수의 크기는 10개씩 묶음의 수(십의 자리)부터 비교해요.");
  }
  return compareItem(
    a,
    b,
    ta !== tb
      ? [`10개씩 묶음의 수를 먼저 비교해요: ${withJosa(ta, "과/와")} ${tb}`, `그래서 ${a} ${compareSymbol(a, b)} ${b}`]
      : [`10개씩 묶음의 수가 같으니 낱개의 수를 비교해요: ${withJosa(a % 10, "과/와")} ${b % 10}`, `그래서 ${a} ${compareSymbol(a, b)} ${b}`],
    bugs,
  );
};

export const genNumUpTo100: Generator = (rng, difficulty) => {
  if (difficulty === 1) return bundlesItem(rng, rng.int(5, 9), rng.int(0, 9));
  if (difficulty === 2) {
    const kind = rng.pick(["ten-more", "ten-less", "one-more"] as const);
    const n = kind === "ten-more" ? rng.int(11, 89) : kind === "ten-less" ? rng.int(20, 99) : rng.int(50, 99);
    const delta = kind === "ten-more" ? 10 : kind === "ten-less" ? -10 : 1;
    const ans = n + delta;
    const answer = intAns(ans);
    const bugs: GeneratedItem["bugs"] = [];
    if (kind === "ten-more" && n % 10 !== 9) {
      pushBug(bugs, "ADD_PLACE_MISALIGN", intAns(n + 1), answer, "10 큰 수는 10개씩 묶음이 하나 더 많은 수예요. 십의 자리 숫자가 1 커져요.");
    }
    const what = kind === "ten-more" ? "10 큰 수" : kind === "ten-less" ? "10 작은 수" : "1 큰 수";
    return {
      prompt: `${n}보다 ${what}는 얼마일까요?`,
      answer,
      bugs,
      steps:
        kind === "one-more"
          ? [`${n} 바로 다음 수를 생각해요.`, `${n} + 1 = ${ans}`]
          : [`10개씩 묶음이 하나 ${kind === "ten-more" ? "더 많아져요" : "줄어들어요"}: 십의 자리 숫자가 ${Math.floor(n / 10)}에서 ${withJosa(Math.floor(ans / 10), "으로/로")} 바뀌어요.`, `그래서 ${ans}`],
      visual: { type: "base-ten", hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 },
      guessRate: SHORT_ANSWER_GUESS,
      check: { k: delta > 0 ? "add" : "sub", a: { k: "num", v: n }, b: { k: "num", v: Math.abs(delta) } },
    };
  }
  const a = rng.int(50, 99);
  let b = rng.bool() ? Math.floor(a / 10) * 10 + rng.int(0, 9) : rng.int(50, 99);
  while (b === a) b = rng.int(50, 99);
  const ta = Math.floor(a / 10);
  const tb = Math.floor(b / 10);
  return compareItem(
    a,
    b,
    ta !== tb
      ? [`십의 자리 숫자를 먼저 비교해요: ${withJosa(ta, "과/와")} ${tb}`, `그래서 ${a} ${compareSymbol(a, b)} ${b}`]
      : [`십의 자리 숫자가 같으니 일의 자리 숫자를 비교해요: ${withJosa(a % 10, "과/와")} ${b % 10}`, `그래서 ${a} ${compareSymbol(a, b)} ${b}`],
  );
};

export const genNum3Digit: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const h = rng.int(1, 9);
    const t = rng.bool(0.5) ? 0 : rng.int(1, 9);
    const o = t === 0 ? rng.int(1, 9) : rng.int(0, 9);
    const item = placesItem([[100, h], [10, t], [1, o]], rng, true);
    return { ...item, visual: { type: "base-ten", hundreds: h, tens: t, ones: o }, showVisual: true };
  }
  if (difficulty === 2) {
    const h = rng.int(1, 9);
    const zeroAt = rng.pick(["tens", "ones", "none"] as const);
    const t = zeroAt === "tens" ? 0 : rng.int(1, 9);
    const o = zeroAt === "ones" ? 0 : rng.int(1, 9);
    return readingItem(h * 100 + t * 10 + o);
  }
  return digitValueItem(distinctDigitsNumber(rng, 3, true), rng) ?? digitValueItem(distinctDigitsNumber(rng, 3, false), rng)!;
};

export const genNum4Digit: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const th = rng.int(1, 9);
    const h = rng.int(0, 9);
    const t = rng.bool(0.4) ? 0 : rng.int(1, 9);
    const o = rng.int(0, 9);
    return placesItem([[1000, th], [100, h], [10, t], [1, o]], rng, true);
  }
  if (difficulty === 2) {
    const th = rng.int(1, 9);
    const h = rng.bool(0.4) ? 0 : rng.int(1, 9);
    const t = rng.int(0, 9);
    const o = rng.bool(0.4) ? 0 : rng.int(1, 9);
    return readingItem(th * 1000 + h * 100 + t * 10 + o);
  }
  return digitValueItem(distinctDigitsNumber(rng, 4, true), rng) ?? digitValueItem(distinctDigitsNumber(rng, 4, false), rng)!;
};

export const genNumLarge: Generator = (rng, difficulty) => {
  if (difficulty === 1) {
    const a = rng.int(1, 9);
    const b = rng.int(0, 9);
    const c = rng.int(1, 9);
    return placesItem([[10000, a], [1000, b], [100, c]], rng, false);
  }
  if (difficulty === 2) {
    const man = rng.int(2, 99);
    const rest = rng.int(1, 9) * 1000 + (rng.bool() ? rng.int(1, 9) * 100 : 0);
    return readingItem(man * 10000 + rest);
  }
  if (rng.bool()) {
    const eok = rng.int(1, 9);
    const man = rng.int(1, 9) * 1000;
    return readingItem(eok * 100_000_000 + man * 10_000);
  }
  const digits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
  const n = Number(digits.join("")) * 10 ** rng.int(4, 7);
  return digitValueItem(n, rng)!;
};
