import { expect, test } from "@playwright/test";
import { expectVisibleText } from "./helpers/assertions";
import { completeCustomerOnboarding, openParticipantsTab } from "./helpers/customer";
import { getQrUrl } from "./helpers/qr";
import { TEST_PROFILES } from "./fixtures/test-data";

test("customer check-in flow keeps session across refresh", async ({ page }) => {
  await page.goto(getQrUrl("validRound1"));
  await expectVisibleText(page, "프로필 설정");

  await completeCustomerOnboarding(page, TEST_PROFILES.primary);

  await openParticipantsTab(page);
  await expect(page.locator("main")).toContainText("참가자");

  await page.reload();
  await openParticipantsTab(page);
  await expect(page.locator("main")).toContainText("참가자");
});

test("expired or revoked qr should stay out of onboarding success", async ({ page }) => {
  await page.goto(getQrUrl("revoked"));
  await expect(page.locator("main")).toContainText(/입장 확인 중|입장 실패/);
  await expect(page.locator("main")).not.toContainText("참가자");
});

test("bootstrap qr endpoint is reachable", async ({ request }) => {
  const response = await request.get("/api/customer/entry?branchId=branch_seongsu&tableId=1");
  expect(response.status()).toBe(200);
});
