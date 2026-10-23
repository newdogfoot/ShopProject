/** Serializable view models for the learning screens (no functions, no secrets). */
import { markupToSpeech } from "@/domain/math/markup";
import { answerToInput, wrongInput } from "@/domain/items/answer";
import { answerText } from "@/domain/items/helpers";
import type { AnswerKind, FractionForm, Item, StudentAnswer, Visual } from "@/domain/items/types";
import type { DomainId } from "@/domain/curriculum/types";
import type { ItemPurpose } from "@/domain/tutor/cycle";

export interface ItemView {
  id: string;
  prompt: string;
  instruction?: string;
  answerKind: AnswerKind;
  fractionForm?: FractionForm;
  visual?: Visual;
  speech: string;
  format: Item["format"];
  purposeLabel: string;
  /** Options to pick from (choice answers). */
  options?: string[];
  /** Longest written answer (text answers). */
  maxLength?: number;
  /** Unit of each box for several-unit answers (["시간", "분"]). */
  units?: string[];
  /** Unit shown after the answer box (cm, °, % …). */
  unit?: string;
  /** Only in E2E test mode (E2E_TEST_MODE=1, never in production): keypad inputs that answer right and wrong. */
  test?: { correct: StudentAnswer; wrong: StudentAnswer; misconception?: StudentAnswer };
}

export interface FeedbackView {
  /** partial: a written explanation that is partly right; pending: waiting for a guardian check. */
  status: "correct" | "wrong" | "form" | "invalid" | "saved" | "partial" | "pending";
  done: boolean;
  message: string;
  detail?: string;
  correctAnswer?: string;
  solution?: string[];
  /** A model explanation for "why" questions. */
  model?: string;
  /** The child's own written explanation, shown back with the feedback. */
  mine?: string;
}

export type SessionView =
  | { type: "explain"; skillName: string; title: string; steps: Array<{ text: string; visual?: Visual }>; summary: string; source: "template" | "ai"; stepLabel: string }
  | {
      type: "worked";
      skillName: string;
      stepLabel: string;
      example: { id: string; prompt: string; steps: string[]; visual?: Visual };
      faded: { id: string; prompt: string; steps: string[]; answer: string };
    }
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
      /** The solution steps can be asked "why?" (computation and word problems). */
      canAskWhy: boolean;
    }
  | { type: "summary"; answered: number; firstTryCorrect: number; mastered: string[]; skipped: string[]; unlocked: string[]; stuck: string[]; reviewed: number; tookBreak: boolean };

export type DiagnosisView =
  | { type: "item"; domain: DomainId; domainName: string; item: ItemView; progress: number; asked: number; maxItems: number }
  | {
      type: "done";
      domain: DomainId;
      domainName: string;
      mastered: number;
      toLearn: string[];
      misconceptions: number;
      asked: number;
      skipped: boolean;
      /** This domain had been diagnosed before (nothing new to show). */
      alreadyDone?: boolean;
      /** Another domain that still needs its first diagnosis. */
      next?: { id: DomainId; name: string };
    };

export const PURPOSE_LABEL: Record<ItemPurpose | "diagnosis", string> = {
  diagnosis: "실력 확인",
  precheck: "빠른 확인",
  practice: "연습",
  check: "숙달 확인",
  review: "복습",
  challenge: "도전 문제",
  reason: "이유 설명",
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
    options: item.answer.kind === "choice" ? item.answer.options : undefined,
    maxLength: item.answer.kind === "text" ? item.answer.maxLength : undefined,
    units: item.answer.kind === "units" ? item.answer.parts.map((p) => p.label) : undefined,
    unit: item.answer.kind === "integer" || item.answer.kind === "decimal" ? item.answer.unit : undefined,
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

/** Feedback for a picked reason. */
export function reasonFeedback(item: Item, correct: boolean, bugFeedback?: string): FeedbackView {
  const model = item.answer.kind === "choice" || item.answer.kind === "text" ? item.steps[0] : undefined;
  return correct
    ? { status: "correct", done: true, message: "맞아요! 까닭을 잘 골랐어요.", model }
    : { status: "wrong", done: true, message: "다시 한번 생각해 볼까요?", detail: bugFeedback, correctAnswer: answerText(item.answer), model };
}

/** Feedback for a written explanation, by its score (null: a guardian will check it). */
export function writtenFeedback(item: Item, written: { text: string; score: 0 | 1 | 2 | null; feedback: string }): FeedbackView {
  const base = { done: true, detail: written.feedback, model: item.steps[0], mine: written.text };
  switch (written.score) {
    case 2:
      return { ...base, status: "correct", message: "잘 설명했어요!" };
    case 1:
      return { ...base, status: "partial", message: "거의 다 왔어요!" };
    case 0:
      return { ...base, status: "wrong", message: "괜찮아요. 함께 생각해 봐요." };
    default:
      return { ...base, status: "pending", message: "설명을 잘 받았어요!" };
  }
}
