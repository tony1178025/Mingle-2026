import type { Page } from "@playwright/test";
import { expectVisibleText } from "@/tests/e2e/helpers/assertions";
import { loginAsAdmin as loginWithAuth } from "@/tests/e2e/helpers/auth";

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
  await expectVisibleText(page, "참가자");
  await expectVisibleText(page, nickname);
  await expectVisibleText(page, tableLabel);
}

export async function blockParticipant(page: Page, nickname: string) {
  await page.goto("/admin");
  await expectVisibleText(page, "신고/제재");
  await expectVisibleText(page, nickname);
}
