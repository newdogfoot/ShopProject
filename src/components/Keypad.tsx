"use client";

import { useEffect, useEffectEvent, useReducer } from "react";
import type { AnswerKind, FractionForm, StudentAnswer } from "@/domain/items/types";
import { MathText } from "./MathText";

type Field = "text" | "whole" | "num" | "den" | "quotient" | "remainder" | "u0" | "u1" | "u2";

const UNIT_FIELDS = ["u0", "u1", "u2"] as const;

interface State {
  fields: Record<Field, string>;
  focus: Field;
  compare: string;
  /** Picked option index (choice answers). */
  choice: string;
}

type Action =
  | { type: "digit"; d: string }
  | { type: "char"; c: string }
  | { type: "back" }
  | { type: "focus"; f: Field }
  | { type: "next" }
  | { type: "compare"; v: string }
  | { type: "choice"; v: string };

const MAX_LEN = 13;

/** Boxes in the order the "next box" key visits them. */
function order(kind: AnswerKind, form?: FractionForm, unitCount = 0): Field[] {
  if (kind === "fraction") return form === "improper" ? ["num", "den"] : ["whole", "num", "den"];
  if (kind === "quotient-remainder") return ["quotient", "remainder"];
  if (kind === "units") return UNIT_FIELDS.slice(0, Math.max(1, Math.min(3, unitCount)));
  return ["text"];
}

function initialFocus(kind: AnswerKind, form?: FractionForm): Field {
  if (kind === "fraction") return form === "mixed" ? "whole" : "num";
  if (kind === "quotient-remainder") return "quotient";
  if (kind === "units") return "u0";
  return "text";
}

function init(args: { kind: AnswerKind; form?: FractionForm }): State {
  return {
    fields: { text: "", whole: "", num: "", den: "", quotient: "", remainder: "", u0: "", u1: "", u2: "" },
    focus: initialFocus(args.kind, args.form),
    compare: "",
    choice: "",
  };
}

function makeReducer(kind: AnswerKind, form?: FractionForm, unitCount = 0) {
  const fields = order(kind, form, unitCount);
  return (s: State, a: Action): State => {
    switch (a.type) {
      case "digit": {
        const cur = s.fields[s.focus];
        if (cur.length >= MAX_LEN) return s;
        return { ...s, fields: { ...s.fields, [s.focus]: cur + a.d } };
      }
      case "char": {
        const cur = s.fields[s.focus];
        if (a.c === "." && (kind !== "decimal" || cur.includes(".") || cur === "")) return s;
        if (a.c === "," && (kind !== "integer-list" || cur === "" || cur.endsWith(", "))) return s;
        return { ...s, fields: { ...s.fields, [s.focus]: cur + (a.c === "," ? ", " : a.c) } };
      }
      case "back": {
        const cur = s.fields[s.focus];
        if (cur === "") {
          const i = fields.indexOf(s.focus);
          return i > 0 ? { ...s, focus: fields[i - 1] } : s;
        }
        const next = cur.endsWith(", ") ? cur.slice(0, -2) : cur.slice(0, -1);
        return { ...s, fields: { ...s.fields, [s.focus]: next } };
      }
      case "focus":
        return fields.includes(a.f) ? { ...s, focus: a.f } : s;
      case "next": {
        const i = fields.indexOf(s.focus);
        return { ...s, focus: fields[(i + 1) % fields.length] };
      }
      case "compare":
        return { ...s, compare: a.v };
      case "choice":
        return { ...s, choice: a.v };
    }
  };
}

function toAnswer(kind: AnswerKind, s: State, unitCount: number): StudentAnswer | null {
  const f = s.fields;
  switch (kind) {
    case "integer":
      return f.text ? { kind, text: f.text } : null;
    case "decimal":
      return f.text && !f.text.endsWith(".") ? { kind, text: f.text } : null;
    case "fraction":
      if (!f.num && !f.den && f.whole) return { kind, whole: f.whole, num: "", den: "" };
      return f.num && f.den ? { kind, whole: f.whole, num: f.num, den: f.den } : null;
    case "quotient-remainder":
      return f.quotient ? { kind, quotient: f.quotient, remainder: f.remainder || "0" } : null;
    case "compare":
      return s.compare ? { kind, value: s.compare } : null;
    case "integer-list":
      return f.text ? { kind, text: f.text } : null;
    case "choice":
      return s.choice ? { kind, index: s.choice } : null;
    case "units": {
      // An empty box counts as 0 (2시간 → "2", ""), but something must be typed.
      const values = UNIT_FIELDS.slice(0, unitCount).map((u) => f[u]);
      return values.some((v) => v !== "") ? { kind, values } : null;
    }
    case "text":
      // Written answers use TextAnswer, not the keypad.
      return null;
  }
}

function Box({ value, active, label, onClick, wide }: { value: string; active: boolean; label: string; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} 칸${value ? `: ${value}` : ", 비어 있음"}`}
      className={`min-h-14 ${wide ? "min-w-40" : "min-w-16"} rounded-2xl border-4 bg-white px-3 text-center text-3xl font-bold tabular-nums transition ${
        active ? "border-brand shadow-[0_0_0_4px_rgba(109,74,255,0.15)]" : "border-brand/25"
      }`}
    >
      {value || <span className="text-brand/30">{active ? "|" : " "}</span>}
    </button>
  );
}

export function Keypad({
  kind,
  form,
  options = [],
  units = [],
  unit,
  disabled,
  onSubmit,
  submitLabel = "확인",
}: {
  kind: AnswerKind;
  form?: FractionForm;
  /** Options for choice answers. */
  options?: string[];
  /** Unit of each box for several-unit answers, largest first (["시간", "분"]). */
  units?: string[];
  /** Unit shown after the answer box (cm, °, % …). */
  unit?: string;
  disabled?: boolean;
  onSubmit: (answer: StudentAnswer) => void;
  submitLabel?: string;
}) {
  const unitCount = Math.min(3, units.length);
  const [state, dispatch] = useReducer(makeReducer(kind, form, unitCount), { kind, form }, init);
  const answer = toAnswer(kind, state, unitCount);
  const multiBox = kind === "fraction" || kind === "quotient-remainder" || (kind === "units" && unitCount > 1);
  const submit = () => {
    if (answer && !disabled) onSubmit(answer);
  };

  // Physical keyboard: digits, backspace, enter, "." / "," and "/" (next box).
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (kind === "choice") {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) dispatch({ type: "choice", v: String(n - 1) });
      else if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
      return;
    }
    if (/^[0-9]$/.test(e.key)) dispatch({ type: "digit", d: e.key });
    else if (e.key === "Backspace") dispatch({ type: "back" });
    else if (e.key === "Enter") {
      // Stop a focused keypad button from also being pressed.
      e.preventDefault();
      submit();
    } else if (e.key === "." || e.key === ",") dispatch({ type: "char", c: e.key });
    else if ((e.key === "/" || e.key === "ArrowRight") && multiBox) {
      e.preventDefault();
      dispatch({ type: "next" });
    } else if (kind === "compare" && (e.key === "<" || e.key === ">" || e.key === "=")) dispatch({ type: "compare", v: e.key });
  });

  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled]);

  const display = (() => {
    const f = state.fields;
    const box = (field: Field, label: string, wide = false) => (
      <Box value={f[field]} active={state.focus === field} label={label} wide={wide} onClick={() => dispatch({ type: "focus", f: field })} />
    );
    switch (kind) {
      case "fraction":
        return (
          <div className="flex items-center justify-center gap-3">
            {form !== "improper" && (
              <div className="flex flex-col items-center gap-1">
                {box("whole", "자연수")}
                <span className="text-xs text-muted">자연수</span>
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              {box("num", "분자")}
              <span className="h-1 w-20 rounded bg-foreground" aria-hidden />
              {box("den", "분모")}
            </div>
          </div>
        );
      case "quotient-remainder":
        return (
          <div className="flex items-end justify-center gap-3">
            <label className="flex flex-col items-center gap-1 text-sm text-muted">
              {box("quotient", "몫")}몫
            </label>
            <span className="pb-6 text-2xl font-bold text-muted">…</span>
            <label className="flex flex-col items-center gap-1 text-sm text-muted">
              {box("remainder", "나머지")}나머지
            </label>
          </div>
        );
      case "compare":
        return (
          <div className="flex justify-center gap-3" role="radiogroup" aria-label="크기 비교">
            {[">", "=", "<"].map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={state.compare === v}
                disabled={disabled}
                onClick={() => dispatch({ type: "compare", v })}
                className={`h-20 w-20 rounded-2xl border-4 text-4xl font-black transition ${
                  state.compare === v ? "border-brand bg-brand text-white" : "border-brand/30 bg-white text-brand"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        );
      case "units":
        return (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
            {UNIT_FIELDS.slice(0, unitCount).map((u, i) => (
              <span key={u} className="flex items-center gap-1.5">
                {box(u, units[i])}
                <span className="text-xl font-bold">{units[i]}</span>
              </span>
            ))}
          </div>
        );
      case "choice":
        return (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="보기">
            {options.map((text, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={state.choice === String(i)}
                disabled={disabled}
                onClick={() => dispatch({ type: "choice", v: String(i) })}
                data-testid={`option-${i}`}
                className={`flex items-start gap-3 rounded-2xl border-4 p-3 text-left text-lg leading-snug transition ${
                  state.choice === String(i) ? "border-brand bg-brand-soft" : "border-brand/20 bg-white"
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-black ${state.choice === String(i) ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
                  {i + 1}
                </span>
                <span className="flex-1">
                  <MathText text={text} />
                </span>
              </button>
            ))}
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center gap-2">
            {box("text", "답", true)}
            {unit && <span className="text-xl font-bold">{unit}</span>}
          </div>
        );
    }
  })();

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const extra = kind === "decimal" ? "." : kind === "integer-list" ? "," : null;

  return (
    <div className="flex flex-col gap-4">
      {display}
      {kind !== "compare" && kind !== "choice" && (
        <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => dispatch({ type: "digit", d: k })}
              className="h-14 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-brand/15 active:scale-95 disabled:opacity-40"
            >
              {k}
            </button>
          ))}
          {extra ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => dispatch({ type: "char", c: extra })}
              aria-label={extra === "." ? "소수점" : "쉼표"}
              className="h-14 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-brand/15 active:scale-95 disabled:opacity-40"
            >
              {extra}
            </button>
          ) : multiBox ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => dispatch({ type: "next" })}
              className="h-14 rounded-2xl bg-brand-soft text-base font-bold text-brand active:scale-95 disabled:opacity-40"
            >
              다음 칸
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => dispatch({ type: "digit", d: "0" })}
            className="h-14 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-brand/15 active:scale-95 disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => dispatch({ type: "back" })}
            aria-label="지우기"
            className="h-14 rounded-2xl bg-white text-xl font-bold text-muted shadow-sm ring-1 ring-brand/15 active:scale-95 disabled:opacity-40"
          >
            ⌫
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={disabled || !answer}
        onClick={submit}
        className="mx-auto h-14 w-full max-w-xs rounded-2xl bg-brand text-xl font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  );
}
