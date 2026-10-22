"use client";

import { useActionState } from "react";
import { createChild, deleteChild, updateChild, type ChildFormState } from "./actions";
import { FieldError, inputClass } from "@/components/ui";
import { THEMES } from "@/domain/content/stories";

export interface ChildDefaults {
  id?: string;
  nickname?: string;
  grade?: number;
  semester?: number;
  theme?: string;
  readAloud?: boolean;
}

function Fields({ d }: { d: ChildDefaults }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        별명 <span className="font-normal text-muted">실명 대신 아이가 좋아하는 별명을 써 주세요.</span>
        <input name="nickname" required maxLength={12} defaultValue={d.nickname} placeholder="예: 별이" className={inputClass} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          학년
          <select name="grade" defaultValue={d.grade ?? 3} className={inputClass}>
            {[1, 2, 3, 4, 5, 6].map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          학기
          <select name="semester" defaultValue={d.semester ?? 1} className={inputClass}>
            <option value={1}>1학기</option>
            <option value={2}>2학기</option>
          </select>
        </label>
      </div>
      <fieldset className="flex flex-col gap-2 text-sm font-semibold">
        <legend className="mb-1">좋아하는 주제 (문장제 이야기에 써요)</legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3 py-2 font-normal ring-1 ring-brand/20 has-[:checked]:bg-brand has-[:checked]:text-white">
              <input type="radio" name="theme" value={t.id} defaultChecked={(d.theme ?? "snack") === t.id} className="sr-only" />
              <span aria-hidden>{t.emoji}</span> {t.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="readAloud" defaultChecked={d.readAloud ?? (d.grade ?? 3) <= 2} className="h-5 w-5 accent-[var(--brand)]" />
        문제를 소리 내어 읽어 주기 (1~2학년 추천)
      </label>
    </>
  );
}

export function NewChildForm({ defaultSemester }: { defaultSemester: number }) {
  const [state, action, pending] = useActionState<ChildFormState, FormData>(createChild, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Fields d={{ semester: defaultSemester }} />
      <FieldError message={state?.error} />
      <button disabled={pending} className="h-12 rounded-2xl bg-brand text-lg font-bold text-white disabled:opacity-50">
        {pending ? "저장 중…" : "자녀 추가하기"}
      </button>
    </form>
  );
}

export function EditChildForm({ defaults }: { defaults: ChildDefaults }) {
  const [state, action, pending] = useActionState<ChildFormState, FormData>(updateChild, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={defaults.id} />
      <Fields d={defaults} />
      <FieldError message={state?.error} />
      {state?.ok && <p className="text-sm font-semibold text-good">저장했어요.</p>}
      <button disabled={pending} className="h-12 rounded-2xl bg-brand-soft text-base font-bold text-brand disabled:opacity-50">
        {pending ? "저장 중…" : "변경 내용 저장"}
      </button>
    </form>
  );
}

export function DeleteChildForm({ id, nickname }: { id: string; nickname: string }) {
  const [state, action, pending] = useActionState<ChildFormState, FormData>(deleteChild, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-muted">
        {nickname}의 프로필과 학습 기록이 모두 지워지고 되돌릴 수 없어요. 계속하려면 보호자 비밀번호를 입력해 주세요.
      </p>
      <input name="password" type="password" required autoComplete="current-password" placeholder="보호자 비밀번호" className={inputClass} />
      <FieldError message={state?.error} />
      <button disabled={pending} className="h-11 rounded-2xl bg-bad text-base font-bold text-white disabled:opacity-50">
        {pending ? "삭제 중…" : "자녀 정보 삭제"}
      </button>
    </form>
  );
}
