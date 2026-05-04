import { expect, test } from "@playwright/test";

test("customer-admin core flow e2e", async ({ page }) => {
  await page.goto("/customer");
  await expect(page.locator("body")).toContainText("입장 정보를 확인할 수 없어요.");
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();

  await page.goto("/admin");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).toContainText("운영 콘솔");

  // ROUND transition controls
  await expect(page.getByRole("button", { name: /1라운드 시작|ROUND_1 시작/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /휴식|BREAK/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /2라운드 시작|ROUND_2 시작/ })).toBeVisible();

  // Live/content/report/admin operation affordances
  await expect(page.locator("body")).toContainText("운영 제어");
  await expect(page.locator("body")).toContainText("공지");
  await expect(page.locator("body")).toContainText("신고");
  await expect(page.locator("body")).toContainText("세션");
});
