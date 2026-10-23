"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ButtonLink, Card } from "@/components/ui";
import { MathText } from "@/components/MathText";
import { SpeakButton } from "@/components/SpeakButton";
import { VisualView } from "@/components/Visual";
import { markupToSpeech } from "@/domain/math/markup";
import type { StudentAnswer } from "@/domain/items/types";
import { sessionAnswer, sessionContinue, sessionHint, sessionNext, sessionReveal, sessionStop } from "../actions";
import { ErrorNote, FeedbackBox, ItemPanel, NETWORK_ERROR } from "../ItemPanel";
import { WhyButton } from "../WhyButton";
import type { SessionView } from "../views";

type Run = (call: () => Promise<SessionView>) => void;

export function SessionRunner({ initial, readAloud }: { initial: SessionView; readAloud: boolean }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run: Run = (call) => {
    startTransition(async () => {
      try {
        const next = await call();
        startTransition(() => {
          setView(next);
          setError(null);
        });
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {view.type === "explain" && <ExplainScreen view={view} pending={pending} run={run} readAloud={readAloud} />}
      {view.type === "worked" && <WorkedScreen key={view.faded.prompt} view={view} pending={pending} run={run} />}
      {view.type === "item" && <ItemScreen view={view} pending={pending} run={run} readAloud={readAloud} />}
      {view.type === "summary" && <SummaryScreen view={view} />}
      <ErrorNote message={error} />
      {view.type !== "summary" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => sessionStop())}
          className="self-center text-sm font-semibold text-muted underline disabled:opacity-40"
        >
          오늘은 여기까지 할래요
        </button>
      )}
    </div>
  );
}

function StepHeader({ stepLabel, skillName, extra }: { stepLabel: string; skillName: string; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold text-muted">
        <span className="mr-2 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">{stepLabel}</span>
        {skillName}
      </p>
      {extra}
    </div>
  );
}

function ExplainScreen({ view, pending, run, readAloud }: { view: Extract<SessionView, { type: "explain" }>; pending: boolean; run: Run; readAloud: boolean }) {
  const speech = markupToSpeech([view.title, ...view.steps.map((s) => s.text), view.summary].join(" "));
  return (
    <>
      <StepHeader stepLabel={view.stepLabel} skillName={view.skillName} />
      <Card className="animate-pop-in">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold" data-testid="explain-title">
            <MathText text={view.title} />
          </h2>
          <SpeakButton text={speech} auto={readAloud} />
        </div>
        <ol className="flex flex-col gap-4">
          {view.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <div className="flex flex-1 flex-col gap-2 text-lg leading-relaxed">
                <MathText text={step.text} />
                {step.visual && <VisualView visual={step.visual} />}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-2xl bg-brand-soft p-4 text-lg font-bold text-brand">
          <span aria-hidden>💡 </span>
          <MathText text={view.summary} />
        </p>
        {view.source === "ai" && <p className="mt-3 text-right text-xs text-muted">AI가 만든 설명이에요 (자동 검사를 통과했어요)</p>}
      </Card>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => sessionContinue("explain"))}
        data-testid="continue"
        className="h-14 rounded-2xl bg-brand text-xl font-bold text-white shadow-md disabled:opacity-50"
      >
        {pending ? "준비 중…" : "알겠어요! 다음으로"}
      </button>
    </>
  );
}

function WorkedScreen({ view, pending, run }: { view: Extract<SessionView, { type: "worked" }>; pending: boolean; run: Run }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <>
      <StepHeader stepLabel={view.stepLabel} skillName={view.skillName} />
      <Card className="animate-pop-in">
        <h2 className="mb-3 text-xl font-extrabold">풀이를 따라가 봐요</h2>
        <p className="text-xl font-bold">
          <MathText text={view.example.prompt} />
        </p>
        {view.example.visual && (
          <div className="mt-3">
            <VisualView visual={view.example.visual} />
          </div>
        )}
        <ol className="mt-3 flex list-inside list-decimal flex-col gap-1.5 text-lg">
          {view.example.steps.map((s, i) => (
            <li key={`${view.example.id}-${i}`}>
              <MathText text={s} />
              <WhyButton itemId={view.example.id} stepIndex={i} />
            </li>
          ))}
        </ol>
      </Card>
      <Card>
        <h2 className="mb-3 text-xl font-extrabold">마지막 단계를 생각해 봐요</h2>
        <p className="text-xl font-bold">
          <MathText text={view.faded.prompt} />
        </p>
        <ol className="mt-3 flex list-inside list-decimal flex-col gap-1.5 text-lg">
          {view.faded.steps.map((s, i) => (
            <li key={`${view.faded.id}-${i}`}>
              <MathText text={s} />
              <WhyButton itemId={view.faded.id} stepIndex={i} />
            </li>
          ))}
          <li>
            {revealed ? (
              <span className="animate-pop-in font-bold text-good">
                <MathText text={view.faded.answer} />
              </span>
            ) : (
              <button type="button" onClick={() => setRevealed(true)} className="rounded-xl bg-brand-soft px-3 py-1 font-bold text-brand">
                ? 머릿속으로 풀어 보고 눌러서 확인
              </button>
            )}
          </li>
        </ol>
      </Card>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => sessionContinue("worked"))}
        data-testid="continue"
        className="h-14 rounded-2xl bg-brand text-xl font-bold text-white shadow-md disabled:opacity-50"
      >
        {pending ? "준비 중…" : "이제 직접 풀어 볼게요"}
      </button>
    </>
  );
}

function ItemScreen({ view, pending, run, readAloud }: { view: Extract<SessionView, { type: "item" }>; pending: boolean; run: Run; readAloud: boolean }) {
  const itemId = view.item.id;
  const done = view.feedback?.done ?? false;
  const submit = (answer: StudentAnswer) => run(() => sessionAnswer(itemId, answer));
  return (
    <>
      <StepHeader
        stepLabel={view.stepLabel}
        skillName={view.skillName}
        extra={
          <span className="text-xs font-semibold text-muted">
            오늘의 학습 {view.progress.step} / {view.progress.count}
          </span>
        }
      />
      {view.encourage && (
        <p className="rounded-2xl bg-accent/10 px-4 py-3 text-base font-semibold text-accent" role="status">
          💪 {view.encourage}
        </p>
      )}
      <Card>
        <ItemPanel item={view.item} readAloud={readAloud} disabled={pending} hideKeypad={done} onSubmit={submit} />
      </Card>
      {view.hint && !done && (
        <div className="animate-pop-in rounded-2xl bg-yellow-50 p-4 ring-1 ring-yellow-200" data-testid="hint" role="status">
          <p className="mb-1 text-sm font-bold text-yellow-900">힌트 {view.hint.level}</p>
          <p className="text-lg">
            <MathText text={view.hint.text} />
          </p>
        </div>
      )}
      {view.feedback && <FeedbackBox feedback={view.feedback} whyItemId={view.canAskWhy ? view.item.id : undefined} />}
      <div className="flex flex-wrap justify-center gap-2">
        {view.canHint && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => sessionHint(itemId))}
            className="rounded-2xl bg-yellow-100 px-4 py-2.5 font-bold text-yellow-900 disabled:opacity-50"
          >
            💡 {view.hint ? "다음 힌트" : "힌트 보기"}
          </button>
        )}
        {view.canReveal && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => sessionReveal(itemId))}
            className="rounded-2xl bg-white px-4 py-2.5 font-bold text-muted ring-1 ring-black/10 disabled:opacity-50"
          >
            풀이 볼래요
          </button>
        )}
        {done && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => sessionNext(itemId))}
            data-testid="next"
            className="h-14 w-full max-w-xs rounded-2xl bg-brand text-xl font-bold text-white shadow-md disabled:opacity-50"
          >
            {pending ? "준비 중…" : "다음"}
          </button>
        )}
      </div>
    </>
  );
}

function SummaryScreen({ view }: { view: Extract<SessionView, { type: "summary" }> }) {
  return (
    <Card className="animate-pop-in text-center">
      <p className="text-5xl" aria-hidden>
        🌟
      </p>
      <h2 className="mt-3 text-2xl font-extrabold" data-testid="session-summary">
        오늘의 학습 끝!
      </h2>
      {view.tookBreak && <p className="mt-2 text-muted">어려운 문제를 오래 붙잡고 있었어요. 쉬었다가 하면 더 잘돼요!</p>}
      <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl bg-brand-soft/70 py-3">
          <dt className="text-xs text-muted">푼 문제</dt>
          <dd className="text-2xl font-extrabold">{view.answered}</dd>
        </div>
        <div className="rounded-2xl bg-brand-soft/70 py-3">
          <dt className="text-xs text-muted">한 번에 맞힌 문제</dt>
          <dd className="text-2xl font-extrabold">{view.firstTryCorrect}</dd>
        </div>
      </dl>
      <ul className="mt-5 flex flex-col gap-2 text-left text-base">
        {view.mastered.length > 0 && <li>⭐ 새로 익힌 개념: <b>{view.mastered.join(", ")}</b></li>}
        {view.skipped.length > 0 && <li>🙂 이미 알고 있던 개념: <b>{view.skipped.join(", ")}</b></li>}
        {view.unlocked.length > 0 && <li>🔓 다음에 배울 수 있게 된 개념: <b>{view.unlocked.join(", ")}</b></li>}
        {view.reviewed > 0 && <li>🔁 복습한 개념: {view.reviewed}개</li>}
        {view.stuck.length > 0 && <li>🧭 다음에 다른 방법으로 다시 해 볼 개념: <b>{view.stuck.join(", ")}</b></li>}
      </ul>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/learn/map">내 개념 지도 보기</ButtonLink>
        <ButtonLink href="/learn/home" variant="soft">
          처음 화면
        </ButtonLink>
      </div>
    </Card>
  );
}
