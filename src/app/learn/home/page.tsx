import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Loading, PageShell } from "@/components/ui";
import { requireStudent } from "@/auth/session";
import { THEMES } from "@/domain/content/stories";
import { getSkill } from "@/domain/curriculum/skills";
import type { Grade, Semester } from "@/domain/curriculum/types";
import type { PlanStepKind } from "@/domain/tutor/planner";
import { STEP_LABEL } from "../views";
import { homeData, type DomainCard } from "../data";

export const metadata: Metadata = { title: "오늘의 학습" };

export default function LearnHomePage() {
  return (
    <PageShell>
      <Suspense fallback={<Loading />}>
        <Home />
      </Suspense>
    </PageShell>
  );
}

const STEP_ICON: Record<PlanStepKind, string> = { review: "🔁", learn: "🧭", reinforce: "💪", challenge: "🏔️" };

/** One row per domain still waiting for its first diagnosis. */
function DomainChecks({ domains }: { domains: DomainCard[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {domains.map((d) => (
        <li key={d.id}>
          <Link
            href={`/learn/diagnosis?domain=${d.id}`}
            aria-label={`${d.name} ${d.inProgress ? "실력 확인 이어서 하기" : "실력 확인 시작"}`}
            data-testid={`diagnose-${d.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl bg-brand-soft/50 px-4 py-3 text-left font-bold hover:bg-brand-soft"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-2xl">
                {d.emoji}
              </span>
              {d.name}
            </span>
            <span className="rounded-full bg-brand px-3 py-1 text-sm text-white">{d.inProgress ? "실력 확인 이어서 하기" : "실력 확인 시작"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Home() {
  const student = await requireStudent();
  const { stars, plan, domains, learningInProgress } = await homeData(student);
  const grade = student.grade as Grade;
  const semester = student.semester as Semester;
  const emoji = THEMES.find((t) => t.id === student.theme)?.emoji ?? "🙂";
  const waiting = domains.filter((d) => !d.diagnosed);
  const anyDiagnosed = waiting.length < domains.length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-3xl" aria-hidden>
            {emoji}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">{student.nickname}, 안녕!</h1>
            <p className="text-sm text-muted">
              {grade}학년 {semester}학기
            </p>
          </div>
        </div>
        <p className="rounded-full bg-white px-4 py-2 text-lg font-extrabold shadow-sm ring-1 ring-black/5" aria-label={`익힌 개념 ${stars}개`}>
          ⭐ {stars}
        </p>
      </header>

      {!anyDiagnosed ? (
        <Card>
          <div className="text-center">
            <p className="text-4xl" aria-hidden>
              🔍
            </p>
            <h2 className="mt-2 text-xl font-extrabold">먼저 실력 확인을 해 볼까요?</h2>
            <p className="mx-auto mt-2 mb-5 max-w-md text-muted">
              문제를 조금 풀면 무엇을 이미 알고 무엇부터 배우면 좋을지 찾아 줘요. 시험이 아니니까 편하게 풀어요. 중간에 그만둬도 이어서 할 수 있어요.
              {domains.length > 1 && " 영역마다 따로 확인해요. 수와 연산부터 해 보면 좋아요."}
            </p>
          </div>
          <DomainChecks domains={waiting} />
        </Card>
      ) : (
        <Card>
          <h2 className="mb-3 text-xl font-extrabold">오늘의 학습</h2>
          {plan.length > 0 ? (
            <ol className="mb-5 flex flex-col gap-2">
              {plan.map((step, i) => (
                <li key={`${step.kind}-${step.skillId}-${i}`} className="flex items-center gap-3 rounded-2xl bg-brand-soft/50 px-4 py-3">
                  <span aria-hidden className="text-xl">
                    {STEP_ICON[step.kind]}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-xs font-bold text-muted">{STEP_LABEL[step.kind]}</span>
                    <span className="font-bold">{getSkill(step.skillId).name}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mb-5 text-muted">지금 배울 개념을 모두 익혔어요! 복습할 때가 되면 다시 알려 줄게요.</p>
          )}
          <ButtonLink href="/learn/session" className="w-full">
            {learningInProgress ? "이어서 하기" : "시작하기"}
          </ButtonLink>
        </Card>
      )}

      {anyDiagnosed && waiting.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-extrabold">다른 영역도 확인해 볼까요?</h2>
          <p className="mb-3 text-sm text-muted">확인한 영역은 오늘의 학습에 함께 들어가요.</p>
          <DomainChecks domains={waiting} />
        </Card>
      )}

      <Link href="/learn/map" className="flex items-center justify-between rounded-3xl bg-card p-5 shadow-sm ring-1 ring-black/5 hover:shadow-md">
        <span>
          <span className="block text-lg font-extrabold">🗺️ 내 개념 지도</span>
          <span className="text-sm text-muted">익힌 개념과 배울 개념을 한눈에 봐요</span>
        </span>
        <span aria-hidden className="text-2xl text-brand">
          →
        </span>
      </Link>

      <nav className="flex justify-center gap-4 text-sm text-muted">
        <Link href="/learn" className="underline">
          다른 친구로 바꾸기
        </Link>
        <Link href="/parent" className="underline">
          보호자 화면
        </Link>
      </nav>
    </div>
  );
}
