import { expect, type Page } from "@playwright/test";
import { test } from "./helpers";

/**
 * Whole journey with AI off: guardian signs up with consent → adds a 4th grader →
 * the child takes the adaptive diagnosis (fraction problems answered wrong on
 * purpose) → concept map shows the gap → a learning session explains and
 * practises it → the guardian report shows the results.
 */

const EMAIL = `guardian-${Date.now()}@example.com`;
const PASSWORD = "test-password-1234";

async function answer(page: Page, correct: boolean) {
  await page.getByTestId(correct ? "e2e-correct" : "e2e-wrong").click();
}

/** Types the correct answer with the on-screen keypad (integer problems only). */
async function typeWithKeypad(page: Page): Promise<boolean> {
  const item = page.getByTestId("item");
  if ((await item.getAttribute("data-answer-kind")) !== "integer") return false;
  const correct = JSON.parse((await item.getAttribute("data-test-correct")) ?? "{}") as { text?: string };
  if (!correct.text) return false;
  for (const digit of correct.text) await page.getByRole("button", { name: digit, exact: true }).click();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  return true;
}

test("guardian signup → diagnosis → learning → report", async ({ page }, testInfo) => {
  const shot = (name: string) => page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });

  // 1. Guardian signup with consent.
  await page.goto("/");
  await shot("00-landing");
  await page.getByRole("link", { name: "보호자 가입하고 시작" }).click();
  await page.getByRole("textbox", { name: "보호자 이메일", exact: true }).fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="passwordConfirm"]').fill(PASSWORD);
  await page.locator('input[name="consent-privacy-collection"]').check();
  await page.locator('input[name="consent-guardian-consent-under-14"]').check();
  await page.getByRole("button", { name: "동의하고 가입하기" }).click();
  await expect(page).toHaveURL(/\/parent$/);

  // 2. Add a 4th grader (2nd semester).
  await page.getByRole("link", { name: "자녀 추가하기" }).first().click();
  await page.locator('input[name="nickname"]').fill("별이");
  await page.locator('select[name="grade"]').selectOption("4");
  await page.locator('select[name="semester"]').selectOption("2");
  await page.getByText("우주").click();
  await page.getByRole("button", { name: "자녀 추가하기" }).click();
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByText("진단 전")).toBeVisible();
  await shot("01-parent-before");

  // 3. Child picks their profile and starts the diagnosis.
  await page.getByRole("link", { name: "학습 화면 열기" }).click();
  await page.getByRole("button", { name: /별이/ }).click();
  await expect(page).toHaveURL(/\/learn\/home$/);
  await page.getByRole("link", { name: "수와 연산 실력 확인 시작" }).click();
  await expect(page.getByTestId("item")).toBeVisible();
  await shot("02-diagnosis-item");

  // 4. Diagnosis: fractions wrong on purpose, everything else right.
  let asked = 0;
  let typed = false;
  while (asked < 40) {
    const done = page.getByTestId("diagnosis-done");
    const item = page.getByTestId("item");
    await expect(done.or(item)).toBeVisible();
    if (await done.isVisible()) break;
    const id = (await item.getAttribute("data-item-id")) ?? "";
    if (!typed && !id.startsWith("FRAC_")) typed = await typeWithKeypad(page);
    else await answer(page, !id.startsWith("FRAC_"));
    await expect(page.getByTestId("item").and(page.locator(`[data-item-id="${id}"]`))).toHaveCount(0);
    asked++;
  }
  expect(typed, "one answer typed with the keypad").toBe(true);
  await expect(page.getByTestId("diagnosis-done")).toBeVisible();
  expect(asked).toBeGreaterThanOrEqual(5);
  expect(asked).toBeLessThanOrEqual(20);
  await shot("03-diagnosis-done");

  // 5. Concept map shows mastered skills and the fraction gap.
  await page.getByRole("link", { name: "내 개념 지도 보기" }).click();
  await expect(page.locator('[data-status="mastered"], [data-status="inferred"]').first()).toBeVisible();
  const fractionGaps = page.locator('[data-skill^="FRAC_"][data-status="gap"], [data-skill^="FRAC_"][data-status="misconception"]');
  expect(await fractionGaps.count()).toBeGreaterThan(0);
  await shot("04-concept-map");

  // 6. Learning session: explanation → worked example → practice (one wrong answer to see a hint).
  await page.goto("/learn/home");
  await expect(page.getByRole("heading", { name: "오늘의 학습" })).toBeVisible();
  await shot("05a-home");
  await page.getByRole("link", { name: "시작하기" }).click();
  let sawExplain = false;
  let sawWorked = false;
  let sawHint = false;
  let answered = 0;
  for (let step = 0; step < 60 && answered < 14; step++) {
    const summary = page.getByTestId("session-summary");
    const cont = page.getByTestId("continue");
    const next = page.getByTestId("next");
    const correctBtn = page.getByTestId("e2e-correct");
    await expect(summary.or(cont).or(next).or(correctBtn)).toBeVisible();
    if (await summary.isVisible()) break;
    if (await cont.isVisible()) {
      // Explanation and worked example both have a "continue" button; wait for the screen itself to change.
      const explainTitle = page.getByTestId("explain-title");
      const workedTitle = page.getByRole("heading", { name: "풀이를 따라가 봐요" });
      const isExplain = await explainTitle.isVisible();
      if (isExplain) {
        if (!sawExplain) await shot("05-explain");
        sawExplain = true;
      } else {
        if (!sawWorked) await shot("06-worked");
        sawWorked = true;
      }
      await cont.click();
      await expect(isExplain ? explainTitle : workedTitle).toBeHidden();
      continue;
    }
    if (await next.isVisible()) {
      await next.click();
      await expect(next).toBeHidden();
      continue;
    }
    const purpose = await page.getByTestId("item").locator("span").first().innerText();
    const id = await page.getByTestId("item").getAttribute("data-item-id");
    if (!sawHint && purpose === "연습") {
      await answer(page, false);
      await expect(page.getByTestId("hint")).toBeVisible();
      sawHint = true;
      await shot("07-hint");
    }
    await answer(page, true);
    await expect(page.getByTestId("feedback").and(page.locator('[data-status="correct"]'))).toBeVisible();
    expect(await page.getByTestId("item").getAttribute("data-item-id")).toBe(id);
    answered++;
  }
  expect(sawExplain, "explanation shown for the fraction gap").toBe(true);
  expect(sawWorked, "worked example shown").toBe(true);
  expect(sawHint, "hint shown after a wrong practice answer").toBe(true);
  expect(answered).toBeGreaterThan(3);

  // Stop for today and see the summary.
  if (!(await page.getByTestId("session-summary").isVisible())) {
    await page.getByRole("button", { name: "오늘은 여기까지 할래요" }).click();
  }
  await expect(page.getByTestId("session-summary")).toBeVisible();
  await shot("08-summary");

  // 7. Guardian dashboard and report reflect the work.
  await page.goto("/parent");
  await expect(page.getByText("진단 완료")).toBeVisible();
  await page.getByRole("link", { name: "리포트 보기" }).click();
  await expect(page.getByRole("heading", { name: /별이/ })).toBeVisible();
  await expect(page.getByTestId("domain-summary")).toContainText("수와 연산");
  await expect(page.getByTestId("domain-summary")).toContainText("익힌 개념");
  const problems = page.locator("dt", { hasText: "푼 문제" }).locator("xpath=following-sibling::dd");
  expect(Number(await problems.innerText())).toBeGreaterThan(10);
  await expect(page.locator('[data-skill^="FRAC_"]').first()).toBeVisible();
  await shot("09-report");

  // 8. Phone-sized screens stay usable (no sideways scrolling).
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, name] of [["/learn/home", "10-mobile-home"], ["/learn/session", "11-mobile-session"]] as const) {
    await page.goto(path);
    await expect(page.locator("main, body").first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} fits the screen`).toBeLessThanOrEqual(0);
    await shot(name);
  }
});
