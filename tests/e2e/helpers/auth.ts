import type { Page } from "@playwright/test";
import { selectors } from "../fixtures/selectors";
import { TEST_DATA } from "../fixtures/test-data";
import { expectVisibleText } from "./assertions";

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin");
  await expectVisibleText(page, selectors.admin.dashboardTitle);

  const emailInput = page.getByPlaceholder("이메일");
  const passwordInput = page.getByPlaceholder("비밀번호");
  const loginButton = page.getByRole("button", { name: "로그인" });

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(TEST_DATA.adminUser.email);
    await passwordInput.fill(TEST_DATA.adminUser.password);
    await loginButton.click();
    await expectVisibleText(page, selectors.admin.dashboardTitle);
  }
}
