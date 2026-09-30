import { expect, test, type Page } from "@playwright/test";

async function drawAndInterpret(page: Page, question: string) {
  await page.goto("/");
  await page.fill("#question", question);
  await page.getByRole("button", { name: /shuffle the deck/i }).click();
  const drawForMe = page.getByRole("button", { name: /draw for me/i });
  await drawForMe.waitFor();
  for (let i = 0; i < 3; i++) await drawForMe.click();
  await page.getByRole("button", { name: /reveal all/i }).click();
  await page.getByRole("button", { name: /interpret my reading/i }).click();
}

test("a full reading: shuffle, pick, reveal, interpret, follow up, inspect", async ({ page }) => {
  await drawAndInterpret(page, "What should I focus on in my new role at work?");
  await expect(page.getByText("The reading", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/draw verified/i)).toBeVisible();
  await expect(page.locator("ol li.panel")).toHaveCount(3);

  await page.fill("#followup", "What does the future card suggest?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Consulting the cards…")).toBeHidden({ timeout: 30_000 });
  await expect(page.locator("section[aria-label='Follow-up conversation'] p.rounded-2xl").nth(1)).toBeVisible();

  await page.getByRole("button", { name: /inspect pipeline/i }).click();
  const drawer = page.getByRole("dialog", { name: "Pipeline trace" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Deterministic draw")).toBeVisible();
});

test("explicit crisis language routes to support instead of a reading", async ({ page }) => {
  await drawAndInterpret(page, "I want to end my life, will anything change?");
  await expect(page.getByRole("alert")).toContainText("You deserve real support", { timeout: 30_000 });
  await expect(page.getByRole("button", { name: /continue to the reading/i })).toHaveCount(0);
});

test("Four Pillars chart matches a hand-checked reference", async ({ page }) => {
  await page.goto("/#/pillars");
  await page.fill("input[type='date']", "2000-01-01");
  await page.fill("input[type='time']", "12:00");
  await page.selectOption("select", "Asia/Shanghai");
  for (const char of ["己", "卯", "丙", "子", "戊", "午"]) {
    await expect(page.locator("p.font-display", { hasText: char }).first()).toBeVisible();
  }
  await expect(page.getByText("Day Master 戊", { exact: true })).toBeVisible();
});

test("the validator playground rejects a flipped orientation", async ({ page }) => {
  await page.goto("/#/lab");
  await expect(page.getByText(/passes every check/i)).toBeVisible();
  await page.getByRole("button", { name: "Flip an orientation" }).click();
  await expect(page.getByText(/was drawn (upright|reversed), not/)).toBeVisible();
});
