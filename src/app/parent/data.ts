/** Summaries for the guardian dashboard and child report. */
import "server-only";
import type { Db } from "@/db/client";
import { attemptStats, loadLearner, misconceptionExamples } from "@/db/queries";
import type { students } from "@/db/schema";
import { getSkill } from "@/domain/curriculum/skills";
import { learningRange } from "@/domain/curriculum/graph";
import type { Grade, Semester } from "@/domain/curriculum/types";
import { deriveStatus, getState, type LearnerState, type SkillStatus } from "@/domain/model/learner";
import { getMisconception } from "@/domain/items/misconceptions";
import { parentTipFor } from "@/domain/content/explanations";
import { buildPlan } from "@/domain/tutor/planner";

export type StudentRow = typeof students.$inferSelect;

export interface ChildSummary {
  student: StudentRow;
  learner: LearnerState;
  counts: Record<"mastered" | "learning" | "misconception" | "stuck", number>;
  week: { problems: number; accuracy: number | null; minutes: number };
  nextSkills: string[];
}

export async function childSummary(db: Db, student: StudentRow, now = new Date()): Promise<ChildSummary> {
  const learner = await loadLearner(db, student.id);
  const grade = student.grade as Grade;
  const semester = student.semester as Semester;
  const range = learningRange(grade, semester);
  const statuses = range.map((id) => deriveStatus(getState(learner, id)));
  const count = (pred: (s: SkillStatus) => boolean) => statuses.filter(pred).length;
  const stats = await attemptStats(db, student.id, new Date(now.getTime() - 7 * 24 * 3600 * 1000));
  // Before the diagnosis the record is empty, so a plan would be meaningless.
  const plan = student.diagnosedAt ? buildPlan(learner, { grade, semester, now: now.getTime() }) : [];
  return {
    student,
    learner,
    counts: {
      mastered: count((s) => s === "mastered" || s === "inferred"),
      learning: count((s) => s === "gap" || s === "inferred-gap" || s === "shaky"),
      misconception: count((s) => s === "misconception"),
      stuck: Object.values(learner).filter((s) => s.stuckCycles > 0 && deriveStatus(s) !== "mastered").length,
    },
    week: {
      problems: stats.count,
      accuracy: stats.count ? Math.round((stats.correct / stats.count) * 100) : null,
      minutes: Math.round(stats.ms / 60000),
    },
    nextSkills: plan.filter((p) => p.kind === "learn").map((p) => p.skillId),
  };
}

export interface MisconceptionReport {
  id: string;
  name: string;
  explain: string;
  tip: string;
  skillName: string;
  example: { prompt: string; shown: string } | null;
}

export async function misconceptionReport(db: Db, studentId: string, learner: LearnerState): Promise<MisconceptionReport[]> {
  const examples = await misconceptionExamples(db, studentId);
  const out: MisconceptionReport[] = [];
  for (const state of Object.values(learner)) {
    if (deriveStatus(state) !== "misconception") continue;
    for (const [id, n] of Object.entries(state.misconceptions)) {
      if (n <= 0) continue;
      const m = getMisconception(id);
      const ex = examples.get(id);
      out.push({
        id,
        name: m.name,
        explain: m.parentExplain,
        tip: m.parentTip,
        skillName: getSkill(state.skillId).name,
        example: ex ? { prompt: ex.prompt, shown: ex.shown } : null,
      });
    }
  }
  return out;
}

export function stuckReport(learner: LearnerState) {
  return Object.values(learner)
    .filter((s) => s.stuckCycles > 0 && deriveStatus(s) !== "mastered")
    .map((s) => ({ skillId: s.skillId, name: getSkill(s.skillId).name, tip: parentTipFor(s.skillId), cycles: s.stuckCycles }));
}
