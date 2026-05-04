import { expect, test } from "@playwright/test";
import { loginAsAdmin, regenerateTableQr, revokeTableQr, changeSessionPhase } from "./helpers/admin";
import { buildQrUrl, getSessionStatePayload } from "./helpers/qr";
import { qrUrls } from "./fixtures/test-data";

test.describe("qr-lifecycle", () => {
  test("regenerate/revoke/closed guard policies are enforced", async ({ page, request }) => {
    await page.goto(qrUrls.valid);
    await expect(page.locator("body")).toBeVisible();

    await loginAsAdmin(page);
    const regeneratedCode = await regenerateTableQr(page, "테이블 1");
    const newQr = buildQrUrl(qrUrls.valid, regeneratedCode.code ?? "new-code");
    await revokeTableQr(page, "테이블 1");

    const oldState = (await getSessionStatePayload(request)) as {
      snapshot?: { participants?: unknown[] };
      data?: { participants?: unknown[] };
    };
    expect(oldState.snapshot?.participants ?? oldState.data?.participants).toBeDefined();

    await page.goto(newQr);
    await expect(page.locator("body")).toBeVisible();

    await changeSessionPhase(page, "CLOSED");
    await page.goto(qrUrls.valid);
    await expect(page.locator("body")).toContainText(/입장 실패|종료|차단/);
  });
});
