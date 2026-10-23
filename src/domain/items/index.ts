/** Item generation entry point: reproducible problems from (skill, difficulty, seed). */
import { createRng, deriveSeed } from "../math/rng";
import { isTheme, renderStory, type Theme } from "../content/stories";
import type { SkillId } from "../curriculum/skills";
import type { Difficulty, Item } from "./types";
import type { Generator } from "./generators/number";
import { genNum3Digit, genNum4Digit, genNumLarge, genNumUpTo100, genNumUpTo50, genNumUpTo9 } from "./generators/number";
import {
  genAs1dBasic,
  genAs1dBorrowSub,
  genAs1dCarryAdd,
  genAs2dBorrowSub,
  genAs2dCarryAdd,
  genAs2dNoCarry,
  genAs3dAdd,
  genAs3dSub,
  genAsMake10,
} from "./generators/addsub";
import { genDivFacts, genDivMeaning, genDivNBy1, genDivNBy2, genMulFacts, genMulMeaning, genMulNBy1, genMulNBy2 } from "./generators/muldiv";
import { genFactorMultiple, genGcdLcm, genMixOrder } from "./generators/mixed";
import {
  genFracCompare,
  genFracDiffDenAdd,
  genFracDiffDenSub,
  genFracDivFrac,
  genFracDivNat,
  genFracEquiv,
  genFracMeaning,
  genFracMixedImproper,
  genFracMul,
  genFracOfQuantity,
  genFracSameDenAdd,
  genFracSameDenSub,
} from "./generators/fraction";
import { genDecAdd, genDecDivDec, genDecDivNat, genDecHundredths, genDecMul, genDecSub, genDecTenths } from "./generators/decimal";

export const GENERATORS: Record<SkillId, Generator> = {
  NUM_UPTO9: genNumUpTo9,
  NUM_UPTO50: genNumUpTo50,
  NUM_UPTO100: genNumUpTo100,
  NUM_3DIGIT: genNum3Digit,
  NUM_4DIGIT: genNum4Digit,
  NUM_LARGE: genNumLarge,
  AS_1D_BASIC: genAs1dBasic,
  AS_MAKE10: genAsMake10,
  AS_1D_CARRY_ADD: genAs1dCarryAdd,
  AS_1D_BORROW_SUB: genAs1dBorrowSub,
  AS_2D_NOCARRY: genAs2dNoCarry,
  AS_2D_CARRY_ADD: genAs2dCarryAdd,
  AS_2D_BORROW_SUB: genAs2dBorrowSub,
  AS_3D_ADD: genAs3dAdd,
  AS_3D_SUB: genAs3dSub,
  MUL_MEANING: genMulMeaning,
  MUL_FACTS: genMulFacts,
  MUL_NBY1: genMulNBy1,
  MUL_NBY2: genMulNBy2,
  DIV_MEANING: genDivMeaning,
  DIV_FACTS: genDivFacts,
  DIV_NBY1: genDivNBy1,
  DIV_NBY2: genDivNBy2,
  MIX_ORDER: genMixOrder,
  FACTOR_MULTIPLE: genFactorMultiple,
  GCD_LCM: genGcdLcm,
  FRAC_MEANING: genFracMeaning,
  FRAC_COMPARE: genFracCompare,
  FRAC_OF_QUANTITY: genFracOfQuantity,
  FRAC_MIXED_IMPROPER: genFracMixedImproper,
  FRAC_SAME_DEN_ADD: genFracSameDenAdd,
  FRAC_SAME_DEN_SUB: genFracSameDenSub,
  FRAC_EQUIV: genFracEquiv,
  FRAC_DIFF_DEN_ADD: genFracDiffDenAdd,
  FRAC_DIFF_DEN_SUB: genFracDiffDenSub,
  FRAC_MUL: genFracMul,
  FRAC_DIV_NAT: genFracDivNat,
  FRAC_DIV_FRAC: genFracDivFrac,
  DEC_TENTHS: genDecTenths,
  DEC_HUNDREDTHS: genDecHundredths,
  DEC_ADD: genDecAdd,
  DEC_SUB: genDecSub,
  DEC_MUL: genDecMul,
  DEC_DIV_NAT: genDecDivNat,
  DEC_DIV_DEC: genDecDivDec,
};

export interface GenerateOptions {
  /** Retell the problem as a word problem (only when the item supports it). */
  word?: boolean;
  theme?: Theme;
}

export function itemId(skillId: string, difficulty: Difficulty, seed: number, word?: Theme): string {
  return `${skillId}#${difficulty}#${seed}${word ? `#w:${word}` : ""}`;
}

export function generateItem(skillId: string, seed: number, difficulty: Difficulty, opts: GenerateOptions = {}): Item {
  const generator = GENERATORS[skillId as SkillId];
  if (!generator) throw new Error(`no generator for ${skillId}`);
  const core = generator(createRng(seed), difficulty);
  const base: Item = { ...core, id: itemId(skillId, difficulty, seed), skillId, difficulty, seed, format: "computation" };
  if (!opts.word || !core.story) return base;
  const theme = opts.theme ?? "snack";
  const text = renderStory(core.story, theme, createRng(deriveSeed(seed, "story", theme)));
  const keepInstruction = core.answer.kind === "fraction" && core.answer.form === "reduced" ? core.instruction : undefined;
  return {
    ...base,
    id: itemId(skillId, difficulty, seed, theme),
    format: "word",
    prompt: text,
    instruction: keepInstruction,
    showVisual: false,
    steps: core.prompt.includes("□") ? [`식을 세워요: ${core.prompt}`, ...core.steps] : core.steps,
  };
}

/**
 * Generates a word problem for the skill, trying a few seeds until the generated
 * item supports one. Returns a computation item if none does.
 */
export function generateWordItem(skillId: string, seed: number, difficulty: Difficulty, theme: Theme): Item {
  for (let i = 0; i < 12; i++) {
    const s = deriveSeed(seed, "word", i);
    const item = generateItem(skillId, s, difficulty, { word: true, theme });
    if (item.format === "word") return item;
  }
  return generateItem(skillId, seed, difficulty);
}

/**
 * Rebuilds a computation or word-problem item from its id (ids encode skill,
 * difficulty, seed and theme). Returns null for anything that is not such an id.
 */
export function itemFromId(id: string): Item | null {
  const m = /^([A-Z0-9_]+)#([123])#(\d{1,10})(?:#w:([a-z]+))?$/.exec(id);
  if (!m) return null;
  const [, skillId, d, seedText, theme] = m;
  if (!(skillId in GENERATORS)) return null;
  if (theme !== undefined && !isTheme(theme)) return null;
  const item = generateItem(skillId, Number(seedText), Number(d) as Difficulty, theme ? { word: true, theme } : {});
  return item.id === id ? item : null;
}

export type { Item, Difficulty } from "./types";
