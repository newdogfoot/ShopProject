import { expect } from "@playwright/test";
import { addChild, chooseChild, runDiagnosis, signUp, test, uniqueEmail } from "./helpers";

test("grades 1–2: no diagnosis in grade 1 semester 1, a short one in grade 2, read-aloud on by default", async ({ page }) => {
  await signUp(page, uniqueEmail("g12"));
  await addChild(page, { nickname: "콩이", grade: 1, semester: 1, expectReadAloud: true });
  await addChild(page, { nickname: "토리", grade: 2, semester: 2, expectReadAloud: true });

  // Grade 1, semester 1: nothing has been taught yet, so learning starts right away.
  await chooseChild(page, "콩이");
  await page.getByRole("link", { name: "수와 연산 실력 확인 시작" }).click();
  await expect(page.getByTestId("diagnosis-done")).toBeVisible();
  await expect(page.getByText("지금 학기에는 확인할 내용이 없어서")).toBeVisible();
  await page.getByRole("link", { name: "오늘의 학습 시작" }).click();
  await expect(page.getByTestId("item").or(page.getByTestId("explain-title"))).toBeVisible();

  // Grade 2: the diagnosis stays short (at most 12 problems for grades 1–2).
  await chooseChild(page, "토리");
  await page.getByRole("link", { name: "수와 연산 실력 확인 시작" }).click();
  const { asked } = await runDiagnosis(page, () => "correct");
  expect(asked).toBeGreaterThanOrEqual(3);
  expect(asked).toBeLessThanOrEqual(12);
  await page.goto("/learn/home");
  await expect(page.getByRole("heading", { name: "오늘의 학습" })).toBeVisible();
  await expect(page.getByRole("link", { name: "시작하기" })).toBeVisible();
});

test("grade 5: a misconception answer shows up for the guardian with the child's real answer", async ({ page }, testInfo) => {
  await signUp(page, uniqueEmail("g5"));
  await addChild(page, { nickname: "하늘", grade: 5, semester: 2, expectReadAloud: false });
  await chooseChild(page, "하늘");
  await page.getByRole("link", { name: "수와 연산 실력 확인 시작" }).click();

  // Fractions and decimals answered with the typical wrong answer, everything else right.
  const { asked, usedMisconception } = await runDiagnosis(page, (id) => (id.startsWith("FRAC_") || id.startsWith("DEC_") ? "misconception" : "correct"));
  expect(usedMisconception).toBe(true);
  expect(asked).toBeLessThanOrEqual(25);

  // The child's map marks it as something to set right.
  await page.goto("/learn/map");
  await expect(page.locator('[data-status="misconception"]').first()).toBeVisible();

  // The guardian sees the misconception, the child's actual answer and a tip.
  await page.goto("/parent");
  await expect(page.locator("dt", { hasText: "오개념" }).locator("xpath=following-sibling::dd")).not.toHaveText("0");
  await page.getByRole("link", { name: "리포트 보기" }).click();
  await expect(page.getByRole("heading", { name: "바로잡고 있는 오개념" })).toBeVisible();
  await expect(page.getByText("실제 답:").first()).toBeVisible();
  await expect(page.getByText("집에서 도와주기:").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("grade5-report.png"), fullPage: true });

  // Learning starts with an explanation or a quick check.
  await page.goto("/learn/session");
  await expect(page.getByTestId("explain-title").or(page.getByTestId("item"))).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("grade5-session.png"), fullPage: true });
});
