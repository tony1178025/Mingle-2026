import { expect, test } from "@playwright/test";

async function completeOnboarding(page: import("@playwright/test").Page) {
  await page.goto("/customer");
  await page.getByTestId("checkin-mode-code").click();
  await page.getByTestId("checkin-input").fill("2026");
  await page.getByTestId("checkin-verify").click();

  await page.getByTestId("profile-nickname").fill("현장테스트");
  await page.getByTestId("profile-age").selectOption("29");
  await page.getByTestId("profile-job-category").selectOption("사업개발/기획");
  await page.getByTestId("profile-job").selectOption("사업개발");
  await page.getByTestId("profile-height").fill("178");
  await page.getByTestId("profile-animal").selectOption("강아지상");
  await page.getByTestId("profile-energy-e").click();
  await page.getByTestId("complete-profile").click();
}

test("customer can check in and reach table-based explore", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByTestId("current-table-label")).toBeVisible();
  await expect(page.getByText("전체 테이블 흐름 보기")).toBeVisible();
});

test("hearts remain count-only in round 1", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "하트", exact: true }).click();
  await expect(page.getByTestId("received-heart-count")).toBeVisible();
  await expect(page.getByText("1부에서는 받은 하트 수만 공개됩니다.").first()).toBeVisible();
});

test("admin can reveal, preview rotation, and customer sees the updated state", async ({ page }) => {
  await completeOnboarding(page);
  const initialTable = await page.getByTestId("current-table-label").textContent();

  const sendButtons = page.locator("[data-testid^='send-heart-']");
  await sendButtons.nth(0).click();
  await sendButtons.nth(1).click();
  await sendButtons.nth(2).click();

  await page.goto("/admin");
  await page.getByTestId("admin-phase-round_2").click();
  await page.getByTestId("admin-reveal-toggle").click();
  await page.getByTestId("admin-generate-rotation").click();
  await page.getByTestId("admin-apply-rotation").click();

  await page.goto("/customer");
  await page.getByRole("button", { name: "하트", exact: true }).click();
  await expect(page.getByText("아직 받은 하트가 없습니다.").first()).toBeVisible();
  await expect(page.getByTestId("current-table-label")).not.toHaveText(initialTable ?? "");
});

test("customer can submit a report", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "설정" }).click();
  await page.getByTestId("report-target").selectOption({ index: 1 });
  await page.getByTestId("report-reason").selectOption({ index: 1 });
  await page.getByTestId("report-details").fill("상대가 반복적으로 불편한 질문을 했습니다.");
  await page.getByTestId("submit-report").click();
  await expect(page.getByText("운영팀에 신고가 전달되었습니다.")).toBeVisible();
});
