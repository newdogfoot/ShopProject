"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** Reads text aloud with the browser's built-in Korean voice (free, works offline on most devices). */
export function SpeakButton({ text, auto = false }: { text: string; auto?: boolean }) {
  const supported = useSyncExternalStore(
    subscribe,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false,
  );
  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }, [text]);

  useEffect(() => {
    if (auto && supported) speak();
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [auto, supported, speak]);

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={speak}
      className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/20"
    >
      <span aria-hidden>🔊</span> 읽어 주기
    </button>
  );
}
