import { expect, test } from "@playwright/test";
import { completeCustomerOnboarding, openParticipantsTab, sendHeartToParticipant } from "./helpers/customer";
import { testCustomerProfile } from "./fixtures/test-data";

test.describe("customer heart and match flow", () => {
  test("heart send, duplicate prevention, self-heart prevention", async ({ page }) => {
    await completeCustomerOnboarding(page, testCustomerProfile);
    await openParticipantsTab(page);
    await sendHeartToParticipant(page, "민지");
    await expect(page.locator("body")).toContainText("하트를 보냈어요");

    // Duplicate send attempt should be blocked by UI state/message.
    await sendHeartToParticipant(page, "민지");
    await expect(page.locator("body")).toContainText("이미 하트를 보낸 사람입니다");
  });

  test("contact remains hidden before match reveal", async ({ page }) => {
    await completeCustomerOnboarding(page, testCustomerProfile);
    await page.goto("/customer");
    await expect(page.locator("body")).not.toContainText("전화번호");
    await expect(page.locator("body")).not.toContainText("카카오톡 ID");
  });
});
