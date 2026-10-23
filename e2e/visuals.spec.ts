import { expect } from "@playwright/test";
import { test } from "./helpers";

/** Every kind of picture renders without browser errors and fits a phone screen (test-mode gallery). */
test("picture gallery", async ({ page }, testInfo) => {
  await page.goto("/dev/visuals");
  const gallery = page.getByTestId("visual-gallery");
  await expect(gallery).toBeVisible();
  expect(await gallery.locator("svg, table, ul").count()).toBeGreaterThan(25);
  await page.screenshot({ path: testInfo.outputPath("gallery-desktop.png"), fullPage: true });

  // Unit answers: 75분 is right but not simplest; 2시간 15분 is right. The ruler answer is typed before "cm".
  const time = page.getByTestId("item").filter({ has: page.getByText("1시간 50분 + 25분") });
  const key = (name: string) => time.getByRole("button", { name, exact: true });
  await key("1").click();
  await key("다음 칸").click();
  await key("7").click();
  await key("5").click();
  await key("확인").click();
  await expect(page.getByTestId("demo-result-demo-time")).toContainText("form: 값은 맞았어요! 60분 = 1시간");
  await expect(page.getByTestId("demo-result-demo-time")).toContainText("(1시간 75분)");
  await time.getByRole("button", { name: /분 칸/ }).click();
  await key("지우기").click();
  await key("지우기").click();
  await key("1").click();
  await key("5").click();
  await time.getByRole("button", { name: /시간 칸/ }).click();
  await key("지우기").click();
  await key("2").click();
  await key("확인").click();
  await expect(page.getByTestId("demo-result-demo-time")).toHaveText("correct (2시간 15분)");
  const ruler = page.getByTestId("item").filter({ has: page.getByText("막대의 길이") });
  // The unit is written after the answer box.
  await expect(ruler.locator("span").filter({ hasText: /^cm$/ })).toBeVisible();
  await ruler.getByRole("button", { name: "5", exact: true }).click();
  await ruler.getByRole("button", { name: "확인", exact: true }).click();
  await expect(page.getByTestId("demo-result-demo-ruler")).toHaveText("correct (5 cm)");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(gallery).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "gallery fits a phone screen").toBeLessThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath("gallery-mobile.png"), fullPage: true });
});
