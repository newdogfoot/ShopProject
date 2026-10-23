import { describe, expect, it } from "vitest";
import { getReason, hasReasons, REASONS, reasonsFor } from "./reasons";
import { isSkillId } from "../curriculum/skills";
import { isMisconceptionId } from "../items/misconceptions";
import { generateReasonItem, reasonItem, reasonItemFromId } from "../items/reason";
import { answerToInput, grade, wrongInput } from "../items/answer";

const braces = (t: string) => [(t.match(/\{/g) ?? []).length, (t.match(/\}/g) ?? []).length];

describe("reason questions", () => {
  it("are well formed", () => {
    expect(REASONS.length).toBeGreaterThanOrEqual(30);
    const ids = new Set<string>();
    for (const r of REASONS) {
      expect(ids.has(r.id), r.id).toBe(false);
      ids.add(r.id);
      expect(isSkillId(r.skillId), r.id).toBe(true);
      expect(r.id.startsWith(`${r.skillId}.`), r.id).toBe(true);
      expect(r.distractors.length, r.id).toBeGreaterThanOrEqual(2);
      expect(r.distractors.length, r.id).toBeLessThanOrEqual(3);
      expect(r.rubric.length, r.id).toBeGreaterThanOrEqual(1);
      expect(r.rubric.length, r.id).toBeLessThanOrEqual(3);
      const options = [r.correct, ...r.distractors.map((d) => d.text)];
      expect(new Set(options).size, r.id).toBe(options.length);
      for (const d of r.distractors) if (d.misconceptionId) expect(isMisconceptionId(d.misconceptionId), `${r.id} ${d.misconceptionId}`).toBe(true);
      for (const t of [r.prompt, r.model, ...r.rubric, ...options]) {
        expect(t, r.id).not.toMatch(/undefined|NaN/);
        const [open, close] = braces(t);
        expect(open, `${r.id}: ${t}`).toBe(close);
      }
      expect(r.model.length, r.id).toBeLessThanOrEqual(200);
    }
  });

  it("make pick-one items that grade the right reason and reveal misconceptions", () => {
    for (const r of REASONS) {
      for (let seed = 1; seed <= 20; seed++) {
        const item = reasonItem(r, seed, "choice");
        expect(item.format).toBe("reason");
        expect(grade(item, answerToInput(item.answer)).status, r.id).toBe("correct");
        expect(grade(item, wrongInput(item.answer)).status, r.id).toBe("wrong");
        for (const bug of item.bugs) {
          const result = grade(item, answerToInput(bug.answer!));
          expect(result.status, r.id).toBe("wrong");
          expect(result.bug?.misconceptionId, r.id).toBe(bug.misconceptionId);
        }
        expect(item.guessRate).toBeLessThan(0.5);
        expect(reasonItemFromId(item.id)).toEqual(item);
      }
    }
  });

  it("shuffle the options", () => {
    const r = REASONS[0];
    const positions = new Set(Array.from({ length: 30 }, (_, s) => {
      const a = reasonItem(r, s + 1, "choice").answer;
      return a.kind === "choice" ? a.value : -1;
    }));
    expect(positions.size).toBeGreaterThan(1);
  });

  it("leave written answers to the app (graded against the rubric)", () => {
    const item = generateReasonItem("FRAC_DIFF_DEN_ADD", 3, "write");
    expect(item.answer).toMatchObject({ kind: "text", maxLength: 100 });
    expect(grade(item, { kind: "text", text: "분모가 달라서 통분해요" }).status).toBe("invalid");
    expect(reasonItemFromId(item.id)).toEqual(item);
  });

  it("are found by skill and id, and bad ids are refused", () => {
    expect(hasReasons("FRAC_DIFF_DEN_ADD")).toBe(true);
    expect(hasReasons("NUM_UPTO9")).toBe(false);
    expect(reasonsFor("FRAC_DIFF_DEN_ADD").every((r) => r.skillId === "FRAC_DIFF_DEN_ADD")).toBe(true);
    expect(getReason("FRAC_DIFF_DEN_ADD.common-denominator")?.skillId).toBe("FRAC_DIFF_DEN_ADD");
    expect(reasonItemFromId("FRAC_DIFF_DEN_ADD#reason#NUM_3DIGIT.zero-placeholder#1#choice")).toBeNull();
    expect(reasonItemFromId("FRAC_DIFF_DEN_ADD#reason#FRAC_DIFF_DEN_ADD.common-denominator#1#speak")).toBeNull();
    expect(reasonItemFromId("FRAC_DIFF_DEN_ADD#2#1")).toBeNull();
  });
});
