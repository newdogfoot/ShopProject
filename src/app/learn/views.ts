/** Serializable view models for the learning screens (no functions, no secrets). */
import { markupToSpeech } from "@/domain/math/markup";
import { answerToInput, wrongInput } from "@/domain/items/answer";
import { answerText } from "@/domain/items/helpers";
import type { AnswerKind, FractionForm, Item, StudentAnswer, Visual } from "@/domain/items/types";
import type { ItemPurpose } from "@/domain/tutor/cycle";

export interface ItemView {
  id: string;
  prompt: string;
  instruction?: string;
  answerKind: AnswerKind;
  fractionForm?: FractionForm;
  visual?: Visual;
  speech: string;
  format: "computation" | "word";
  purposeLabel: string;
  /** Only in E2E test mode (E2E_TEST_MODE=1, never in production): keypad inputs that answer right and wrong. */
  test?: { correct: StudentAnswer; wrong: StudentAnswer; misconception?: StudentAnswer };
}

export interface FeedbackView {
  status: "correct" | "wrong" | "form" | "invalid" | "saved";
  done: boolean;
  message: string;
  detail?: string;
  correctAnswer?: string;
  solution?: string[];
}

export type SessionView =
  | { type: "explain"; skillName: string; title: string; steps: Array<{ text: string; visual?: Visual }>; summary: string; source: "template" | "ai"; stepLabel: string }
  | { type: "worked"; skillName: string; stepLabel: string; example: { prompt: string; steps: string[]; visual?: Visual }; faded: { prompt: string; steps: string[]; answer: string } }
  | {
      type: "item";
      skillName: string;
      stepLabel: string;
      progress: { step: number; count: number };
      item: ItemView;
      hint?: { level: number; text: string };
      encourage?: string;
      feedback?: FeedbackView;
      canHint: boolean;
      canReveal: boolean;
    }
  | { type: "summary"; answered: number; firstTryCorrect: number; mastered: string[]; skipped: string[]; unlocked: string[]; stuck: string[]; reviewed: number; tookBreak: boolean };

export type DiagnosisView =
  | { type: "item"; item: ItemView; progress: number; asked: number; maxItems: number }
  | { type: "done"; mastered: number; toLearn: string[]; misconceptions: number; asked: number; skipped: boolean };

export const PURPOSE_LABEL: Record<ItemPurpose | "diagnosis", string> = {
  diagnosis: "실력 확인",
  precheck: "빠른 확인",
  practice: "연습",
  check: "숙달 확인",
  review: "복습",
  challenge: "도전 문제",
};

export const STEP_LABEL = { learn: "새로 배우기", reinforce: "조금 더 연습", review: "복습", challenge: "도전" } as const;

export function toItemView(item: Item, purpose: ItemPurpose | "diagnosis"): ItemView {
  const answerKind = item.answer.kind;
  return {
    id: item.id,
    prompt: item.prompt,
    instruction: item.instruction,
    answerKind,
    fractionForm: item.answer.kind === "fraction" ? item.answer.form : undefined,
    visual: item.showVisual ? item.visual : undefined,
    speech: markupToSpeech([item.prompt, item.instruction ?? ""].join(" ")),
    format: item.format,
    purposeLabel: PURPOSE_LABEL[purpose],
    test: process.env.E2E_TEST_MODE === "1" ? testInputs(item) : undefined,
  };
}

function testInputs(item: Item): NonNullable<ItemView["test"]> {
  const bug = item.bugs.find((b) => b.answer);
  return { correct: answerToInput(item.answer), wrong: wrongInput(item.answer), misconception: bug?.answer ? answerToInput(bug.answer) : undefined };
}

const PRAISE = ["정답이에요! 끝까지 생각했네요.", "맞았어요! 실력이 쑥쑥 자라요.", "훌륭해요! 차근차근 잘 풀었어요.", "정답! 방금 방법을 기억해 두세요."];

export function correctFeedback(item: Item): FeedbackView {
  return { status: "correct", done: true, message: PRAISE[item.seed % PRAISE.length] };
}

export function solutionFeedback(item: Item, detail?: string): FeedbackView {
  return {
    status: "wrong",
    done: true,
    message: "괜찮아요. 풀이를 함께 볼까요?",
    detail,
    correctAnswer: answerText(item.answer),
    solution: item.steps,
  };
}
