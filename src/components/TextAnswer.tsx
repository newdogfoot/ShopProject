"use client";

import { useState } from "react";
import type { StudentAnswer } from "@/domain/items/types";

/** A short written explanation (grade 3+). Personal details are removed on the server too. */
export function TextAnswer({ maxLength, disabled, onSubmit }: { maxLength: number; disabled?: boolean; onSubmit: (answer: StudentAnswer) => void }) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted">내 생각 쓰기</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxLength))}
          maxLength={maxLength}
          rows={3}
          disabled={disabled}
          placeholder="왜 그런지 내 말로 써 보세요."
          data-testid="written-answer"
          className="w-full resize-none rounded-2xl border-4 border-brand/25 bg-white p-3 text-lg leading-relaxed outline-none focus:border-brand"
        />
      </label>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>이름, 학교, 전화번호 같은 내 정보는 쓰지 않아요.</span>
        <span aria-live="polite">
          {text.length} / {maxLength}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled || trimmed.length === 0}
        onClick={() => onSubmit({ kind: "text", text: trimmed })}
        className="mx-auto h-14 w-full max-w-xs rounded-2xl bg-brand text-xl font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-40"
      >
        다 썼어요
      </button>
    </div>
  );
}
