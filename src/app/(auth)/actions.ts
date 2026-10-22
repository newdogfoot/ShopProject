"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { createGuardian, findGuardianByEmail, REQUIRED_CONSENTS } from "@/db/queries";
import { hashPassword, verifyPassword } from "@/auth/password";
import { logout, startLogin } from "@/auth/session";
import { clearFailures, isLockedOut, LOCKED_OUT_MESSAGE, recordFailure } from "@/auth/attempts";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const EmailSchema = z.email({ error: "이메일 형식을 확인해 주세요." }).max(200);
const PasswordSchema = z.string().min(8, { error: "비밀번호는 8자 이상이어야 해요." }).max(100);

/** Only same-site paths are allowed after login. */
function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/parent";
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fields = { email };
  const emailCheck = EmailSchema.safeParse(email);
  if (!emailCheck.success) return { error: emailCheck.error.issues[0].message, fields };
  const passwordCheck = PasswordSchema.safeParse(password);
  if (!passwordCheck.success) return { error: passwordCheck.error.issues[0].message, fields };
  if (password !== String(formData.get("passwordConfirm") ?? "")) return { error: "비밀번호 확인이 일치하지 않아요.", fields };
  for (const kind of REQUIRED_CONSENTS) {
    if (formData.get(`consent-${kind}`) !== "on") return { error: "필수 동의 항목에 모두 동의해 주세요.", fields };
  }

  const db = await getDb();
  if (await findGuardianByEmail(db, email)) return { error: "이미 가입된 이메일이에요. 로그인해 주세요.", fields };
  const guardian = await createGuardian(db, email, await hashPassword(password), REQUIRED_CONSENTS);
  await startLogin(guardian.id);
  redirect("/parent");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fields = { email };
  if (!email || !password) return { error: "이메일과 비밀번호를 입력해 주세요.", fields };
  const attemptKey = `login:${email.toLowerCase()}`;
  if (isLockedOut(attemptKey)) return { error: LOCKED_OUT_MESSAGE, fields };
  const db = await getDb();
  const guardian = await findGuardianByEmail(db, email);
  const ok = guardian ? await verifyPassword(password, guardian.passwordHash) : await verifyPassword(password, "scrypt$16384$8$1$AAAA$AAAA");
  if (!guardian || !ok) {
    recordFailure(attemptKey);
    return { error: "이메일 또는 비밀번호가 맞지 않아요.", fields };
  }
  clearFailures(attemptKey);
  await startLogin(guardian.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/");
}
