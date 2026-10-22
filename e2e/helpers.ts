import { expect, type Page } from "@playwright/test";

export const PASSWORD = "test-password-1234";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByRole("textbox", { name: "보호자 이메일", exact: true }).fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('input[name="passwordConfirm"]').fill(PASSWORD);
  await page.locator('input[name="consent-privacy-collection"]').check();
  await page.locator('input[name="consent-guardian-consent-under-14"]').check();
  await page.getByRole("button", { name: "동의하고 가입하기" }).click();
  await expect(page).toHaveURL(/\/parent$/);
}

export async function addChild(page: Page, child: { nickname: string; grade: number; semester: 1 | 2; expectReadAloud?: boolean }) {
  await page.goto("/parent/children/new");
  await page.locator('input[name="nickname"]').fill(child.nickname);
  await page.locator('select[name="grade"]').selectOption(String(child.grade));
  await page.locator('select[name="semester"]').selectOption(String(child.semester));
  if (child.expectReadAloud !== undefined) {
    const box = page.locator('input[name="readAloud"]');
    if (child.expectReadAloud) await expect(box).toBeChecked();
    else await expect(box).not.toBeChecked();
  }
  await page.getByRole("button", { name: "자녀 추가하기" }).click();
  await expect(page).toHaveURL(/\/parent$/);
}

export async function chooseChild(page: Page, nickname: string) {
  await page.goto("/learn");
  await page.getByRole("button", { name: new RegExp(nickname) }).click();
  await expect(page).toHaveURL(/\/learn\/home$/);
}

type Choice = "correct" | "wrong" | "misconception";

/**
 * Answers diagnosis problems with the test-only buttons until the diagnosis ends.
 * `pick` gets the item id (it starts with the skill id). A "misconception" answer
 * falls back to a plain wrong answer when the problem has no predicted wrong answer.
 */
export async function runDiagnosis(page: Page, pick: (itemId: string) => Choice): Promise<{ asked: number; usedMisconception: boolean }> {
  let asked = 0;
  let usedMisconception = false;
  while (asked < 40) {
    const done = page.getByTestId("diagnosis-done");
    const item = page.getByTestId("item");
    await expect(done.or(item)).toBeVisible();
    if (await done.isVisible()) break;
    const id = (await item.getAttribute("data-item-id")) ?? "";
    let choice = pick(id);
    if (choice === "misconception") {
      if ((await page.getByTestId("e2e-misconception").count()) > 0) usedMisconception = true;
      else choice = "wrong";
    }
    await page.getByTestId(`e2e-${choice}`).click();
    await expect(page.locator(`[data-testid="item"][data-item-id="${id}"]`)).toHaveCount(0);
    asked++;
  }
  await expect(page.getByTestId("diagnosis-done")).toBeVisible();
  return { asked, usedMisconception };
}
