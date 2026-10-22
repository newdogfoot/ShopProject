/**
 * Guardian login session (httpOnly cookie holding a random token; only its
 * SHA-256 hash is stored) and the selected child profile.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { createAuthSession, deleteAuthSession, getStudent, guardianForToken } from "@/db/queries";

export const SESSION_COOKIE = "sid";
export const STUDENT_COOKIE = "stu";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function startLogin(guardianId: string): Promise<void> {
  const db = await getDb();
  const { token, expiresAt } = await createAuthSession(db, guardianId);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteAuthSession(await getDb(), token);
  store.delete(SESSION_COOKIE);
  store.delete(STUDENT_COOKIE);
}

/** The signed-in guardian, or null. Deduplicated per request. */
export const getCurrentGuardian = cache(async () => {
  // Login state is per request: keep it (and the expiry check's clock) out of prerenders and prefetches.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return guardianForToken(await getDb(), token);
});

export async function requireGuardian() {
  const guardian = await getCurrentGuardian();
  if (!guardian) redirect("/login");
  return guardian;
}

export async function selectStudent(studentId: string): Promise<void> {
  (await cookies()).set(STUDENT_COOKIE, studentId, { ...cookieBase, maxAge: 60 * 60 * 24 * 30 });
}

/** The child currently using the app (must belong to the signed-in guardian). */
export const getCurrentStudent = cache(async () => {
  const guardian = await getCurrentGuardian();
  if (!guardian) return null;
  const id = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return getStudent(await getDb(), guardian.id, id);
});

export async function requireStudent() {
  await requireGuardian();
  const student = await getCurrentStudent();
  if (!student) redirect("/learn");
  return student;
}
