/**
 * Template explanations and hints. The AI layer can replace the wording, but
 * these always work and the numbers in them always come from code.
 */
import { getSkill } from "../curriculum/skills";
import type { SkillId } from "../curriculum/skills";
import type { GradeBand } from "../curriculum/types";
import { getMisconception } from "../items/misconceptions";
import type { Item, Visual } from "../items/types";
import type { Strategy } from "../tutor/cycle";
import { SKILL_CONTENT } from "./skill-content";

export interface ExplanationStep {
  text: string;
  visual?: Visual;
}

export interface Explanation {
  title: string;
  steps: ExplanationStep[];
  summary: string;
  source: "template" | "ai";
}

export const STRATEGY_TITLE: Record<Strategy, string> = {
  misconception: "이렇게 생각했나요?",
  concrete: "그림으로 알아봐요",
  analogy: "생활 속 예로 알아봐요",
  procedure: "차근차근 순서대로 풀어요",
};

export interface ExplanationInput {
  skillId: string;
  strategy: Strategy;
  misconceptionId: string | null;
  example: Item;
  gradeBand: GradeBand;
}

function exampleSteps(example: Item): ExplanationStep[] {
  return [{ text: `예를 들어 볼게요: ${example.prompt}`, visual: example.visual }, ...example.steps.map((t) => ({ text: t }))];
}

export function templateExplanation(input: ExplanationInput): Explanation {
  const skill = getSkill(input.skillId);
  const content = SKILL_CONTENT[input.skillId as SkillId];
  const title = STRATEGY_TITLE[input.strategy];
  let steps: ExplanationStep[];
  switch (input.strategy) {
    case "misconception": {
      const m = input.misconceptionId ? getMisconception(input.misconceptionId) : null;
      steps = [
        ...(m ? [{ text: m.childExplain }] : []),
        { text: content.keyIdea, visual: input.example.visual },
        ...exampleSteps(input.example).slice(1),
      ];
      break;
    }
    case "concrete":
      steps = [
        { text: content.keyIdea },
        ...content.concrete.map((t, i) => ({ text: t, visual: i === 0 ? input.example.visual : undefined })),
        ...exampleSteps(input.example),
      ];
      break;
    case "analogy":
      steps = [...content.analogy.map((t) => ({ text: t })), { text: content.keyIdea }, ...exampleSteps(input.example)];
      break;
    case "procedure":
      steps = [{ text: "한 단계씩 따라 해 봐요." }, ...exampleSteps(input.example)];
      break;
  }
  return { title, steps, summary: skill.goal, source: "template" };
}

/** Hint text for a level (1 question, 2 first step, 3 all steps but the answer). */
export function templateHint(item: Item, level: number, bugFeedback?: string): string {
  const content = SKILL_CONTENT[item.skillId as SkillId];
  if (level <= 1) return bugFeedback ?? content.hint;
  if (level === 2) return `첫 단계를 알려 줄게요: ${item.steps[0]}`;
  const almost = item.steps.slice(0, Math.max(1, item.steps.length - 1));
  return `여기까지 따라와 보세요:\n${almost.join("\n")}`;
}

export function parentTipFor(skillId: string): string {
  return SKILL_CONTENT[skillId as SkillId].parentTip;
}
