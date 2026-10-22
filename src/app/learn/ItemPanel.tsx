"use client";

import { Keypad } from "@/components/Keypad";
import { MathText } from "@/components/MathText";
import { SpeakButton } from "@/components/SpeakButton";
import { VisualView } from "@/components/Visual";
import type { StudentAnswer } from "@/domain/items/types";
import type { FeedbackView, ItemView } from "./views";

/** One problem: prompt, optional picture, read-aloud and the answer keypad. */
export function ItemPanel({
  item,
  readAloud,
  disabled,
  hideKeypad,
  onSubmit,
}: {
  item: ItemView;
  readAloud: boolean;
  disabled: boolean;
  hideKeypad?: boolean;
  onSubmit: (answer: StudentAnswer) => void;
}) {
  return (
    <div
      className="flex flex-col gap-5"
      data-testid="item"
      data-item-id={item.id}
      data-answer-kind={item.answerKind}
      data-test-correct={item.test ? JSON.stringify(item.test.correct) : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">{item.purposeLabel}</span>
        <SpeakButton key={item.id} text={item.speech} auto={readAloud} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-2xl leading-relaxed font-bold sm:text-3xl" data-testid="item-prompt">
          <MathText text={item.prompt} />
        </p>
        {item.instruction && (
          <p className="text-base text-muted">
            <MathText text={item.instruction} />
          </p>
        )}
      </div>
      {item.visual && <VisualView visual={item.visual} />}
      {!hideKeypad && <Keypad key={item.id} kind={item.answerKind} form={item.fractionForm} disabled={disabled} onSubmit={onSubmit} />}
      {item.test && !hideKeypad && (
        // Test-only shortcuts (rendered only when E2E_TEST_MODE=1 on the server).
        <div className="flex justify-center gap-2 text-xs text-muted">
          <button type="button" data-testid="e2e-correct" disabled={disabled} onClick={() => onSubmit(item.test!.correct)}>
            [테스트] 정답 입력
          </button>
          <button type="button" data-testid="e2e-wrong" disabled={disabled} onClick={() => onSubmit(item.test!.wrong)}>
            [테스트] 오답 입력
          </button>
        </div>
      )}
    </div>
  );
}

const TONE: Record<FeedbackView["status"], string> = {
  correct: "bg-green-50 text-green-900 ring-green-200",
  wrong: "bg-orange-50 text-orange-950 ring-orange-200",
  form: "bg-amber-50 text-amber-950 ring-amber-200",
  invalid: "bg-amber-50 text-amber-950 ring-amber-200",
  saved: "bg-brand-soft text-brand ring-brand/20",
};

const ICON: Record<FeedbackView["status"], string> = { correct: "🎉", wrong: "🤔", form: "✏️", invalid: "✏️", saved: "✅" };

export function FeedbackBox({ feedback }: { feedback: FeedbackView }) {
  return (
    <div role="status" aria-live="polite" data-testid="feedback" data-status={feedback.status} className={`animate-pop-in rounded-2xl p-4 ring-1 ${TONE[feedback.status]}`}>
      <p className="text-lg font-bold">
        <span aria-hidden>{ICON[feedback.status]} </span>
        <MathText text={feedback.message} />
      </p>
      {feedback.detail && (
        <p className="mt-2 text-base">
          <MathText text={feedback.detail} />
        </p>
      )}
      {feedback.correctAnswer && (
        <p className="mt-2 text-base">
          정답: <b className="text-xl">{<MathText text={feedback.correctAnswer} />}</b>
        </p>
      )}
      {feedback.solution && feedback.solution.length > 0 && (
        <ol className="mt-3 flex list-inside list-decimal flex-col gap-1 rounded-xl bg-white/70 p-3 text-base">
          {feedback.solution.map((step, i) => (
            <li key={i}>
              <MathText text={step} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      {message}
    </p>
  );
}

export const NETWORK_ERROR = "연결이 잠시 끊겼어요. 잠시 뒤에 다시 눌러 주세요.";
