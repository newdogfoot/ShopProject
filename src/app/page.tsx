import { Suspense } from "react";
import { ButtonLink, PageShell } from "@/components/ui";
import { getCurrentGuardian } from "@/auth/session";

const STEPS = [
  {
    icon: "🔍",
    title: "적응형 실력 확인",
    body: "맞히면 쉬운 개념은 건너뛰고, 틀리면 아래 학년 개념으로 내려가 원인을 찾아요. 12~25문항이면 충분해요.",
  },
  {
    icon: "🗺️",
    title: "개념 지도",
    body: "수와 연산 45개 개념의 연결을 따라 '뿌리 결손'을 찾아요. 오개념(자주 하는 잘못된 생각)도 오답으로 알아내요.",
  },
  {
    icon: "🧭",
    title: "맞춤 학습 반복",
    body: "모르는 개념은 설명 → 풀이 예시 → 힌트가 있는 연습 → 숙달 확인. 잘 안 되면 설명 방식을 바꿔요.",
  },
  {
    icon: "🔁",
    title: "아는 개념은 짧게",
    body: "불안정한 개념만 짧게 보충하고, 익힌 개념은 1·3·7·14·30일 간격으로 복습해요.",
  },
];

export default function LandingPage() {
  return (
    <PageShell>
      <section className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-6xl" aria-hidden>
          🧮
        </p>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">수학 탐험</h1>
        <p className="max-w-xl text-lg text-muted">
          초등 1~6학년 <b className="text-foreground">수와 연산</b>을 아이에게 맞춰 배우는 AI 학습. 부족한 개념을 먼저 찾고, 그 개념부터 다시 익혀요.
        </p>
        <Suspense fallback={<div className="h-14" />}>
          <Actions />
        </Suspense>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-3xl" aria-hidden>
              {s.icon}
            </p>
            <h2 className="mt-2 text-lg font-extrabold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-brand-soft/60 p-5 text-sm text-muted">
        <h2 className="mb-2 text-base font-bold text-foreground">보호자께</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>계정은 보호자만 만들어요. 자녀는 별명·학년·학기·관심 주제만 받아요(실명·생년월일·학교는 받지 않아요).</li>
          <li>숫자와 정답은 프로그램이 계산하고, AI는 설명·힌트·문장제 이야기만 맡아요. AI 결과는 자동 검사를 통과해야 쓰여요.</li>
          <li>아이는 숫자 키패드로만 답해요. AI와 자유롭게 대화하는 기능은 없어요.</li>
        </ul>
      </section>
    </PageShell>
  );
}

async function Actions() {
  const guardian = await getCurrentGuardian();
  if (guardian) {
    return (
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/learn">학습 시작</ButtonLink>
        <ButtonLink href="/parent" variant="soft">
          보호자 화면
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <ButtonLink href="/signup">보호자 가입하고 시작</ButtonLink>
      <ButtonLink href="/login" variant="ghost">
        로그인
      </ButtonLink>
    </div>
  );
}
