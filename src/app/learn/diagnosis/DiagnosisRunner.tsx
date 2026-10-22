"use client";

import { useState, useTransition } from "react";
import { ButtonLink, Card } from "@/components/ui";
import type { StudentAnswer } from "@/domain/items/types";
import { diagnosisAnswer } from "../actions";
import { ErrorNote, FeedbackBox, ItemPanel, NETWORK_ERROR } from "../ItemPanel";
import type { DiagnosisView, FeedbackView } from "../views";

export function DiagnosisRunner({ initial, readAloud }: { initial: DiagnosisView; readAloud: boolean }) {
  const [view, setView] = useState(initial);
  const [feedback, setFeedback] = useState<FeedbackView | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (view.type === "done") return <DiagnosisDone view={view} />;

  const submit = (answer: StudentAnswer) => {
    const itemId = view.item.id;
    startTransition(async () => {
      try {
        const r = await diagnosisAnswer(itemId, answer);
        startTransition(() => {
          setView(r.view);
          setFeedback(r.feedback);
          setError(null);
        });
      } catch {
        setError(NETWORK_ERROR);
      }
    });
  };

  const percent = Math.round(view.progress * 100);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3" aria-label={`진행 ${percent}%`}>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-brand-soft">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(4, percent)}%` }} />
        </div>
        <span className="text-sm font-semibold text-muted">{view.asked + 1}번째 문제</span>
      </div>
      <p className="text-sm text-muted">점수를 매기는 시험이 아니에요. 어디서부터 배우면 좋을지 찾는 중이에요. 모르면 생각나는 대로 써도 괜찮아요!</p>
      {feedback && feedback.status !== "saved" && <FeedbackBox feedback={feedback} />}
      {feedback?.status === "saved" && (
        <p key={view.item.id} className="animate-pop-in text-sm font-semibold text-brand" role="status">
          ✅ {feedback.message}
        </p>
      )}
      <Card>
        <ItemPanel item={view.item} readAloud={readAloud} disabled={pending} onSubmit={submit} />
      </Card>
      <ErrorNote message={error} />
      <p className="text-center text-xs text-muted">중간에 그만둬도 괜찮아요. 다음에 이어서 할 수 있어요.</p>
    </div>
  );
}

function DiagnosisDone({ view }: { view: Extract<DiagnosisView, { type: "done" }> }) {
  return (
    <Card className="animate-pop-in text-center">
      <p className="text-5xl" aria-hidden>
        🎊
      </p>
      <h2 className="mt-3 text-2xl font-extrabold" data-testid="diagnosis-done">
        실력 확인 끝!
      </h2>
      {view.skipped && view.asked === 0 ? (
        <p className="mt-2 text-muted">지금 학기에는 확인할 내용이 없어서 바로 첫 개념부터 시작해요.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-base">
          <p>
            {view.asked}문제를 끝까지 풀었어요. 정말 잘했어요!
            {view.mastered > 0 && (
              <>
                {" "}
                이미 아는 개념이 <b>{view.mastered}개</b>나 있어요.
              </>
            )}
          </p>
          {view.toLearn.length > 0 && (
            <p>
              이제 <b>{view.toLearn.join(", ")}</b>부터 차근차근 배워 볼게요.
            </p>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/learn/session">오늘의 학습 시작</ButtonLink>
        <ButtonLink href="/learn/map" variant="soft">
          내 개념 지도 보기
        </ButtonLink>
      </div>
    </Card>
  );
}
