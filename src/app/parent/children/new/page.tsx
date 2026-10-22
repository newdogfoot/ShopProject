import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Card, Loading, PageShell } from "@/components/ui";
import { requireGuardian } from "@/auth/session";
import { semesterOf } from "@/domain/curriculum/types";
import { NewChildForm } from "../../ChildForms";

export const metadata: Metadata = { title: "자녀 추가" };

export default function NewChildPage() {
  return (
    <PageShell title="자녀 추가" back={{ href: "/parent", label: "보호자 화면" }}>
      <Card>
        <Suspense fallback={<Loading />}>
          <Form />
        </Suspense>
      </Card>
    </PageShell>
  );
}

async function Form() {
  await requireGuardian();
  await connection();
  return <NewChildForm defaultSemester={semesterOf(new Date())} />;
}
