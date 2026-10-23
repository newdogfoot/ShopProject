"use client";

import { useState, useTransition } from "react";
import { MathText } from "@/components/MathText";
import { sessionWhy } from "./actions";

/** "왜요?" next to a solution step: explains why that step is right (a fixed question, no free chat). */
export function WhyButton({ itemId, stepIndex }: { itemId: string; stepIndex: number }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (text) {
    return (
      <span className="animate-pop-in mt-1 block rounded-xl bg-yellow-50 px-3 py-2 text-base text-yellow-950 ring-1 ring-yellow-200" data-testid="why-answer" role="status">
        <span aria-hidden>🙋 </span>
        <MathText text={text} />
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      data-testid="why"
      onClick={() =>
        startTransition(async () => {
          try {
            const r = await sessionWhy(itemId, stepIndex);
            if (r.text) setText(r.text);
            else setFailed(true);
          } catch {
            setFailed(true);
          }
        })
      }
      className="ml-2 rounded-full bg-yellow-100 px-2.5 py-0.5 align-middle text-sm font-bold text-yellow-900 disabled:opacity-50"
      aria-label={`${stepIndex + 1}번째 단계가 왜 그런지 묻기`}
    >
      {pending ? "생각 중…" : failed ? "다시 물어보기" : "왜요?"}
    </button>
  );
}
