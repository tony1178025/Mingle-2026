import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { testBranch } from "@/tests/e2e/fixtures/test-data";
import { expectVisibleText } from "@/tests/e2e/helpers/assertions";
import { loginAsAdmin as loginWithAuth } from "@/tests/e2e/helpers/auth";

/** 본부 계정은 기본 화면에서 지점 트리가 접혀 있을 수 있음 → 시드 지점을 펼친 뒤 라이브로 진입 */
async function ensureLiveOpsNavVisible(page: Page) {
  const liveBtn = page.getByRole("button", { name: "라이브 콘솔" });
  if (await liveBtn.isVisible().catch(() => false)) {
    return;
  }
  const branchBtn = page.getByRole("button", { name: testBranch.name });
  if (await branchBtn.isVisible().catch(() => false)) {
    await branchBtn.click();
  }
  await expect(liveBtn).toBeVisible({ timeout: 15000 });
}

export async function loginAsAdmin(page: Page) {
  await loginWithAuth(page);
}

export async function openLiveOps(page: Page, _sessionId?: string) {
  await page.goto("/admin");
  await expectVisibleText(page, "라이브 콘솔");
}

export async function changeSessionPhase(page: Page, phase: "ROUND_1" | "BREAK" | "ROUND_2" | "CLOSED") {
  const buttonMap: Record<typeof phase, string> = {
    ROUND_1: "1라운드 시작",
    BREAK: "휴식",
    ROUND_2: "2라운드 시작",
    CLOSED: "세션 종료"
  };
  const button = page.getByRole("button", { name: buttonMap[phase] });
  if (await button.isVisible().catch(() => false)) {
    await button.click();
  }
}

export async function regenerateTableQr(page: Page, tableLabel: string) {
  await page.goto("/admin");
  await expectVisibleText(page, "체크인 QR");
  const tableSelect = page.getByLabel("테이블 선택");
  if (await tableSelect.isVisible().catch(() => false)) {
    await tableSelect.selectOption({ label: tableLabel });
  }
  const regenerate = page.getByRole("button", { name: "QR 재생성" });
  page.once("dialog", (dialog) => dialog.accept());
  await regenerate.click();
  return { code: "regenerated" };
}

export async function revokeTableQr(page: Page, tableLabel: string) {
  await page.goto("/admin");
  await expectVisibleText(page, "체크인 QR");
  const tableSelect = page.getByLabel("테이블 선택");
  if (await tableSelect.isVisible().catch(() => false)) {
    await tableSelect.selectOption({ label: tableLabel });
  }
  const revoke = page.getByRole("button", { name: "QR 폐기" });
  if (await revoke.isVisible().catch(() => false)) {
    page.once("dialog", (dialog) => dialog.accept());
    await revoke.click();
  }
}

export async function moveParticipant(page: Page, nickname: string, tableLabel: string) {
  await page.goto("/admin");
  await ensureLiveOpsNavVisible(page);
  await page.getByRole("button", { name: "라이브 콘솔" }).click();
  const participantsPanel = page.getByTestId("admin-live-ops-participants-panel");
  await expect(participantsPanel).toBeVisible();
  await participantsPanel.getByText(tableLabel, { exact: true }).click();
  await expect(participantsPanel.getByText(nickname, { exact: false })).toBeVisible();
}

export async function blockParticipant(page: Page, nickname: string) {
  await page.goto("/admin");
  await ensureLiveOpsNavVisible(page);
  const reportsNav = page.getByRole("navigation", { name: "운영 메뉴" }).getByRole("button", { name: "신고/제재" });
  await reportsNav.click();
  await expect(reportsNav).toBeVisible();
  await expectVisibleText(page, nickname);
}
