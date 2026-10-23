/** Summaries for the guardian dashboard and child report. */
import "server-only";
import type { Db } from "@/db/client";
import { attemptStats, diagnosisRecord, errorTypeStats, listExplanations, loadLearner, misconceptionExamples, type ErrorType } from "@/db/queries";
import type { students } from "@/db/schema";
import { activeDomains, getSkill } from "@/domain/curriculum/skills";
import { learningRange } from "@/domain/curriculum/graph";
import type { DomainId, Grade, Semester } from "@/domain/curriculum/types";
import { deriveStatus, getState, type LearnerState, type SkillStatus } from "@/domain/model/learner";
import { getMisconception } from "@/domain/items/misconceptions";
import { parentTipFor } from "@/domain/content/explanations";
import { buildPlan } from "@/domain/tutor/planner";

export type StudentRow = typeof students.$inferSelect;

export interface DomainSummary {
  id: DomainId;
  name: string;
  emoji: string;
  diagnosedAt: Date | null;
  /** Skills up to the current semester, and how many of them are known. */
  total: number;
  mastered: number;
  learning: number;
  misconception: number;
}

export interface ChildSummary {
  student: StudentRow;
  learner: LearnerState;
  counts: Record<"mastered" | "learning" | "misconception" | "stuck", number>;
  week: { problems: number; accuracy: number | null; minutes: number };
  nextSkills: string[];
  domains: DomainSummary[];
  /** How many domains have had their first diagnosis. */
  diagnosed: number;
}

const isKnown = (s: SkillStatus) => s === "mastered" || s === "inferred";
const isLearning = (s: SkillStatus) => s === "gap" || s === "inferred-gap" || s === "shaky";

export async function childSummary(db: Db, student: StudentRow, now = new Date()): Promise<ChildSummary> {
  const [learner, record] = await Promise.all([loadLearner(db, student.id), diagnosisRecord(db, student.id)]);
  const grade = student.grade as Grade;
  const semester = student.semester as Semester;
  const statusesIn = (domain?: DomainId) => learningRange(grade, semester, domain).map((id) => deriveStatus(getState(learner, id)));
  const statuses = statusesIn();
  const count = (pred: (s: SkillStatus) => boolean) => statuses.filter(pred).length;
  const stats = await attemptStats(db, student.id, new Date(now.getTime() - 7 * 24 * 3600 * 1000));
  const domains: DomainSummary[] = activeDomains().map((d) => {
    const st = statusesIn(d.id);
    return {
      ...d,
      diagnosedAt: record[d.id] ?? null,
      total: st.length,
      mastered: st.filter(isKnown).length,
      learning: st.filter(isLearning).length,
      misconception: st.filter((s) => s === "misconception").length,
    };
  });
  const diagnosed = domains.filter((d) => d.diagnosedAt).map((d) => d.id);
  // Before any diagnosis the record is empty, so a plan would be meaningless.
  const plan = diagnosed.length > 0 ? buildPlan(learner, { grade, semester, now: now.getTime(), domains: diagnosed }) : [];
  return {
    student,
    learner,
    domains,
    diagnosed: diagnosed.length,
    counts: {
      mastered: count(isKnown),
      learning: count(isLearning),
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
  // One entry per misconception, even when it shows up in several skills.
  const skillsByMisconception = new Map<string, string[]>();
  for (const state of Object.values(learner)) {
    if (deriveStatus(state) !== "misconception") continue;
    for (const [id, n] of Object.entries(state.misconceptions)) {
      if (n > 0) skillsByMisconception.set(id, [...(skillsByMisconception.get(id) ?? []), state.skillId]);
    }
  }
  return [...skillsByMisconception].map(([id, skillIds]) => {
    const m = getMisconception(id);
    const ex = skillIds.map((sid) => examples.get(`${id}|${sid}`)).find((e) => e !== undefined);
    return {
      id,
      name: m.name,
      explain: m.parentExplain,
      tip: m.parentTip,
      skillName: skillIds.map((sid) => getSkill(sid).name).join(", "),
      example: ex ? { prompt: ex.prompt, shown: ex.shown } : null,
    };
  });
}

export function stuckReport(learner: LearnerState) {
  return Object.values(learner)
    .filter((s) => s.stuckCycles > 0 && deriveStatus(s) !== "mastered")
    .map((s) => ({ skillId: s.skillId, name: getSkill(s.skillId).name, tip: parentTipFor(s.skillId), cycles: s.stuckCycles }));
}

export const ERROR_LABEL: Record<ErrorType, string> = {
  concept: "개념 이해(오개념)",
  procedure: "계산 순서·방법",
  careless: "단순 실수",
  reading: "문제 이해",
  unknown: "기타",
};

/** Wrong first answers in the last 7 days by likely cause. */
export async function errorReport(db: Db, studentId: string, now = new Date()) {
  const stats = await errorTypeStats(db, studentId, new Date(now.getTime() - 7 * 24 * 3600 * 1000));
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  return { total, rows: (Object.keys(ERROR_LABEL) as ErrorType[]).map((k) => ({ key: k, label: ERROR_LABEL[k], count: stats[k] })).filter((r) => r.count > 0) };
}

/** Recent written explanations; the ones the AI was unsure about (or could not grade) need a check. */
export async function explanationReport(db: Db, studentId: string) {
  const rows = await listExplanations(db, studentId, 10);
  return rows.map((r) => ({
    id: r.id,
    skillName: getSkill(r.skillId).name,
    prompt: r.prompt,
    text: r.text,
    score: r.score,
    feedback: r.feedback,
    verdict: r.guardianVerdict,
    createdAt: r.createdAt,
    needsCheck: r.guardianVerdict === null && (r.score === null || r.confidence === "low"),
  }));
}

/** Skills the child can compute but whose "why" was not right yet. */
export function reasonGapReport(learner: LearnerState) {
  return Object.values(learner)
    .filter((s) => s.reason && !s.reason.lastCorrect)
    .map((s) => {
      const m = s.reason?.misconceptionId ? getMisconception(s.reason.misconceptionId) : null;
      return { skillId: s.skillId, name: getSkill(s.skillId).name, misconception: m ? { name: m.name, explain: m.parentExplain } : null, tip: parentTipFor(s.skillId) };
    });
}
