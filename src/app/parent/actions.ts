"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { createStudent, deleteStudent, findGuardianByEmail, updateStudent } from "@/db/queries";
import { requireGuardian } from "@/auth/session";
import { verifyPassword } from "@/auth/password";
import { THEMES } from "@/domain/content/stories";
import type { Grade, Semester } from "@/domain/curriculum/types";
import type { Theme } from "@/domain/content/stories";
import { clearFailures, isLockedOut, LOCKED_OUT_MESSAGE, recordFailure } from "@/auth/attempts";

export type ChildFormState = { error?: string; ok?: boolean } | undefined;

const THEME_IDS = THEMES.map((t) => t.id) as [Theme, ...Theme[]];

const ChildSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, { error: "별명을 입력해 주세요." })
    .max(12, { error: "별명은 12자 이내로 써 주세요." })
    .regex(/^[가-힣a-zA-Z0-9 ]+$/, { error: "별명에는 한글, 영문, 숫자만 쓸 수 있어요." })
    .refine((v) => !/\d{4,}/.test(v), { error: "전화번호처럼 보이는 숫자는 쓰지 말아 주세요." }),
  grade: z.coerce.number().int().min(1).max(6),
  semester: z.coerce.number().int().min(1).max(2),
  theme: z.enum(THEME_IDS),
});

function parseChild(formData: FormData) {
  return ChildSchema.safeParse({
    nickname: formData.get("nickname"),
    grade: formData.get("grade"),
    semester: formData.get("semester"),
    theme: formData.get("theme"),
  });
}

export async function createChild(_prev: ChildFormState, formData: FormData): Promise<ChildFormState> {
  const guardian = await requireGuardian();
  const parsed = parseChild(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { nickname, grade, semester, theme } = parsed.data;
  await createStudent(await getDb(), guardian.id, {
    nickname,
    grade: grade as Grade,
    semester: semester as Semester,
    theme,
    readAloud: formData.get("readAloud") === "on",
  });
  redirect("/parent");
}

export async function updateChild(_prev: ChildFormState, formData: FormData): Promise<ChildFormState> {
  const guardian = await requireGuardian();
  const id = String(formData.get("id") ?? "");
  const parsed = parseChild(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { nickname, grade, semester, theme } = parsed.data;
  const updated = await updateStudent(await getDb(), guardian.id, id, {
    nickname,
    grade: grade as Grade,
    semester: semester as Semester,
    theme,
    readAloud: formData.get("readAloud") === "on",
  });
  if (!updated) return { error: "자녀 정보를 찾을 수 없어요." };
  refresh();
  return { ok: true };
}

export async function deleteChild(_prev: ChildFormState, formData: FormData): Promise<ChildFormState> {
  const guardian = await requireGuardian();
  const attemptKey = `delete:${guardian.id}`;
  if (isLockedOut(attemptKey)) return { error: LOCKED_OUT_MESSAGE };
  const db = await getDb();
  const full = await findGuardianByEmail(db, guardian.email);
  const password = String(formData.get("password") ?? "");
  if (!full || !(await verifyPassword(password, full.passwordHash))) {
    recordFailure(attemptKey);
    return { error: "비밀번호가 맞지 않아요." };
  }
  clearFailures(attemptKey);
  const ok = await deleteStudent(db, guardian.id, String(formData.get("id") ?? ""));
  if (!ok) return { error: "자녀 정보를 찾을 수 없어요." };
  redirect("/parent");
}
