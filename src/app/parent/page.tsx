import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, Loading, PageShell } from "@/components/ui";
import { requireGuardian } from "@/auth/session";
import { getDb } from "@/db/client";
import { listStudents } from "@/db/queries";
import { getSkill } from "@/domain/curriculum/skills";
import { logoutAction } from "../(auth)/actions";
import { childSummary } from "./data";

export const metadata: Metadata = { title: "보호자 화면" };

export default function ParentPage() {
  return (
    <PageShell
      title="보호자 화면"
      actions={
        <form action={logoutAction}>
          <button className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-muted ring-1 ring-black/10 hover:text-foreground">로그아웃</button>
        </form>
      }
    >
      <Suspense fallback={<Loading />}>
        <Children />
      </Suspense>
    </PageShell>
  );
}

async function Children() {
  const guardian = await requireGuardian();
  const db = await getDb();
  const kids = await listStudents(db, guardian.id);
  const summaries = await Promise.all(kids.map((k) => childSummary(db, k)));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{guardian.email}</p>
      {summaries.length === 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold">먼저 자녀를 추가해 주세요</h2>
          <p className="mb-4 text-sm text-muted">별명, 학년, 학기만 있으면 시작할 수 있어요. 첫 학습에서 짧은 실력 확인(진단)을 해요.</p>
          <ButtonLink href="/parent/children/new">자녀 추가하기</ButtonLink>
        </Card>
      )}
      {summaries.map(({ student, counts, week, nextSkills, domains, diagnosed }) => (
        <Card key={student.id}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">
              {student.nickname} <span className="text-base font-semibold text-muted">· {student.grade}학년 {student.semester}학기</span>
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${diagnosed === domains.length ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
              title={domains.map((d) => `${d.name}: ${d.diagnosedAt ? "진단 완료" : "진단 전"}`).join(", ")}
            >
              {diagnosed === 0 ? "진단 전" : diagnosed === domains.length ? "진단 완료" : `진단 ${diagnosed}/${domains.length} 영역`}
            </span>
          </div>
          <dl className="mb-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Stat label="익힌 개념" value={counts.mastered} />
            <Stat label="배우는 중" value={counts.learning} />
            <Stat label="오개념" value={counts.misconception} warn={counts.misconception > 0} />
            <Stat label="최근 7일 문제" value={week.problems} />
          </dl>
          {counts.stuck > 0 && (
            <p className="mb-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-800">
              함께 봐 주세요: 여러 번 시도해도 어려워하는 개념이 {counts.stuck}개 있어요.
            </p>
          )}
          {diagnosed > 0 ? (
            nextSkills.length > 0 && (
              <p className="mb-4 text-sm">
                <b>다음 학습:</b> {nextSkills.map((id) => getSkill(id).name).join(", ")}
              </p>
            )
          ) : (
            <p className="mb-4 text-sm text-muted">학습 화면을 열면 먼저 짧은 실력 확인(진단)을 해요. 그 결과로 학습 계획을 세워요.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/parent/children/${student.id}`} variant="soft">
              리포트 보기
            </ButtonLink>
            <ButtonLink href="/learn" variant="ghost">
              학습 화면 열기
            </ButtonLink>
          </div>
        </Card>
      ))}
      {summaries.length > 0 && (
        <Link href="/parent/children/new" className="self-start text-sm font-bold text-brand underline">
          + 자녀 추가하기
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-3 ${warn ? "bg-red-50" : "bg-brand-soft/60"}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-2xl font-extrabold ${warn ? "text-red-700" : ""}`}>{value}</dd>
    </div>
  );
}
