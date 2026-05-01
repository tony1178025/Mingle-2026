import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { customerSelectors } from "@/tests/e2e/fixtures/selectors";
import type { CustomerOnboardingData } from "@/tests/e2e/fixtures/test-data";
import { testBranch } from "@/tests/e2e/fixtures/test-data";

export async function completeCustomerOnboarding(
  page: Page,
  qrUrlOrData: string | CustomerOnboardingData,
  maybeData?: CustomerOnboardingData
) {
  const data =
    typeof qrUrlOrData === "string" ? (maybeData as CustomerOnboardingData | undefined) : qrUrlOrData;
  const qrUrl = typeof qrUrlOrData === "string" ? qrUrlOrData : qrUrlOrData.qrUrl;
  const entryProbe = await page.request.get(
    `/api/customer/entry?branchId=${encodeURIComponent(testBranch.id)}&tableId=1`
  );
  const entryPayload = (await entryProbe.json()) as {
    checkinResolution?: { flowState?: string; customerSecondaryMessage?: string | null };
  };
  if (entryPayload.checkinResolution?.flowState === "BLOCKED") {
    throw new Error(
      `E2E bootstrap check-in precondition failed: ${entryPayload.checkinResolution?.customerSecondaryMessage ?? "unknown"}`
    );
  }
  await page.goto(qrUrl);
  await expect(page.locator("body")).toBeVisible({
    timeout: 10000
  });
  await expect(page.getByRole("heading", { name: "프로필 설정" })).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main")).not.toContainText("입장 실패", { timeout: 10000 });
  await page.waitForTimeout(1200);

  if (!data) {
    return;
  }

  const nicknameInput = page.getByLabel("닉네임").or(page.getByPlaceholder("닉네임"));
  await expect(nicknameInput).toBeVisible({ timeout: 20000 });
  await nicknameInput.fill(data.nickname);

  const ageInput = page.getByLabel("나이").or(page.getByPlaceholder("나이"));
  if (await ageInput.isVisible()) {
    await ageInput.fill(data.age);
  }

  const jobInput = page.getByLabel("직무").or(page.getByPlaceholder("직무"));
  if (await jobInput.isVisible()) {
    await jobInput.fill(data.job);
  }

  const completeButton = page.getByRole("button", { name: /완료|입장하기/ });
  if (await completeButton.isVisible()) {
    await completeButton.click();
  }
}

export async function openParticipantsTab(page: Page) {
  await page.getByRole("button", { name: "전체" }).click();
}

export async function sendHeartToParticipant(page: Page, nickname: string) {
  const participantCard = page.locator(".participant-card").filter({
    hasText: nickname
  });
  await expect(participantCard).toBeVisible({
    timeout: 10000
  });
  await participantCard.getByRole("button", { name: "♡" }).click();
}

export async function openParticipantDetail(page: Page, nickname: string) {
  const participantCard = page.locator(".participant-card").filter({
    hasText: nickname
  });
  await expect(participantCard).toBeVisible({
    timeout: 10000
  });
  await participantCard.locator(".participant-head").first().click();
}

export async function submitReport(page: Page, targetNickname: string, reason: string) {
  await page.getByRole("button", { name: customerSelectors.reportTab ?? "내 정보" }).click();

  const targetSelect = page.getByTestId("report-target");
  if (await targetSelect.isVisible()) {
    await targetSelect.selectOption({
      label: targetNickname
    });
  }

  const reasonSelect = page.getByTestId("report-reason");
  if (await reasonSelect.isVisible()) {
    await reasonSelect.selectOption({
      label: reason
    });
  }

  const details = page.getByTestId("report-details");
  await details.fill("테스트 신고 사유 상세 내용입니다.");
  await page.getByTestId("submit-report").click();
}
