import type { Metadata } from "next";
import { Card, PageShell } from "@/components/ui";
import { SignupForm } from "../AuthForms";

export const metadata: Metadata = { title: "보호자 가입" };

export default function SignupPage() {
  return (
    <PageShell back={{ href: "/", label: "처음으로" }}>
      <Card className="mx-auto w-full max-w-md">
        <h1 className="mb-1 text-2xl font-extrabold">보호자 가입</h1>
        <p className="mb-5 text-sm text-muted">자녀(만 14세 미만)의 학습 계정은 보호자 계정 아래에 만들어요.</p>
        <SignupForm />
      </Card>
    </PageShell>
  );
}
