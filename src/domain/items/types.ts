import type { Rational } from "../math/rational";

export type Difficulty = 1 | 2 | 3;

export type CompareSymbol = "<" | ">" | "=";

/**
 * How a fraction answer must be written.
 * - any: any equivalent value (2/4 for 1/2 is fine)
 * - reduced: lowest terms; improper or mixed both fine ("기약분수로 나타내세요")
 * - mixed: a mixed number with a proper fraction part ("대분수로 나타내세요")
 * - improper: a single fraction, no whole part ("가분수로 나타내세요")
 */
export type FractionForm = "any" | "reduced" | "mixed" | "improper";

export type AnswerSpec =
  | { kind: "integer"; value: number }
  | { kind: "decimal"; value: Rational }
  | { kind: "fraction"; value: Rational; form: FractionForm }
  | { kind: "quotient-remainder"; quotient: number; remainder: number }
  | { kind: "compare"; value: CompareSymbol }
  | { kind: "integer-list"; values: number[] }
  /** Pick one of the options; `value` is the index of the right one. */
  | { kind: "choice"; options: string[]; value: number }
  /**
   * A short written explanation. Code cannot grade it: the app grades it against
   * the rubric (AI) and reports the result with `submitReasonResult`.
   */
  | { kind: "text"; rubric: string[]; model: string; maxLength: number };

export type AnswerKind = AnswerSpec["kind"];

/** What the keypad sends. Every field is the raw text the child typed. */
export type StudentAnswer =
  | { kind: "integer"; text: string }
  | { kind: "decimal"; text: string }
  | { kind: "fraction"; whole: string; num: string; den: string }
  | { kind: "quotient-remainder"; quotient: string; remainder: string }
  | { kind: "compare"; value: string }
  | { kind: "integer-list"; text: string }
  | { kind: "choice"; index: string }
  | { kind: "text"; text: string };

/** Rule-based wrong-answer patterns that a single value cannot describe. */
export type BugRule =
  | { type: "remainder-too-big"; dividend: number; divisor: number }
  | { type: "listed-multiples"; n: number }
  | { type: "factors-missing-trivial"; n: number };

/** A predicted wrong answer tied to a misconception, with child-facing feedback. */
export interface BugSpec {
  misconceptionId: string;
  /** Wrong value this misconception produces (compared by value, not by form). */
  answer?: AnswerSpec;
  rule?: BugRule;
  /** Short feedback for the child (math markup allowed). */
  feedback: string;
}

export type Visual =
  | { type: "dots"; count: number; emoji?: string; groupSize?: number }
  | {
      type: "base-ten";
      hundreds: number;
      tens: number;
      ones: number;
      /** Optional second number drawn after a plus sign (for addition). */
      plus?: { hundreds: number; tens: number; ones: number };
    }
  | { type: "number-line"; min: number; max: number; step: number; marks?: number[]; jumps?: Array<{ from: number; to: number }> }
  | { type: "array"; rows: number; cols: number }
  | {
      type: "fraction-bar";
      parts: number;
      shaded: number;
      bars?: number;
      /** A second bar of the same length drawn underneath, for comparing two fractions. */
      compare?: { parts: number; shaded: number };
    };

/**
 * Semantic description of a question, evaluated independently in tests to check
 * that each generator's answer is right.
 */
export type Expr =
  | { k: "num"; v: number | Rational }
  | { k: "add" | "sub" | "mul" | "div"; a: Expr; b: Expr }
  | { k: "cmp"; a: Expr; b: Expr }
  | { k: "divmod"; a: number; b: number }
  | { k: "gcd" | "lcm"; a: number; b: number }
  | { k: "factors"; n: number }
  | { k: "count-factors"; n: number }
  | { k: "places"; terms: Array<[number, number]> }
  | { k: "digit-value"; n: number | Rational; digit: number }
  | { k: "max"; items: Expr[] }
  | { k: "korean"; text: string }
  /** A literal label (for choice and written answers; checked by content tests, not computed). */
  | { k: "label"; value: string };

/** Data for turning an item into a word problem (numbers stay the same). */
export type StorySpec =
  | { kind: "add"; a: number; b: number }
  | { kind: "sub-takeaway"; a: number; b: number }
  | { kind: "sub-compare"; a: number; b: number }
  | { kind: "mul-groups"; groups: number; each: number }
  | { kind: "div-share"; total: number; parts: number; withRemainder: boolean }
  | { kind: "div-group"; total: number; size: number; withRemainder: boolean }
  | { kind: "frac-of"; total: number; frac: Rational }
  | { kind: "qty-add"; a: string; b: string; unit: QuantityUnit }
  | { kind: "qty-sub"; a: string; b: string; unit: QuantityUnit }
  | { kind: "qty-mul-rate"; rate: string; times: string; unit: QuantityUnit }
  | { kind: "qty-div-share"; total: string; parts: number; unit: QuantityUnit }
  | { kind: "qty-div-group"; total: string; size: string; unit: QuantityUnit }
  | { kind: "qty-frac-of"; total: string; frac: string; unit: QuantityUnit }
  | { kind: "gcd"; a: number; b: number }
  | { kind: "lcm"; a: number; b: number };

export type QuantityUnit = "L" | "kg" | "m";

export interface Item {
  /**
   * `${skillId}#${difficulty}#${seed}`, plus `#w:${theme}` for word problems.
   * Reason questions use `${skillId}#reason#${reasonId}#${seed}#${mode}`.
   */
  id: string;
  skillId: string;
  difficulty: Difficulty;
  seed: number;
  /** "reason": a question about why a method works (pick the reason or write it). */
  format: "computation" | "word" | "reason";
  /** The reason question this item asks (reason items only). */
  reasonId?: string;
  /** Problem text in math markup. */
  prompt: string;
  /** Extra instruction such as "기약분수로 나타내세요.". */
  instruction?: string;
  answer: AnswerSpec;
  bugs: BugSpec[];
  /** Worked solution, one step per line, last line gives the answer. */
  steps: string[];
  /** Picture for explanations; shown in the problem too when `showVisual` is set. */
  visual?: Visual;
  showVisual?: boolean;
  /** Present when the item can be retold as a word problem. */
  story?: StorySpec;
  /** Probability of a lucky guess for this format (used by the learner model). */
  guessRate: number;
  /** Independent description of the question for tests. */
  check: Expr;
}

/** What a generator returns; ids and metadata are filled in by `generateItem`. */
export type GeneratedItem = Omit<Item, "id" | "skillId" | "difficulty" | "seed" | "format">;
