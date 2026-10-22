export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Semester = 1 | 2;
export type GradeBand = "1-2" | "3-4" | "5-6";

export type StrandId = "NUM" | "ADDSUB" | "MUL" | "DIV" | "MIXED" | "FRAC" | "DEC";

export interface Strand {
  id: StrandId;
  name: string;
  emoji: string;
}

export interface Skill {
  id: string;
  strand: StrandId;
  /** Short Korean name shown to children and guardians. */
  name: string;
  /** One-sentence learning goal. */
  goal: string;
  /** Typical grade and semester in Korean textbooks (publishers may differ slightly). */
  grade: Grade;
  semester: Semester;
  /**
   * Achievement standard area in the 2022 revised curriculum, e.g. "[4수01-…]".
   * Exact standard numbers still need to be checked against the official text.
   */
  standardArea: string;
  /** Direct prerequisites (true learning dependencies, not just textbook order). */
  prerequisites: string[];
  /** Misconception ids that this skill's generators can detect. */
  misconceptions: string[];
  /** Correct answers slower than this count as "not yet fluent". */
  slowMs: number;
  /** Whether word problems can be made from this skill's items. */
  wordProblems: boolean;
}

export function gradeBandOf(grade: Grade): GradeBand {
  return grade <= 2 ? "1-2" : grade <= 4 ? "3-4" : "5-6";
}

/** Linear index of a grade-semester: 1-1 → 1, 1-2 → 2, … 6-2 → 12. */
export function termIndex(grade: Grade, semester: Semester): number {
  return (grade - 1) * 2 + semester;
}

/**
 * Semester for a date in the Korean school year: March–August is the first
 * semester, September–February the second.
 */
export function semesterOf(date: Date): Semester {
  const month = date.getMonth() + 1;
  return month >= 3 && month <= 8 ? 1 : 2;
}
