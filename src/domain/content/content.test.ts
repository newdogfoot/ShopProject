import { describe, expect, it } from "vitest";
import { SKILLS } from "../curriculum/skills";
import { generateItem } from "../items";
import { SKILL_CONTENT } from "./skill-content";
import { templateExplanation, templateHint, parentTipFor } from "./explanations";
import type { Strategy } from "../tutor/cycle";

const STRATEGIES: Strategy[] = ["misconception", "concrete", "analogy", "procedure"];

describe("template content", () => {
  it("covers every skill", () => {
    for (const s of SKILLS) {
      const c = SKILL_CONTENT[s.id];
      expect(c, s.id).toBeDefined();
      expect(c.keyIdea.length).toBeGreaterThan(10);
      expect(c.concrete.length).toBeGreaterThan(0);
      expect(c.analogy.length).toBeGreaterThan(0);
      expect(c.hint.length).toBeGreaterThan(5);
      expect(parentTipFor(s.id).length).toBeGreaterThan(5);
    }
  });

  it("builds explanations and hints for every strategy and level", () => {
    for (const s of SKILLS) {
      const example = generateItem(s.id, 11, 2);
      for (const strategy of STRATEGIES) {
        const e = templateExplanation({
          skillId: s.id,
          strategy,
          misconceptionId: strategy === "misconception" ? (s.misconceptions[0] ?? null) : null,
          example,
          gradeBand: "3-4",
        });
        expect(e.steps.length, `${s.id} ${strategy}`).toBeGreaterThan(1);
        const text = [e.title, e.summary, ...e.steps.map((x) => x.text)].join("\n");
        expect(text).not.toMatch(/undefined|NaN/);
      }
      for (const level of [1, 2, 3]) {
        expect(templateHint(example, level)).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
