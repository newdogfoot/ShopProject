/**
 * Reason items: "why does this method work?" as a pick-one question or a short
 * written explanation. Built from the reviewed questions in content/reasons.ts.
 */
import { createRng, deriveSeed } from "../math/rng";
import { getReason, reasonsFor, type ReasonSpec } from "../content/reasons";
import { getMisconception } from "./misconceptions";
import type { BugSpec, Item } from "./types";

export type ReasonMode = "choice" | "write";

/** Longest written explanation accepted (characters). */
export const REASON_MAX_LENGTH = 100;

export function reasonItem(spec: ReasonSpec, seed: number, mode: ReasonMode): Item {
  const base = {
    id: `${spec.skillId}#reason#${spec.id}#${seed}#${mode}`,
    skillId: spec.skillId,
    difficulty: 2 as const,
    seed,
    format: "reason" as const,
    reasonId: spec.id,
    prompt: spec.prompt,
    steps: [spec.model],
  };
  if (mode === "write") {
    return {
      ...base,
      instruction: "까닭을 짧게 써 보세요.",
      answer: { kind: "text", rubric: spec.rubric, model: spec.model, maxLength: REASON_MAX_LENGTH },
      bugs: [],
      guessRate: 0.05,
      check: { k: "label", value: spec.model },
    };
  }
  const options = createRng(deriveSeed(seed, "options")).shuffle([spec.correct, ...spec.distractors.map((d) => d.text)]);
  const bugs: BugSpec[] = spec.distractors
    .filter((d) => d.misconceptionId)
    .map((d) => ({
      misconceptionId: d.misconceptionId!,
      answer: { kind: "choice", options, value: options.indexOf(d.text) },
      feedback: getMisconception(d.misconceptionId!).childExplain,
    }));
  return {
    ...base,
    instruction: "알맞은 것을 골라 보세요.",
    answer: { kind: "choice", options, value: options.indexOf(spec.correct) },
    bugs,
    guessRate: 1 / options.length,
    check: { k: "label", value: spec.correct },
  };
}

/** A reason question for the skill (one of its questions, picked by the seed). */
export function generateReasonItem(skillId: string, seed: number, mode: ReasonMode): Item {
  const specs = reasonsFor(skillId);
  if (specs.length === 0) throw new Error(`no reason questions for ${skillId}`);
  return reasonItem(createRng(seed).pick(specs), seed, mode);
}

/** Rebuilds a reason item from its id, or null when the id is not a valid reason item id. */
export function reasonItemFromId(id: string): Item | null {
  const [skillId, tag, reasonId, seedText, mode] = id.split("#");
  if (tag !== "reason" || (mode !== "choice" && mode !== "write") || !/^\d{1,10}$/.test(seedText ?? "")) return null;
  const spec = getReason(reasonId);
  if (!spec || spec.skillId !== skillId) return null;
  return reasonItem(spec, Number(seedText), mode);
}
