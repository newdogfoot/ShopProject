import { describe, expect, it } from "vitest";
import { getSkill, SKILLS, STRANDS } from "./skills";
import { ancestorsOf, descendantsOf, diagnosisRange, learningRange, maximalSkills, skillTerm, topologicalOrder } from "./graph";
import { MISCONCEPTIONS } from "../items/misconceptions";

describe("concept map", () => {
  it("has unique ids and known strands", () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SKILLS) expect(STRANDS.some((st) => st.id === s.strand)).toBe(true);
  });

  it("only references existing prerequisites", () => {
    for (const s of SKILLS) {
      for (const p of s.prerequisites) expect(() => getSkill(p), `${s.id} → ${p}`).not.toThrow();
    }
  });

  it("is acyclic and orders prerequisites first", () => {
    const order = topologicalOrder();
    expect(order).toHaveLength(SKILLS.length);
    const pos = new Map(order.map((id, i) => [id, i]));
    for (const s of SKILLS) {
      for (const p of s.prerequisites) expect(pos.get(p)!).toBeLessThan(pos.get(s.id)!);
    }
  });

  it("never needs a prerequisite taught after the skill", () => {
    for (const s of SKILLS) {
      for (const p of s.prerequisites) {
        expect(skillTerm(p), `${s.id} needs ${p}`).toBeLessThanOrEqual(skillTerm(s.id));
      }
    }
  });

  it("uses every misconception and only known ones", () => {
    const known = new Set(MISCONCEPTIONS.map((m) => m.id));
    const used = new Set<string>(SKILLS.flatMap((s) => [...s.misconceptions]));
    for (const id of used) expect(known.has(id), id).toBe(true);
    for (const id of known) expect(used.has(id), `${id} is unused`).toBe(true);
  });

  it("computes ranges by semester", () => {
    expect(diagnosisRange(1, 1)).toEqual([]);
    expect(diagnosisRange(1, 2)).toEqual(["NUM_UPTO9", "NUM_UPTO50", "AS_1D_BASIC"]);
    expect(learningRange(1, 1)).toEqual(["NUM_UPTO9", "NUM_UPTO50", "AS_1D_BASIC"]);
    expect(diagnosisRange(6, 2).length).toBeGreaterThan(40);
  });

  it("walks ancestors and descendants", () => {
    expect(ancestorsOf("FRAC_DIFF_DEN_ADD").has("GCD_LCM")).toBe(true);
    expect(ancestorsOf("FRAC_DIFF_DEN_ADD").has("MUL_FACTS")).toBe(true);
    expect(descendantsOf("MUL_FACTS").has("DIV_FACTS")).toBe(true);
    expect(maximalSkills(["NUM_UPTO9", "NUM_UPTO50", "AS_1D_BASIC"]).sort()).toEqual(["AS_1D_BASIC", "NUM_UPTO50"]);
  });
});
