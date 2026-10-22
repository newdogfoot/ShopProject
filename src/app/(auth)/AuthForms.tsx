"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, type FormState } from "./actions";
import { FieldError, inputClass } from "@/components/ui";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={params.get("next") ?? "/parent"} />
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        이메일
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        비밀번호
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      <FieldError message={state?.error} />
      <button disabled={pending} className="h-12 rounded-2xl bg-brand text-lg font-bold text-white disabled:opacity-50">
        {pending ? "확인 중…" : "로그인"}
      </button>
      <p className="text-center text-sm text-muted">
        처음이신가요?{" "}
        <Link href="/signup" className="font-bold text-brand underline">
          보호자 가입하기
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        보호자 이메일
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        비밀번호 (8자 이상)
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        비밀번호 확인
        <input name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </label>

      <fieldset className="flex flex-col gap-3 rounded-2xl bg-brand-soft/60 p-4 text-sm">
        <legend className="px-1 font-bold">필수 동의</legend>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent-privacy-collection" required className="mt-1 h-5 w-5 accent-[var(--brand)]" />
          <span>
            <b>개인정보 수집·이용 동의</b> — 보호자 이메일과 자녀의 닉네임·학년·학기·관심 주제, 학습 기록을 맞춤 학습과 보호자 리포트에만 사용합니다.
            자녀의 실명·생년월일·학교는 받지 않으며, 자녀 정보는 언제든 삭제할 수 있습니다.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent-guardian-consent-under-14" required className="mt-1 h-5 w-5 accent-[var(--brand)]" />
          <span>
            <b>법정대리인 동의</b> — 저는 등록할 만 14세 미만 자녀의 법정대리인이며, 자녀의 개인정보 처리에 동의합니다(개인정보 보호법 제22조의2).
          </span>
        </label>
        <p className="text-xs text-muted">
          학습 중 AI가 설명·힌트·문장제를 만들 때 자녀를 알아볼 수 있는 정보(닉네임 등)는 AI에 보내지 않습니다.
        </p>
      </fieldset>

      <FieldError message={state?.error} />
      <button disabled={pending} className="h-12 rounded-2xl bg-brand text-lg font-bold text-white disabled:opacity-50">
        {pending ? "가입 중…" : "동의하고 가입하기"}
      </button>
      <p className="text-center text-sm text-muted">
        이미 가입하셨나요?{" "}
        <Link href="/login" className="font-bold text-brand underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
