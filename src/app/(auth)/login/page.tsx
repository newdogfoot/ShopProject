import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, Loading, PageShell } from "@/components/ui";
import { LoginForm } from "../AuthForms";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <PageShell back={{ href: "/", label: "처음으로" }}>
      <Card className="mx-auto w-full max-w-md">
        <h1 className="mb-1 text-2xl font-extrabold">보호자 로그인</h1>
        <p className="mb-5 text-sm text-muted">로그인한 뒤 자녀를 골라 학습을 시작해요.</p>
        <Suspense fallback={<Loading />}>
          <LoginForm />
        </Suspense>
      </Card>
    </PageShell>
  );
}
