import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "수학 탐험 — 초등 AI 맞춤 학습",
    template: "%s · 수학 탐험",
  },
  description:
    "초등 1~6학년을 위한 AI 맞춤 수학 학습. 적응형 진단으로 부족한 개념을 찾고, 개념별 맞춤 설명과 연습으로 채워 갑니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f3ff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
