import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, Loading, PageShell } from "@/components/ui";
import { ConceptMap } from "@/components/ConceptMap";
import { requireStudent } from "@/auth/session";
import { getDb } from "@/db/client";
import { loadLearner } from "@/db/queries";
import type { Grade, Semester } from "@/domain/curriculum/types";

export const metadata: Metadata = { title: "내 개념 지도" };

export default function MapPage() {
  return (
    <PageShell title="내 개념 지도" back={{ href: "/learn/home", label: "처음 화면" }}>
      <Suspense fallback={<Loading />}>
        <ChildMap />
      </Suspense>
    </PageShell>
  );
}

async function ChildMap() {
  const student = await requireStudent();
  const learner = await loadLearner(await getDb(), student.id);
  return (
    <Card>
      <p className="mb-4 text-muted">개념은 서로 이어져 있어요. 앞의 개념을 익히면 뒤의 개념이 열려요.</p>
      <ConceptMap learner={learner} grade={student.grade as Grade} semester={student.semester as Semester} audience="child" />
    </Card>
  );
}
