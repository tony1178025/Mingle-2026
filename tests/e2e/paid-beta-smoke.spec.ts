import { expect, test } from "@playwright/test";

test("paid beta browser smoke", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("현장 운영 대시보드")).toBeVisible();
  await expect(page.getByText("운영 제어")).toBeVisible();
  await expect(page.getByRole("button", { name: "ROUND_1 시작" })).toBeVisible();
  await expect(page.getByRole("button", { name: "BREAK" })).toBeVisible();
  await expect(page.getByText("현재 세션 상태")).toBeVisible();
  await expect(page.getByText("테이블 상태")).toBeVisible();
  await expect(page.getByPlaceholder("닉네임")).toBeVisible();

  await page.goto("/customer");
  await expect(page.getByText("입장 확인을 먼저 완료한 뒤 현장 프로필을 시작합니다.")).toBeVisible();
  await expect(page.getByTestId("checkin-input")).toBeVisible();
  await expect(page.getByRole("button", { name: "체크인 확인" })).toBeVisible();

  const body = page.locator("body");
  await expect(body).not.toContainText("PENDING");
  await expect(body).not.toContainText("COMPLETED");
  await expect(body).not.toContainText("BLOCKED");
  await expect(body).not.toContainText("LOW_ACTIVITY");
  await expect(body).not.toContainText("COLLAPSING");
  await expect(body).not.toContainText("repository");
  await expect(body).not.toContainText("snapshot");
});
