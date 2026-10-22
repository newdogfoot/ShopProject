import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Loading, PageShell } from "@/components/ui";
import { requireStudent } from "@/auth/session";
import { diagnosisView } from "../actions";
import { DiagnosisRunner } from "./DiagnosisRunner";

export const metadata: Metadata = { title: "실력 확인" };

export default function DiagnosisPage() {
  return (
    <PageShell title="실력 확인" back={{ href: "/learn/home", label: "처음 화면" }}>
      <Suspense fallback={<Loading label="문제를 준비하고 있어요…" />}>
        <Diagnosis />
      </Suspense>
    </PageShell>
  );
}

async function Diagnosis() {
  const student = await requireStudent();
  const view = await diagnosisView();
  // Already diagnosed and nothing in progress: nothing to do here.
  if (view.type === "done" && student.diagnosedAt && view.asked === 0) redirect("/learn/home");
  return <DiagnosisRunner initial={view} readAloud={student.readAloud} />;
}
