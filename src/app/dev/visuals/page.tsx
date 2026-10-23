import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Card, Loading, PageShell } from "@/components/ui";
import { VisualView } from "@/components/Visual";
import { toItemView } from "@/app/learn/views";
import { DEMO_ITEMS, SAMPLE_VISUALS } from "./samples";
import { KeypadDemo } from "./KeypadDemo";

export const metadata: Metadata = { title: "그림 모음 (개발용)", robots: { index: false, follow: false } };

/** Every kind of picture, for checking how they look. Not available in production (except E2E test mode). */
export default function VisualGalleryPage() {
  return (
    <PageShell title="그림 모음 (개발용)">
      <Suspense fallback={<Loading />}>
        <Gallery />
      </Suspense>
    </PageShell>
  );
}

async function Gallery() {
  await connection();
  if (process.env.NODE_ENV === "production" && process.env.E2E_TEST_MODE !== "1") notFound();
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2" data-testid="visual-gallery">
        {SAMPLE_VISUALS.map(({ name, visual }) => (
          <Card key={name}>
            <h2 className="mb-3 text-sm font-bold text-muted">{name}</h2>
            <div className="flex justify-center">
              <VisualView visual={visual} />
            </div>
          </Card>
        ))}
      </div>
      <section data-testid="keypad-demo">
        <h2 className="mb-3 text-lg font-bold">단위가 있는 답</h2>
        <KeypadDemo items={DEMO_ITEMS.map((item) => ({ item, view: toItemView(item, "practice") }))} />
      </section>
    </div>
  );
}
