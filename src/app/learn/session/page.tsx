import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Loading, PageShell } from "@/components/ui";
import { requireStudent } from "@/auth/session";
import { sessionView } from "../actions";
import { SessionRunner } from "./SessionRunner";

export const metadata: Metadata = { title: "오늘의 학습" };

export default function SessionPage() {
  return (
    <PageShell back={{ href: "/learn/home", label: "처음 화면" }}>
      <Suspense fallback={<Loading label="오늘의 학습을 준비하고 있어요…" />}>
        <Session />
      </Suspense>
    </PageShell>
  );
}

async function Session() {
  const student = await requireStudent();
  if (!student.diagnosedAt) redirect("/learn/diagnosis");
  const view = await sessionView();
  return <SessionRunner initial={view} readAloud={student.readAloud} />;
}
