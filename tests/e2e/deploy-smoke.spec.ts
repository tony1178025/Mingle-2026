import { expect, test } from "@playwright/test";

test("deploy smoke: root redirects to admin", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
});

test("deploy smoke: admin and customer pages render", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");

  await page.goto("/customer");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).toContainText("입장 정보를 확인할 수 없어요.");
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("deploy smoke: session current endpoint is reachable", async ({ request }) => {
  const response = await request.get("/api/session/current");
  expect(response.status()).toBe(200);
});

