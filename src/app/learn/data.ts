/** Data for the child's home screen. */
import "server-only";
import { getDb } from "@/db/client";
import { activeSession, loadLearner } from "@/db/queries";
import type { Grade, Semester } from "@/domain/curriculum/types";
import { deriveStatus, getState } from "@/domain/model/learner";
import { buildPlan } from "@/domain/tutor/planner";

export async function homeData(student: { id: string; grade: number; semester: number; diagnosedAt: Date | null }) {
  const db = await getDb();
  const [learner, diagnosis, learning] = await Promise.all([
    loadLearner(db, student.id),
    activeSession(db, student.id, "diagnosis"),
    activeSession(db, student.id, "learning"),
  ]);
  const grade = student.grade as Grade;
  const semester = student.semester as Semester;
  return {
    stars: Object.keys(learner).filter((id) => deriveStatus(getState(learner, id)) === "mastered").length,
    plan: student.diagnosedAt ? buildPlan(learner, { grade, semester, now: Date.now() }) : [],
    diagnosisInProgress: diagnosis !== null,
    learningInProgress: learning !== null,
  };
}
