import { expect, test } from "@playwright/test";
import { loginAsAdmin, changeSessionPhase, moveParticipant, blockParticipant } from "./helpers/admin";
import { SELECTORS } from "./fixtures/selectors";
import { expectVisibleText } from "./helpers/assertions";

test("admin live ops core panels and controls", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("button", { name: "라이브 콘솔" }).click();
  await expect(page.locator(SELECTORS.admin.topbar).first()).toBeVisible();
  await expect(page.locator(SELECTORS.admin.liveConsoleButton).first()).toBeVisible();
  await expect(page.locator(SELECTORS.admin.sessionPanel).first()).toBeVisible();
  await expect(page.locator(SELECTORS.admin.tablesPanel).first()).toBeVisible();
  await expect(page.locator(SELECTORS.admin.participantsPanel).first()).toBeVisible();
  await expect(page.locator(SELECTORS.admin.contentPanel).first()).toBeVisible();
  await expect(page.locator(SELECTORS.admin.reportsPanel).first()).toBeVisible();

  await changeSessionPhase(page, "ROUND_1");
  await changeSessionPhase(page, "ROUND_2");

  await moveParticipant(page, "민수", "테이블 1");
  await blockParticipant(page, "민수");
});
