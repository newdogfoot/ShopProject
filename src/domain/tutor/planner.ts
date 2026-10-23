/**
 * Builds today's learning plan from the learner model.
 *
 *  warm-up review (1) → main skill(s) to learn → shaky skills to reinforce →
 *  due reviews (up to 3) → one challenge
 *
 * Only domains the child has been diagnosed in are planned. Main skills come
 * from different domains when possible (mixing areas helps remembering).
 */
import { dependentsOf, descendantsOf, diagnosisRange, learningRange, skillTerm } from "../curriculum/graph";
import { domainOf, getSkill, SKILLS } from "../curriculum/skills";
import { gradeBandOf, termIndex, type DomainId, type Grade, type Semester } from "../curriculum/types";
import { deriveStatus, getState, isSolid, type LearnerState, type SkillStatus } from "../model/learner";

export type PlanStepKind = "review" | "reinforce" | "learn" | "challenge";

export interface PlanStep {
  kind: PlanStepKind;
  skillId: string;
}

export interface PlanContext {
  grade: Grade;
  semester: Semester;
  now: number;
  /** Domains to plan (the ones diagnosed); all domains when missing. */
  domains?: DomainId[];
}

export const SESSION_MINUTES = { "1-2": 12, "3-4": 18, "5-6": 22 } as const;
const MAIN_SKILLS = { "1-2": 1, "3-4": 2, "5-6": 2 } as const;

export function statusOf(learner: LearnerState, id: string): SkillStatus {
  return deriveStatus(getState(learner, id));
}

/**
 * Skills that are not solid yet but whose prerequisites are: the zone where
 * learning works. `assumeKnown` marks prerequisites taken as known without
 * evidence (earlier-semester skills in domains not diagnosed yet).
 */
export function learnableSkills(learner: LearnerState, ids: string[], assumeKnown: (id: string) => boolean = () => false): string[] {
  return ids.filter((id) => {
    if (isSolid(statusOf(learner, id))) return false;
    return getSkill(id).prerequisites.every((p) => isSolid(statusOf(learner, p)) || assumeKnown(p));
  });
}

const STUCK_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function priority(learner: LearnerState, id: string, gapRange: Set<string>, now: number): number[] {
  const s = getState(learner, id);
  const st = deriveStatus(s);
  // A skill that just ended "stuck" waits a while; other skills go first.
  const recentlyStuck = s.stuckCycles > 0 && s.lastSeenAt !== null && now - s.lastSeenAt < STUCK_COOLDOWN_MS;
  return [
    recentlyStuck ? 1 : 0,
    st === "misconception" ? 0 : 1,
    gapRange.has(id) ? 0 : 1,
    skillTerm(id),
    -descendantsOf(id).size,
  ];
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function buildPlan(learner: LearnerState, ctx: PlanContext): PlanStep[] {
  const band = gradeBandOf(ctx.grade);
  const current = termIndex(ctx.grade, ctx.semester);
  const planned = (id: string) => !ctx.domains || ctx.domains.includes(domainOf(id));
  // A prerequisite from a domain not diagnosed yet counts as known if it was taught before this semester.
  const assumeKnown = (id: string) => !planned(id) && skillTerm(id) < current;
  const gapRange = new Set(diagnosisRange(ctx.grade, ctx.semester).filter(planned));
  let range = learningRange(ctx.grade, ctx.semester).filter(planned);

  let learnable = learnableSkills(learner, range, assumeKnown);
  if (learnable.length === 0) {
    // Everything up to now is solid: preview the next semester.
    range = SKILLS.filter((s) => skillTerm(s.id) <= current + 1 && planned(s.id)).map((s) => s.id);
    learnable = learnableSkills(learner, range, assumeKnown);
  }
  learnable.sort((a, b) => compare(priority(learner, a, gapRange, ctx.now), priority(learner, b, gapRange, ctx.now)));

  const due = range
    .filter((id) => {
      const s = getState(learner, id);
      const st = deriveStatus(s);
      return (st === "mastered" || st === "inferred") && s.nextReviewAt !== null && s.nextReviewAt <= ctx.now;
    })
    .sort((a, b) => (getState(learner, a).nextReviewAt ?? 0) - (getState(learner, b).nextReviewAt ?? 0));

  const shaky = range.filter((id) => statusOf(learner, id) === "shaky").sort((a, b) => skillTerm(a) - skillTerm(b));

  const plan: PlanStep[] = [];
  const reviews = [...due];
  if (reviews.length > 0) plan.push({ kind: "review", skillId: reviews.shift()! });

  // Keep main skills from the same chain apart (learning one unlocks the other next time),
  // and take them from different domains first.
  const main: string[] = [];
  const apart = (id: string) => !main.some((m) => descendantsOf(m).has(id) || descendantsOf(id).has(m));
  for (const sameDomainOk of [false, true]) {
    for (const id of learnable) {
      if (main.length >= MAIN_SKILLS[band]) break;
      if (main.includes(id) || !apart(id)) continue;
      if (!sameDomainOk && main.some((m) => domainOf(m) === domainOf(id))) continue;
      main.push(id);
    }
  }
  for (const id of main) plan.push({ kind: "learn", skillId: id });
  for (const id of shaky.slice(0, 2)) plan.push({ kind: "reinforce", skillId: id });
  for (const id of reviews.slice(0, 3)) plan.push({ kind: "review", skillId: id });

  const challengeable = range.filter((id) => statusOf(learner, id) === "mastered" && getSkill(id).wordProblems);
  if (challengeable.length > 0) {
    // Prefer the most advanced mastered skill.
    const best = challengeable.sort((a, b) => skillTerm(b) - skillTerm(a))[0];
    plan.push({ kind: "challenge", skillId: best });
  }
  return plan;
}

/** Skills unlocked when `id` becomes solid (for encouragement messages). */
export function unlockedBy(learner: LearnerState, id: string): string[] {
  return dependentsOf(id).filter((d) => getSkill(d).prerequisites.every((p) => p === id || isSolid(statusOf(learner, p))));
}
