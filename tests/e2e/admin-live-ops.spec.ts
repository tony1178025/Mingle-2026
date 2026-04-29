import { expect, test } from "@playwright/test";
import { loginAsAdmin, changeSessionPhase, moveParticipant, blockParticipant } from "./helpers/admin";
import { SELECTORS } from "./fixtures/selectors";
import { expectVisibleText } from "./helpers/assertions";

test("admin live ops core panels and controls", async ({ page }) => {
  await loginAsAdmin(page);
  if (
    await page
      .getByText("관리자 사용자 스토어가 아직 준비되지 않았습니다.")
      .isVisible()
      .catch(() => false)
  ) {
    test.skip(true, "Admin store is not seeded in runtime environment.");
  }
  await expectVisibleText(page, "현장 운영");
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
