import { expect } from "@playwright/test";
import { addChild, chooseChild, runDiagnosis, signUp, test, uniqueEmail } from "./helpers";

/**
 * With the test-only fake AI (AI_FAKE=1): "왜요?" on a worked example, a written
 * "why" answer that the AI is unsure about, and the guardian checking it.
 */
test("grade 4 with AI: why?, a written explanation, and the guardian's check", async ({ page }, testInfo) => {
  const shot = (name: string) => page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });

  await signUp(page, uniqueEmail("write"));
  await addChild(page, { nickname: "글샘", grade: 4, semester: 2 });
  await chooseChild(page, "글샘");
  await page.getByRole("link", { name: "실력 확인 시작" }).click();
  await runDiagnosis(page, (id) => (id.startsWith("FRAC_") ? "wrong" : "correct"));

  await page.goto("/learn/session");
  let askedWhy = false;
  let wrote = false;
  let slipped = false;
  for (let step = 0; step < 80; step++) {
    const summary = page.getByTestId("session-summary");
    const cont = page.getByTestId("continue");
    const next = page.getByTestId("next");
    const writing = page.getByTestId("written-answer");
    const correctBtn = page.getByTestId("e2e-correct");
    await expect(summary.or(cont).or(next).or(writing).or(correctBtn).first()).toBeVisible();
    if (await summary.isVisible()) break;

    if (await writing.isVisible()) {
      // Short on purpose: the fake AI scores it "partly right" and is unsure, so the guardian checks it.
      await writing.fill("크기가 달라요");
      await page.getByRole("button", { name: "다 썼어요" }).click();
      await expect(page.getByTestId("feedback")).toHaveAttribute("data-status", "partial");
      await expect(page.getByTestId("model-answer")).toBeVisible();
      await shot("written-feedback");
      wrote = true;
      break;
    }

    if (await cont.isVisible()) {
      const workedTitle = page.getByRole("heading", { name: "풀이를 따라가 봐요" });
      if (!askedWhy && (await workedTitle.isVisible())) {
        await page.getByTestId("why").first().click();
        await expect(page.getByTestId("why-answer").first()).toContainText("앞 단계에서");
        await shot("why-answer");
        askedWhy = true;
      }
      const explainTitle = page.getByTestId("explain-title");
      const isExplain = await explainTitle.isVisible();
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
    if (!slipped && purpose === "연습") {
      await page.getByTestId("e2e-wrong").click();
      await expect(page.getByTestId("hint")).toBeVisible();
      slipped = true;
    }
    await correctBtn.click();
    await expect(page.getByTestId("feedback")).toBeVisible();
  }
  expect(askedWhy, "asked why on a worked example").toBe(true);
  expect(wrote, "wrote a why answer").toBe(true);

  // The guardian sees the explanation and why answers went wrong, and checks the explanation.
  await page.goto("/parent");
  await page.getByRole("link", { name: "리포트 보기" }).click();
  const written = page.getByTestId("written-explanations");
  await expect(written).toContainText("크기가 달라요");
  await expect(page.getByTestId("error-causes")).toContainText(/단순 실수|개념 이해|계산 순서|원인 확인 중/);
  await page.getByRole("button", { name: "맞게 설명했어요" }).click();
  await expect(written).toContainText("보호자 확인: 맞게 설명했어요");
  await shot("guardian-report");
});
