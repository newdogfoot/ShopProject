/** Concept map: one row per strand, skills in learning order, coloured by status. */
import { getSkill, skillsInStrand, STRANDS } from "@/domain/curriculum/skills";
import { learningRange, topologicalOrder } from "@/domain/curriculum/graph";
import type { Grade, Semester } from "@/domain/curriculum/types";
import { deriveStatus, getState, STATUS_LABEL, type LearnerState, type SkillStatus } from "@/domain/model/learner";

export type MapStatus = SkillStatus | "not-yet";

export const STATUS_STYLE: Record<MapStatus, { chip: string; dot: string; kid: string }> = {
  mastered: { chip: "bg-green-100 text-green-900 ring-green-300", dot: "bg-green-500", kid: "⭐ 익혔어요" },
  inferred: { chip: "bg-lime-50 text-lime-900 ring-lime-300", dot: "bg-lime-400", kid: "🙂 알고 있어요" },
  shaky: { chip: "bg-amber-50 text-amber-900 ring-amber-300", dot: "bg-amber-400", kid: "🔁 조금 더 연습" },
  gap: { chip: "bg-orange-100 text-orange-900 ring-orange-300", dot: "bg-orange-500", kid: "🧭 배울 차례" },
  "inferred-gap": { chip: "bg-orange-50 text-orange-900 ring-orange-200 ring-dashed", dot: "bg-orange-300", kid: "🧭 배울 차례" },
  misconception: { chip: "bg-red-100 text-red-900 ring-red-300", dot: "bg-red-500", kid: "💡 바로잡기" },
  unknown: { chip: "bg-slate-50 text-slate-700 ring-slate-200", dot: "bg-slate-300", kid: "❔ 확인 전" },
  "not-yet": { chip: "bg-white text-slate-400 ring-slate-200", dot: "bg-slate-200", kid: "🔒 나중에" },
};

export function mapStatus(learner: LearnerState, skillId: string, grade: Grade, semester: Semester): MapStatus {
  const inRange = learningRange(grade, semester).includes(skillId);
  const status = deriveStatus(getState(learner, skillId));
  if (!inRange && (status === "unknown" || status === "inferred-gap")) return "not-yet";
  return status;
}

export function ConceptMap({ learner, grade, semester, audience }: { learner: LearnerState; grade: Grade; semester: Semester; audience: "child" | "guardian" }) {
  const order = topologicalOrder();
  const shown: MapStatus[] = ["mastered", "inferred", "shaky", "misconception", "gap", "unknown", "not-yet"];
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2 text-xs" aria-label="색깔 설명">
        {shown.map((s) => (
          <li key={s} className={`rounded-full px-2.5 py-1 ring-1 ${STATUS_STYLE[s].chip}`}>
            {audience === "child" ? STATUS_STYLE[s].kid : STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
      {STRANDS.map((strand) => {
        const skills = skillsInStrand(strand.id).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        return (
          <section key={strand.id} aria-labelledby={`strand-${strand.id}`}>
            <h3 id={`strand-${strand.id}`} className="mb-2 text-sm font-bold text-muted">
              <span aria-hidden>{strand.emoji}</span> {strand.name}
            </h3>
            <ol className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
              {skills.map((skill) => {
                const st = mapStatus(learner, skill.id, grade, semester);
                const full = getSkill(skill.id);
                return (
                  <li
                    key={skill.id}
                    className={`flex flex-col gap-1 rounded-2xl px-3 py-2 ring-1 ${STATUS_STYLE[st].chip}`}
                    title={`${full.name} — ${audience === "child" ? STATUS_STYLE[st].kid : STATUS_LABEL[st]}`}
                    data-skill={skill.id}
                    data-status={st}
                  >
                    <span className="text-[11px] font-semibold opacity-70">
                      {full.grade}학년 {full.semester}학기
                    </span>
                    <span className="text-sm font-bold leading-snug">{full.name}</span>
                    <span className="mt-auto flex items-center gap-1 text-[11px]">
                      <span className={`inline-block h-2 w-2 rounded-full ${STATUS_STYLE[st].dot}`} aria-hidden />
                      {audience === "child" ? STATUS_STYLE[st].kid : STATUS_LABEL[st]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
