/** Prerequisite-graph helpers over the concept map. */
import { getSkill, SKILLS } from "./skills";
import { termIndex, type Grade, type Semester, type Skill } from "./types";

const ALL: readonly Skill[] = SKILLS;

const children = new Map<string, string[]>();
for (const s of ALL) {
  for (const p of s.prerequisites) {
    const list = children.get(p) ?? [];
    list.push(s.id);
    children.set(p, list);
  }
}

/** Skills that list `id` as a direct prerequisite. */
export function dependentsOf(id: string): string[] {
  return children.get(id) ?? [];
}

function walk(start: string, next: (id: string) => readonly string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...next(start)];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...next(id));
  }
  return seen;
}

/** All prerequisites, direct and indirect. */
export function ancestorsOf(id: string): Set<string> {
  return walk(id, (x) => getSkill(x).prerequisites);
}

/** All skills that depend on `id`, directly or indirectly. */
export function descendantsOf(id: string): Set<string> {
  return walk(id, dependentsOf);
}

/** Skills in a stable learning order: prerequisites first, then by grade/semester. */
export function topologicalOrder(ids: Iterable<string> = ALL.map((s) => s.id)): string[] {
  const wanted = new Set(ids);
  const order: string[] = [];
  const done = new Set<string>();
  const sorted = [...wanted].sort((a, b) => {
    const sa = getSkill(a);
    const sb = getSkill(b);
    return termIndex(sa.grade, sa.semester) - termIndex(sb.grade, sb.semester) || ALL.indexOf(sa) - ALL.indexOf(sb);
  });
  const visit = (id: string, trail: Set<string>) => {
    if (done.has(id)) return;
    if (trail.has(id)) throw new Error(`prerequisite cycle at ${id}`);
    trail.add(id);
    for (const p of getSkill(id).prerequisites) {
      if (wanted.has(p)) visit(p, trail);
    }
    trail.delete(id);
    done.add(id);
    order.push(id);
  };
  for (const id of sorted) visit(id, new Set());
  return order;
}

/** Term index of a skill's typical placement (1-1 → 1 … 6-2 → 12). */
export function skillTerm(id: string): number {
  const s = getSkill(id);
  return termIndex(s.grade, s.semester);
}

/**
 * Skills a student "should already know" (taught in earlier semesters).
 * These are the only skills that diagnosis may call a gap.
 */
export function diagnosisRange(grade: Grade, semester: Semester): string[] {
  const current = termIndex(grade, semester);
  return ALL.filter((s) => termIndex(s.grade, s.semester) < current).map((s) => s.id);
}

/** Skills up to and including the current semester (gaps + current progress). */
export function learningRange(grade: Grade, semester: Semester): string[] {
  const current = termIndex(grade, semester);
  return ALL.filter((s) => termIndex(s.grade, s.semester) <= current).map((s) => s.id);
}

/** Skills in `ids` that no other skill in `ids` depends on (the "tops" of the range). */
export function maximalSkills(ids: Iterable<string>): string[] {
  const set = new Set(ids);
  return [...set].filter((id) => !dependentsOf(id).some((d) => set.has(d)));
}
