/** Background AI work, so children do not wait for it. */
import "server-only";
import { after } from "next/server";
import { aiEnabled, getAiDeps } from "@/ai";
import { getExplanation, getWordProblem } from "@/ai/features";
import type { Theme } from "@/domain/content/stories";
import { gradeBandOf, type Grade } from "@/domain/curriculum/types";
import type { Item } from "@/domain/items/types";
import type { LearnerState } from "@/domain/model/learner";
import type { PlanStep } from "@/domain/tutor/planner";
import { upcomingExplanations } from "@/domain/tutor/session";

/** After the response, has the AI write the explanations today's plan will open with. */
export function warmExplanations(studentId: string, grade: Grade, plan: PlanStep[], learner: LearnerState, seed: number): void {
  if (!aiEnabled()) return;
  const inputs = upcomingExplanations(plan, learner, seed).map((x) => ({ ...x, gradeBand: gradeBandOf(grade) }));
  if (inputs.length === 0) return;
  after(async () => {
    const deps = await getAiDeps(studentId);
    // One at a time: these are a head start, not urgent.
    for (const input of inputs) await getExplanation(deps, input).catch(() => undefined);
  });
}

/** After the response, has the AI write and check a story for this word problem; later children get it from the bank. */
export function warmWordProblem(studentId: string, item: Item, theme: Theme, grade: Grade): void {
  if (!aiEnabled()) return;
  after(async () => {
    await getWordProblem(await getAiDeps(studentId), item, theme, grade).catch(() => undefined);
  });
}
