import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { expectNotVisibleText, expectVisibleText } from "./helpers/assertions";
import { customerSelectors } from "./fixtures/selectors";
import { completeCustomerOnboarding, submitReport } from "./helpers/customer";
import { testCustomerProfile, TEST_QR_URLS } from "./fixtures/test-data";

test.describe("customer content and report", () => {
  test("content list and report submission flow remains stable", async ({ page }) => {
    await completeCustomerOnboarding(page, { ...testCustomerProfile, qrUrl: TEST_QR_URLS.primaryTable });

    await page.getByRole("button", { name: "콘텐츠" }).click();
    await expectVisibleText(page, "받은 하트");

    await submitReport(page, "참가자", "불쾌한 언행");
    await expect(page.locator(customerSelectors.reportSubmit)).toBeVisible();
    await expectNotVisibleText(page, "신고자");
  });

  test("admin reports panel is reachable for operational review", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");
    await expect(page.locator("body")).toContainText(/신고|제재|리포트/);
  });
});
