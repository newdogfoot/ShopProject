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

/**
 * One unit of a several-unit answer such as 2시간 10분 or 1 m 5 cm.
 * `per` is how many base units (the last, smallest unit) one of this unit is.
 */
export interface UnitPart {
  label: string;
  per: number;
}

export type AnswerSpec =
  /** `unit` is shown after the answer box (cm, cm², °, %, 개 …); it is not typed. */
  | { kind: "integer"; value: number; unit?: string }
  | { kind: "decimal"; value: Rational; unit?: string }
  | { kind: "fraction"; value: Rational; form: FractionForm }
  | { kind: "quotient-remainder"; quotient: number; remainder: number }
  | { kind: "compare"; value: CompareSymbol }
  | { kind: "integer-list"; values: number[] }
  /** Pick one of the options; `value` is the index of the right one. */
  | { kind: "choice"; options: string[]; value: number }
  /**
   * An amount written with several units, largest first (시간·분, m·cm, L·mL …).
   * `value` is in base units. A right value that is not written in the simplest
   * way (75분 instead of 1시간 15분) gets the "form" status.
   */
  | { kind: "units"; parts: UnitPart[]; value: number }
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
  | { kind: "units"; values: string[] }
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

/** A point in figure units (x to the right, y up). */
export type Point = [number, number];

/**
 * Pieces of a flat figure. Coordinates are figure units (scaled to fit when drawn);
 * label offsets (`dx`, `dy`) and angle-mark sizes are screen pixels.
 */
export type FigureShape =
  | { s: "polygon"; points: Point[]; fill?: "soft" | "brand" | "none"; dashed?: boolean }
  /** A line piece; arrows "end" make a ray (반직선), "both" a line (직선). */
  | { s: "segment"; from: Point; to: Point; dashed?: boolean; arrows?: "end" | "both"; color?: "ink" | "accent" }
  | { s: "circle"; center: Point; r: number; fill?: "soft" | "none"; dashed?: boolean }
  /** An angle mark at `at`, from the direction towards `a` to the direction towards `b` (counterclockwise). */
  | { s: "angle-mark"; at: Point; a: Point; b: Point }
  /** A right-angle square at `at` between the directions towards `a` and `b`. */
  | { s: "right-angle"; at: Point; a: Point; b: Point }
  | { s: "dot"; at: Point }
  | { s: "label"; at: Point; text: string; dx?: number; dy?: number; bold?: boolean };

export type ShapeKind = "circle" | "triangle" | "square" | "rectangle" | "star" | "heart" | "pentagon" | "hexagon";
export type ShapeColor = "red" | "blue" | "yellow" | "green" | "purple" | "orange";
export interface ShapeToken {
  shape: ShapeKind;
  color: ShapeColor;
  size?: "big" | "small";
  /** A number or letter written on the shape. */
  text?: string;
}

export type SolidKind = "cuboid" | "prism" | "pyramid" | "cylinder" | "cone" | "sphere";

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
    }
  /** Analog clock; the hour hand moves with the minutes. */
  | { type: "clock"; hour: number; minute: number }
  /** A centimetre ruler (with millimetre ticks) and a bar lying on it from `from` to `to` (cm, steps of 0.1). */
  | { type: "ruler"; max: number; from: number; to: number }
  /**
   * An angle of `degrees` with its vertex at the bottom; the first side points at
   * `start` degrees (0 = right, counterclockwise). With `protractor`, a protractor
   * is laid on it (inner scale counterclockwise from the right, outer scale from the left).
   */
  | { type: "angle"; degrees: number; start?: number; protractor?: boolean; label?: string }
  /** A flat figure made of pieces (polygons, lines, circles, labels), optionally on grid paper. */
  | { type: "figure"; shapes: FigureShape[]; grid?: boolean }
  /**
   * A solid drawn in oblique view with hidden edges dashed. `sides` is the number
   * of sides of the base (prism, pyramid); `size` is [width, height, depth] for a cuboid.
   */
  | { type: "solid"; shape: SolidKind; sides?: number; size?: [number, number, number]; labels?: { width?: string; height?: string; depth?: string } }
  /** Stacked unit cubes (쌓기나무); heights[row][col], row 0 at the back. */
  | { type: "cubes"; heights: number[][] }
  /** The same stack seen from above, with the number of cubes in each square. */
  | { type: "cube-plan"; heights: number[][]; numbers?: boolean }
  | { type: "bar-chart"; title?: string; categories: string[]; values: number[]; step: number; max: number; unit?: string }
  /** Line graph; when `min` > 0 the axis shows a wavy break (물결선) below it. */
  | { type: "line-chart"; title?: string; labels: string[]; values: number[]; min: number; max: number; step: number; unit?: string }
  /** Picture graph: each big icon is `big`, each small icon is `small`. */
  | { type: "pictograph"; title?: string; rows: Array<{ label: string; value: number }>; icon: string; big: number; small: number; unit?: string }
  | { type: "table"; title?: string; header: string[]; rows: string[][] }
  /** Band (띠그래프) or circle (원그래프) graph of percentages. */
  | { type: "ratio-graph"; style: "band" | "pie"; title?: string; items: Array<{ label: string; percent: number }>; hidePercents?: boolean }
  /** Coloured shapes in a row (patterns: null is the "?" box) or a group (sorting). */
  | { type: "shapes"; items: Array<ShapeToken | null> }
  /** Everyday things as pictures (sorting and counting). */
  | { type: "objects"; items: Array<{ emoji: string; label?: string }> };

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
  | { k: "label"; value: string }
  /** 예각, 직각 or 둔각. */
  | { k: "angle-kind"; degrees: number }
  /** 예각삼각형, 직각삼각형 or 둔각삼각형, from the three angles. */
  | { k: "triangle-by-angles"; angles: [number, number, number] }
  /** 정삼각형, 이등변삼각형 or neither, from the three side lengths. */
  | { k: "triangle-by-sides"; sides: [number, number, number] }
  /** The label with the largest (or smallest) value; values must not tie at the top. */
  | { k: "argmax" | "argmin"; labels: string[]; values: number[] }
  /** How likely: favourable outcomes out of all equally likely ones. */
  | { k: "likelihood"; favorable: number; total: number }
  /** The item `ahead` places after the last one in a repeating pattern (default the next one). */
  | { k: "pattern-next"; items: string[]; ahead?: number };

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
