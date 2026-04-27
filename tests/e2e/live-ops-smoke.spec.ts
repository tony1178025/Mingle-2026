import { test, expect } from "@playwright/test";

test("customer and admin routes are reachable", async ({ page }) => {
  await page.goto("/customer");
  await expect(page.locator("body")).toBeVisible();
  await page.goto("/admin");
  await expect(page.locator("body")).toBeVisible();
});
