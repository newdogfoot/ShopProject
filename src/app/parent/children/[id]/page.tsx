import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, Loading, PageShell } from "@/components/ui";
import { ConceptMap } from "@/components/ConceptMap";
import { MathText } from "@/components/MathText";
import { requireGuardian } from "@/auth/session";
import { getDb } from "@/db/client";
import { getStudent } from "@/db/queries";
import { getSkill } from "@/domain/curriculum/skills";
import type { Grade, Semester } from "@/domain/curriculum/types";
import { aiEnabled } from "@/ai";
import { childSummary, misconceptionReport, stuckReport } from "../../data";
import { DeleteChildForm, EditChildForm } from "../../ChildForms";

export const metadata: Metadata = { title: "학습 리포트" };

export default function ChildReportPage(props: PageProps<"/parent/children/[id]">) {
  return (
    <PageShell title="학습 리포트" back={{ href: "/parent", label: "보호자 화면" }}>
      <Suspense fallback={<Loading />}>
        <Report params={props.params} />
      </Suspense>
    </PageShell>
  );
}

async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guardian = await requireGuardian();
  const db = await getDb();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const student = await getStudent(db, guardian.id, id);
  if (!student) notFound();
  const summary = await childSummary(db, student);
  const misconceptions = await misconceptionReport(db, student.id, summary.learner);
  const stuck = stuckReport(summary.learner);
  const grade = student.grade as Grade;
  const semester = student.semester as Semester;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="text-xl font-extrabold">
          {student.nickname} <span className="text-base font-semibold text-muted">· {grade}학년 {semester}학기</span>
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-brand-soft/60 py-3">
            <dt className="text-xs text-muted">최근 7일 학습 시간</dt>
            <dd className="text-2xl font-extrabold">{summary.week.minutes === 0 && summary.week.problems > 0 ? "1분 미만" : `${summary.week.minutes}분`}</dd>
          </div>
          <div className="rounded-2xl bg-brand-soft/60 py-3">
            <dt className="text-xs text-muted">푼 문제</dt>
            <dd className="text-2xl font-extrabold">{summary.week.problems}</dd>
          </div>
          <div className="rounded-2xl bg-brand-soft/60 py-3">
            <dt className="text-xs text-muted">첫 시도 정답률</dt>
            <dd className="text-2xl font-extrabold">{summary.week.accuracy === null ? "–" : `${summary.week.accuracy}%`}</dd>
          </div>
        </dl>
        {!student.diagnosedAt && <p className="mt-4 text-sm text-muted">아직 진단을 하지 않았어요. 학습 화면에서 첫 실력 확인을 시작하면 개념 지도가 채워져요.</p>}
      </Card>

      {stuck.length > 0 && (
        <Card className="ring-red-200">
          <h3 className="mb-3 text-lg font-bold text-red-800">함께 봐 주세요</h3>
          <ul className="flex flex-col gap-3">
            {stuck.map((s) => (
              <li key={s.skillId} className="rounded-2xl bg-red-50 p-3 text-sm">
                <b>{s.name}</b> — 설명 방식을 바꿔 {s.cycles * 3}번 넘게 시도했지만 아직 어려워해요.
                <br />
                <span className="text-muted">집에서 도와주기: {s.tip}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {misconceptions.length > 0 && (
        <Card>
          <h3 className="mb-3 text-lg font-bold">바로잡고 있는 오개념</h3>
          <ul className="flex flex-col gap-3">
            {misconceptions.map((m) => (
              <li key={m.id} className="rounded-2xl bg-red-50/60 p-3 text-sm">
                <p className="font-bold">
                  {m.name} <span className="font-normal text-muted">({m.skillName})</span>
                </p>
                <p className="mt-1">{m.explain}</p>
                {m.example && (
                  <p className="mt-1 text-muted">
                    실제 답: <MathText text={m.example.prompt} /> → <b className="text-red-700">{m.example.shown}</b>
                  </p>
                )}
                <p className="mt-1 text-muted">집에서 도와주기: {m.tip}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.nextSkills.length > 0 && (
        <Card>
          <h3 className="mb-2 text-lg font-bold">다음 학습 계획</h3>
          <ul className="list-inside list-disc text-sm">
            {summary.nextSkills.map((sid) => (
              <li key={sid}>
                <b>{getSkill(sid).name}</b> — {getSkill(sid).goal}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 text-lg font-bold">개념 지도 (수와 연산)</h3>
        <ConceptMap learner={summary.learner} grade={grade} semester={semester} audience="guardian" />
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-bold">자녀 정보 바꾸기</h3>
        <EditChildForm defaults={{ id: student.id, nickname: student.nickname, grade, semester, theme: student.theme, readAloud: student.readAloud }} />
        <p className="mt-3 text-xs text-muted">
          AI 설명·문장제: {aiEnabled() ? "켜짐 (AI 결과는 자동 검증 후 사용)" : "꺼짐 (내장 설명과 문제 사용)"}
        </p>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-bold text-bad">자녀 정보와 학습 기록 삭제</summary>
          <div className="mt-3">
            <DeleteChildForm id={student.id} nickname={student.nickname} />
          </div>
        </details>
      </Card>
    </div>
  );
}
