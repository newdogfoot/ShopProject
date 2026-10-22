import { Suspense } from "react";
import type { Metadata } from "next";
import { ButtonLink, Card, Loading, PageShell } from "@/components/ui";
import { requireGuardian } from "@/auth/session";
import { getDb } from "@/db/client";
import { listStudents } from "@/db/queries";
import { THEMES } from "@/domain/content/stories";
import { chooseStudent } from "./actions";

export const metadata: Metadata = { title: "누가 공부할까요?" };

export default function ChooseStudentPage() {
  return (
    <PageShell title="누가 공부할까요?" back={{ href: "/parent", label: "보호자 화면" }}>
      <Suspense fallback={<Loading />}>
        <Picker />
      </Suspense>
    </PageShell>
  );
}

async function Picker() {
  const guardian = await requireGuardian();
  const kids = await listStudents(await getDb(), guardian.id);
  if (kids.length === 0) {
    return (
      <Card>
        <p className="mb-4">아직 등록된 자녀가 없어요. 보호자 화면에서 먼저 자녀를 추가해 주세요.</p>
        <ButtonLink href="/parent/children/new">자녀 추가하기</ButtonLink>
      </Card>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {kids.map((kid) => {
        const emoji = THEMES.find((t) => t.id === kid.theme)?.emoji ?? "🙂";
        return (
          <li key={kid.id}>
            <form action={chooseStudent}>
              <input type="hidden" name="studentId" value={kid.id} />
              <button className="flex w-full items-center gap-4 rounded-3xl bg-card p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-4xl" aria-hidden>
                  {emoji}
                </span>
                <span className="flex flex-col">
                  <span className="text-2xl font-extrabold">{kid.nickname}</span>
                  <span className="text-sm text-muted">
                    {kid.grade}학년 {kid.semester}학기
                  </span>
                </span>
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
