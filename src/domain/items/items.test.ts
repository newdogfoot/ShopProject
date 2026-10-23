import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum/skills";
import { generateItem, generateWordItem, GENERATORS, itemFromId } from "./index";
import { answerMatches, evaluateExpr } from "./check";
import { answerToInput, grade, wrongInput } from "./answer";
import { answerText, formatUnits, sameValue, splitUnits, UNITS, unitsAns } from "./helpers";
import { isMisconceptionId } from "./misconceptions";
import { THEMES } from "../content/stories";
import type { AnswerSpec, Difficulty, Item } from "./types";

/** A bare item around an answer, for grading tests. */
function itemWith(answer: AnswerSpec, bugs: Item["bugs"] = []): Item {
  return { id: "T#1#1", skillId: "T", difficulty: 1, seed: 1, format: "computation", prompt: "", answer, bugs, steps: [], guessRate: 0.03, check: { k: "num", v: 0 } };
}

const SEEDS_PER_DIFFICULTY = 334; // ≈ 1,000 items per skill
const DIFFICULTIES: Difficulty[] = [1, 2, 3];

function textOf(item: Item): string {
  return [item.prompt, item.instruction ?? "", ...item.steps, ...item.bugs.map((b) => b.feedback)].join("\n");
}

describe("item generators", () => {
  it("has a generator for every skill", () => {
    for (const s of SKILLS) expect(GENERATORS[s.id], s.id).toBeTypeOf("function");
  });

  for (const skill of SKILLS) {
    it(`${skill.id}: answers are right, bugs differ, grading works (≈1,000 seeds)`, () => {
      const allowed = new Set<string>(skill.misconceptions);
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 1; seed <= SEEDS_PER_DIFFICULTY; seed++) {
          const item = generateItem(skill.id, seed * 7919 + difficulty, difficulty);
          const ctx = `${skill.id} d${difficulty} seed ${seed}: ${item.prompt}`;

          // 1. The answer agrees with an independent evaluation of the question.
          expect(answerMatches(item.answer, evaluateExpr(item.check)), ctx).toBe(true);

          // 2. The correct keypad input is graded as correct.
          expect(grade(item, answerToInput(item.answer)).status, ctx).toBe("correct");
          expect(grade(item, wrongInput(item.answer)).status, ctx).toBe("wrong");

          // 3. Every predicted wrong answer differs from the answer and is detected.
          for (const bug of item.bugs) {
            expect(isMisconceptionId(bug.misconceptionId), ctx).toBe(true);
            expect(allowed.has(bug.misconceptionId), `${ctx} uses ${bug.misconceptionId}`).toBe(true);
            if (bug.answer) {
              expect(sameValue(bug.answer, item.answer), ctx).toBe(false);
              const result = grade(item, answerToInput(bug.answer));
              expect(result.status, ctx).toBe("wrong");
              expect(result.bug?.misconceptionId, ctx).toBeDefined();
            }
          }

          // 4. Text is complete.
          expect(item.steps.length, ctx).toBeGreaterThan(0);
          expect(textOf(item), ctx).not.toMatch(/undefined|NaN|\[object|Infinity/);
          expect(item.guessRate, ctx).toBeGreaterThan(0);
          expect(item.guessRate, ctx).toBeLessThan(0.5);
        }
      }
    });
  }

  it("is reproducible from the seed", () => {
    for (const s of SKILLS) {
      expect(generateItem(s.id, 12345, 2)).toEqual(generateItem(s.id, 12345, 2));
    }
  });

  it("makes word problems for skills that support them", () => {
    for (const skill of SKILLS.filter((s) => s.wordProblems)) {
      for (const theme of THEMES) {
        let made = 0;
        for (let seed = 1; seed <= 20; seed++) {
          for (const d of DIFFICULTIES) {
            const item = generateWordItem(skill.id, seed, d, theme.id);
            if (item.format !== "word") continue;
            made++;
            expect(item.prompt, `${skill.id} ${theme.id}`).not.toMatch(/undefined|NaN|□/);
            expect(grade(item, answerToInput(item.answer)).status).toBe("correct");
          }
        }
        expect(made, `${skill.id} ${theme.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("generator constraints", () => {
  const sample = (id: string, d: Difficulty, n = 200) => Array.from({ length: n }, (_, i) => generateItem(id, i + 1, d));
  const operands = (item: Item): [number, number] => {
    const c = item.check;
    if ((c.k === "add" || c.k === "sub") && c.a.k === "num" && c.b.k === "num") return [Number(c.a.v), Number(c.b.v)];
    throw new Error("not a simple add/sub");
  };

  it("carry and borrow skills always need a carry or borrow", () => {
    for (const d of DIFFICULTIES) {
      for (const item of sample("AS_2D_CARRY_ADD", d)) {
        const [a, b] = operands(item);
        expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
      }
      for (const item of sample("AS_2D_BORROW_SUB", d)) {
        const [a, b] = operands(item);
        expect(a % 10).toBeLessThan(b % 10);
      }
      for (const item of sample("AS_1D_BORROW_SUB", d)) {
        const [a, b] = operands(item);
        expect(a % 10).toBeLessThan(b);
      }
    }
  });

  it("no-carry skill never carries or borrows", () => {
    for (const d of DIFFICULTIES) {
      for (const item of sample("AS_2D_NOCARRY", d)) {
        const [a, b] = operands(item);
        if (item.check.k === "add") expect((a % 10) + (b % 10)).toBeLessThan(10);
        else expect(a % 10).toBeGreaterThanOrEqual(b % 10);
      }
    }
  });

  it("division with remainder keeps the remainder smaller than the divisor", () => {
    for (const d of DIFFICULTIES) {
      for (const item of sample("DIV_NBY1", d)) {
        if (item.answer.kind === "quotient-remainder" && item.check.k === "divmod") {
          expect(item.answer.remainder).toBeLessThan(item.check.b);
          expect(item.answer.remainder).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("grading", () => {
  it("accepts equivalent fractions only in the requested form", () => {
    const item = generateItem("FRAC_EQUIV", 3, 1); // "기약분수로 나타내세요"
    const v = item.answer.kind === "fraction" ? item.answer.value : null;
    expect(v).not.toBeNull();
    const doubled = { kind: "fraction" as const, whole: "", num: String(v!.n * 2), den: String(v!.d * 2) };
    expect(grade(item, doubled).status).toBe("form");
    expect(grade(item, answerToInput(item.answer)).status).toBe("correct");
  });

  it("detects a remainder bigger than the divisor", () => {
    for (let seed = 1; seed < 200; seed++) {
      const item = generateItem("DIV_NBY1", seed, 2);
      if (item.answer.kind !== "quotient-remainder" || item.check.k !== "divmod") continue;
      const { quotient, remainder } = item.answer;
      const divisor = item.check.b;
      if (quotient < 1) continue;
      const result = grade(item, { kind: "quotient-remainder", quotient: String(quotient - 1), remainder: String(remainder + divisor) });
      expect(result.status).toBe("wrong");
      expect(result.bug?.misconceptionId).toBe("DIV_REMAINDER_TOO_BIG");
      return;
    }
    throw new Error("no item found");
  });

  it("treats blank or malformed input as invalid", () => {
    const item = generateItem("AS_2D_CARRY_ADD", 1, 2);
    expect(grade(item, { kind: "integer", text: "" }).status).toBe("invalid");
    expect(grade(item, { kind: "integer", text: "1a" }).status).toBe("invalid");
    expect(grade(item, { kind: "integer", text: "０" }).status).toBe("wrong");
  });

  it("grades several-unit answers by value and asks for the simplest form", () => {
    // 3시간 10분 − 1시간 40분 = 1시간 30분 (90분); borrowing 100 instead of 60 gives 1시간 70분 (130분).
    const item = itemWith(unitsAns(UNITS.hourMin, 90), [{ misconceptionId: "TIME_BASE_100", answer: unitsAns(UNITS.hourMin, 130), feedback: "1시간은 60분이에요." }]);
    expect(grade(item, { kind: "units", values: ["1", "30"] })).toMatchObject({ status: "correct", shown: "1시간 30분" });
    expect(grade(item, { kind: "units", values: ["", "90"] })).toMatchObject({ status: "form", shown: "90분" });
    expect(grade(item, { kind: "units", values: ["", "90"] }).formMessage).toContain("60분 = 1시간");
    expect(grade(item, { kind: "units", values: ["1", "70"] })).toMatchObject({ status: "wrong", shown: "1시간 70분" });
    expect(grade(item, { kind: "units", values: ["1", "70"] }).bug?.misconceptionId).toBe("TIME_BASE_100");
    expect(grade(item, { kind: "units", values: ["", ""] }).status).toBe("invalid");
    expect(grade(item, { kind: "units", values: ["1"] }).status).toBe("invalid");
    expect(grade(item, { kind: "units", values: ["1", "3a"] }).status).toBe("invalid");
    expect(grade(item, { kind: "integer", text: "90" }).status).toBe("invalid");
    expect(grade(item, wrongInput(item.answer)).status).toBe("wrong");
    expect(answerToInput(item.answer)).toEqual({ kind: "units", values: ["1", "30"] });

    const length = itemWith(unitsAns(UNITS.mCm, 205));
    expect(grade(length, { kind: "units", values: ["2", "5"] }).status).toBe("correct");
    expect(grade(length, { kind: "units", values: ["1", "105"] }).formMessage).toContain("100 cm = 1 m");
    expect(grade(itemWith({ kind: "integer", value: 12, unit: "cm²" }), { kind: "integer", text: "12" })).toMatchObject({ status: "correct", shown: "12 cm²" });
    const clock = itemWith(unitsAns(UNITS.clock, 3 * 60));
    expect(grade(clock, { kind: "units", values: ["3", ""] })).toMatchObject({ status: "correct", shown: "3시" });
  });

  it("works out kinds and labels independently", () => {
    const label = (e: Parameters<typeof evaluateExpr>[0]) => {
      const v = evaluateExpr(e);
      return v.type === "label" ? v.value : null;
    };
    expect(label({ k: "angle-kind", degrees: 35 })).toBe("예각");
    expect(label({ k: "angle-kind", degrees: 90 })).toBe("직각");
    expect(label({ k: "angle-kind", degrees: 120 })).toBe("둔각");
    expect(() => label({ k: "angle-kind", degrees: 180 })).toThrow();
    expect(label({ k: "triangle-by-angles", angles: [50, 60, 70] })).toBe("예각삼각형");
    expect(label({ k: "triangle-by-angles", angles: [30, 60, 90] })).toBe("직각삼각형");
    expect(label({ k: "triangle-by-angles", angles: [20, 40, 120] })).toBe("둔각삼각형");
    expect(() => label({ k: "triangle-by-angles", angles: [50, 60, 80] })).toThrow();
    expect(label({ k: "triangle-by-sides", sides: [5, 5, 5] })).toBe("정삼각형");
    expect(label({ k: "triangle-by-sides", sides: [5, 8, 5] })).toBe("이등변삼각형");
    expect(label({ k: "triangle-by-sides", sides: [4, 5, 6] })).toBe("세 변의 길이가 모두 다른 삼각형");
    expect(() => label({ k: "triangle-by-sides", sides: [1, 2, 3] })).toThrow();
    expect(label({ k: "argmax", labels: ["사과", "포도", "귤"], values: [8, 12, 6] })).toBe("포도");
    expect(label({ k: "argmin", labels: ["사과", "포도", "귤"], values: [8, 12, 6] })).toBe("귤");
    expect(() => label({ k: "argmax", labels: ["a", "b"], values: [3, 3] })).toThrow();
    expect([0, 1, 2, 3, 4].map((f) => label({ k: "likelihood", favorable: f, total: 4 }))).toEqual(["불가능하다", "~아닐 것 같다", "반반이다", "~일 것 같다", "확실하다"]);
    expect(label({ k: "pattern-next", items: ["●", "▲", "▲", "●", "▲", "▲"] })).toBe("●");
    expect(label({ k: "pattern-next", items: ["●", "▲", "▲", "●", "▲", "▲"], ahead: 2 })).toBe("▲");
    expect(() => label({ k: "pattern-next", items: ["●", "▲", "■"] })).toThrow();
    expect(answerMatches({ kind: "choice", options: ["둔각", "예각", "직각"], value: 1 }, evaluateExpr({ k: "angle-kind", degrees: 40 }))).toBe(true);
  });

  it("writes amounts with their units", () => {
    expect(formatUnits(130, UNITS.hourMin)).toBe("2시간 10분");
    expect(formatUnits(45, UNITS.hourMin)).toBe("45분");
    expect(formatUnits(0, UNITS.hourMin)).toBe("0분");
    expect(formatUnits(180, UNITS.clock)).toBe("3시");
    expect(formatUnits(105, UNITS.mCm)).toBe("1 m 5 cm");
    expect(formatUnits(3725, UNITS.hourMinSec)).toBe("1시간 2분 5초");
    expect(splitUnits(2050, UNITS.lMl)).toEqual([2, 50]);
    expect(answerText({ kind: "integer", value: 12, unit: "cm²" })).toBe("12 cm²");
    expect(answerText({ kind: "integer", value: 60, unit: "°" })).toBe("60°");
    expect(answerText({ kind: "integer", value: 7, unit: "개" })).toBe("7개");
    expect(sameValue(unitsAns(UNITS.mCm, 100), unitsAns(UNITS.mCm, 100))).toBe(true);
    expect(answerMatches(unitsAns(UNITS.kgG, 1500), evaluateExpr({ k: "add", a: { k: "num", v: 1000 }, b: { k: "num", v: 500 } }))).toBe(true);
  });

  it("matches the classic subtraction bug", () => {
    for (let seed = 1; seed < 500; seed++) {
      const item = generateItem("AS_2D_BORROW_SUB", seed, 2);
      if (item.prompt !== "52 − 38 = □") continue;
      expect(grade(item, { kind: "integer", text: "26" }).bug?.misconceptionId).toBe("SUB_SMALLER_FROM_LARGER");
      expect(grade(item, { kind: "integer", text: "24" }).bug?.misconceptionId).toBe("SUB_BORROW_NO_DECREMENT");
      return;
    }
    // 52−38 may not appear among these seeds; check the rule on any item instead.
    const item = generateItem("AS_2D_BORROW_SUB", 7, 2);
    const smaller = item.bugs.find((b) => b.misconceptionId === "SUB_SMALLER_FROM_LARGER");
    expect(smaller).toBeDefined();
  });
});

describe("items from ids", () => {
  it("rebuilds computation and word problems from their ids", () => {
    for (const s of SKILLS) {
      const item = generateItem(s.id, 4242, 2);
      expect(itemFromId(item.id), s.id).toEqual(item);
    }
    const word = generateWordItem("AS_2D_CARRY_ADD", 9, 2, "space");
    expect(word.format).toBe("word");
    expect(itemFromId(word.id)).toEqual(word);
  });

  it("refuses anything else", () => {
    for (const bad of ["", "AS_2D_CARRY_ADD", "NOPE#2#1", "AS_2D_CARRY_ADD#4#1", "AS_2D_CARRY_ADD#2#1#w:pirate", "AS_2D_CARRY_ADD#2#1; drop", "AS_2D_CARRY_ADD#2#99999999999"]) {
      expect(itemFromId(bad), bad).toBeNull();
    }
  });
});
