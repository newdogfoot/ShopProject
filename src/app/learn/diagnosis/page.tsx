import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Loading, PageShell } from "@/components/ui";
import { requireStudent } from "@/auth/session";
import { getDb } from "@/db/client";
import { activeDomains, isDomainId } from "@/domain/curriculum/skills";
import { diagnosisView } from "../actions";
import { defaultDiagnosisDomain } from "../data";
import { DiagnosisRunner } from "./DiagnosisRunner";

export const metadata: Metadata = { title: "실력 확인" };

/** The first diagnosis of one domain: /learn/diagnosis?domain=GEO_MEAS (default: one in progress or not done yet). */
export default function DiagnosisPage(props: PageProps<"/learn/diagnosis">) {
  return (
    <PageShell title="실력 확인" back={{ href: "/learn/home", label: "처음 화면" }}>
      <Suspense fallback={<Loading label="문제를 준비하고 있어요…" />}>
        <Diagnosis searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Diagnosis({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const student = await requireStudent();
  const { domain: asked } = await searchParams;
  const known = typeof asked === "string" && isDomainId(asked) && activeDomains().some((d) => d.id === asked);
  const domain = known ? asked : await defaultDiagnosisDomain(await getDb(), student.id);
  const view = await diagnosisView(domain);
  // Already diagnosed and nothing in progress: nothing to do here.
  if (view.type === "done" && view.alreadyDone) redirect("/learn/home");
  return <DiagnosisRunner key={domain} initial={view} readAloud={student.readAloud} />;
}
