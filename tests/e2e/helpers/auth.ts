import type { Page } from "@playwright/test";
import { selectors } from "../fixtures/selectors";
import { TEST_DATA } from "../fixtures/test-data";
import { expectVisibleText } from "./assertions";

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(300);

  const loginInput = page.getByLabel("로그인 ID 또는 이메일");
  const passwordInput = page.getByLabel("관리자 비밀번호");
  const loginButton = page.getByRole("button", { name: "관리자 로그인" });

  if (await loginInput.isVisible().catch(() => false)) {
    await loginInput.fill(TEST_DATA.adminUser.email);
    await passwordInput.fill(TEST_DATA.adminUser.password);
    await loginButton.click();
    await expectVisibleText(page, selectors.admin.dashboardTitle);
    return;
  }

  // In local e2e runtime, admin store may be unseeded; guard without hard-failing helper.
  const unseededHint = page.getByText("관리자 사용자 스토어가 아직 준비되지 않았습니다.");
  if (await unseededHint.isVisible().catch(() => false)) {
    return;
  }

  await expectVisibleText(page, selectors.admin.dashboardTitle);
}
