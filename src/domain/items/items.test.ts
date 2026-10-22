import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum/skills";
import { generateItem, generateWordItem, GENERATORS } from "./index";
import { answerMatches, evaluateExpr } from "./check";
import { answerToInput, grade } from "./answer";
import { sameValue } from "./helpers";
import { isMisconceptionId } from "./misconceptions";
import { THEMES } from "../content/stories";
import type { Difficulty, Item } from "./types";

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
