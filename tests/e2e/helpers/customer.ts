import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { customerSelectors } from "@/tests/e2e/fixtures/selectors";
import type { CustomerOnboardingData } from "@/tests/e2e/fixtures/test-data";

export async function completeCustomerOnboarding(
  page: Page,
  qrUrlOrData: string | CustomerOnboardingData,
  maybeData?: CustomerOnboardingData
) {
  const data = typeof qrUrlOrData === "string" ? (maybeData as CustomerOnboardingData) : qrUrlOrData;
  const qrUrl = typeof qrUrlOrData === "string" ? qrUrlOrData : data.qrUrl;
  await page.goto(qrUrl);
  await expect(page.locator("body")).toBeVisible({
    timeout: 10000
  });

  const nicknameInput = page.getByPlaceholder(customerSelectors.profileNicknamePlaceholder ?? "닉네임");
  await nicknameInput.waitFor({
    timeout: 10000
  });
  await nicknameInput.fill(data.nickname);

  const ageInput = page.getByPlaceholder(customerSelectors.profileAgePlaceholder ?? "나이");
  if (await ageInput.isVisible()) {
    await ageInput.fill(data.age);
  }

  const jobInput = page.getByPlaceholder(customerSelectors.profileJobPlaceholder ?? "직업");
  if (await jobInput.isVisible()) {
    await jobInput.fill(data.job);
  }

  const completeButton = page.getByRole("button", {
    name: customerSelectors.profileCompleteButton ?? "입장하기"
  });
  if (await completeButton.isVisible()) {
    await completeButton.click();
  }
}

export async function openParticipantsTab(page: Page) {
  await page.getByRole("button", { name: customerSelectors.participantsTab }).click();
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
