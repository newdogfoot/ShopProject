/** Data for the child's home screen, and which domains a child has been diagnosed in. */
import "server-only";
import { getDb, type Db } from "@/db/client";
import { activeSession, diagnosesInProgress, diagnosisRecord, loadLearner } from "@/db/queries";
import { activeDomains } from "@/domain/curriculum/skills";
import type { DomainId, Grade, Semester } from "@/domain/curriculum/types";
import { deriveStatus, getState } from "@/domain/model/learner";
import { buildPlan } from "@/domain/tutor/planner";
import { warmExplanations } from "./warm";

/** Domains (that have skills) where the first diagnosis is done, in display order. */
export async function diagnosedDomains(db: Db, studentId: string): Promise<DomainId[]> {
  const record = await diagnosisRecord(db, studentId);
  return activeDomains()
    .map((d) => d.id)
    .filter((id) => record[id] !== undefined);
}

/** Where /learn/diagnosis goes without a domain: one in progress, else the first not diagnosed yet. */
export async function defaultDiagnosisDomain(db: Db, studentId: string): Promise<DomainId> {
  const [inProgress, done] = await Promise.all([diagnosesInProgress(db, studentId), diagnosedDomains(db, studentId)]);
  const active = activeDomains().map((d) => d.id);
  return active.find((id) => inProgress.includes(id)) ?? active.find((id) => !done.includes(id)) ?? "NUM_OPS";
}

export interface DomainCard {
  id: DomainId;
  name: string;
  emoji: string;
  diagnosed: boolean;
  inProgress: boolean;
}

export async function homeData(student: { id: string; grade: number; semester: number }) {
  const db = await getDb();
  const [learner, record, inProgress, learning] = await Promise.all([
    loadLearner(db, student.id),
    diagnosisRecord(db, student.id),
    diagnosesInProgress(db, student.id),
    activeSession(db, student.id, "learning"),
  ]);
  const grade = student.grade as Grade;
  const semester = student.semester as Semester;
  const domains: DomainCard[] = activeDomains().map((d) => ({ ...d, diagnosed: record[d.id] !== undefined, inProgress: inProgress.includes(d.id) }));
  const diagnosed = domains.filter((d) => d.diagnosed).map((d) => d.id);
  const plan = diagnosed.length > 0 ? buildPlan(learner, { grade, semester, now: Date.now(), domains: diagnosed }) : [];
  // Head start: explanations are cached per skill and strategy, so the example seed does not matter here.
  if (!learning) warmExplanations(student.id, grade, plan, learner, 1);
  return {
    stars: Object.keys(learner).filter((id) => deriveStatus(getState(learner, id)) === "mastered").length,
    plan,
    domains,
    learningInProgress: learning !== null,
  };
}
