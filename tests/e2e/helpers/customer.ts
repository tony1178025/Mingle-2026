import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { customerSelectors } from "@/tests/e2e/fixtures/selectors";
import type { CustomerOnboardingData } from "@/tests/e2e/fixtures/test-data";
import { testBranch } from "@/tests/e2e/fixtures/test-data";

function toCanonicalCheckinQr(qrUrl: string) {
  const parsed = new URL(qrUrl, "http://localhost");
  const branchId = parsed.searchParams.get("branchId") ?? "";
  const tableId = parsed.searchParams.get("tableId") ?? "";
  const code = parsed.searchParams.get("code") ?? "";
  return `mingle://table/${branchId}/${tableId}${code ? `?code=${code}` : ""}`;
}

type VerifyTraceEntry = {
  attempt: number;
  status: number;
  flowState: string | null;
  message: string | null;
};

async function probeVerifyCheckin(
  page: Page,
  qrUrl: string,
  maxAttempts = 8
): Promise<{ success: boolean; trace: VerifyTraceEntry[]; lastFlowState: string | null }> {
  const parsed = new URL(qrUrl, "http://localhost");
  const code = parsed.searchParams.get("code") ?? "";
  const tableId = Number(parsed.searchParams.get("tableId") ?? "1");
  const trace: VerifyTraceEntry[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await page.request.post("/api/reservations/session-context", {
      data: {
        branchId: testBranch.id,
        tableId,
        checkinCode: code
      }
    });
    const payload = (await response.json()) as {
      checkinResolution?: { flowState?: string; customerSecondaryMessage?: string | null };
    };
    const flowState = payload.checkinResolution?.flowState ?? null;
    const message = payload.checkinResolution?.customerSecondaryMessage ?? null;
    trace.push({ attempt, status: response.status(), flowState, message });
    if (response.ok() && flowState === "SUCCESS") {
      return { success: true, trace, lastFlowState: flowState };
    }
    await page.waitForTimeout(250);
  }

  return {
    success: false,
    trace,
    lastFlowState: trace.at(-1)?.flowState ?? null
  };
}

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
  const verifyProbe = await probeVerifyCheckin(page, qrUrl);
  verifyProbe.trace.forEach((entry) => {
    console.log(
      `[e2e-checkin-trace] attempt=${entry.attempt} status=${entry.status} flowState=${entry.flowState ?? "none"} message=${entry.message ?? "none"}`
    );
  });
  if (!verifyProbe.success) {
    throw new Error(
      `verifyCheckin preflight failed: ${verifyProbe.lastFlowState ?? "UNKNOWN"}`
    );
  }
  const currentUrl = page.url();
  const shouldNavigate =
    !currentUrl ||
    !currentUrl.includes("/customer") ||
    !currentUrl.includes(`branchId=${encodeURIComponent(testBranch.id)}`);
  if (shouldNavigate) {
    try {
      await page.goto(qrUrl, { waitUntil: "domcontentloaded" });
    } catch (error) {
      // Retry once with a lighter wait strategy to reduce transient ERR_ABORTED flakes in CI.
      await page.goto(qrUrl, { waitUntil: "commit" });
    }
  }
  await expect(page.locator("body")).toBeVisible({
    timeout: 10000
  });
  await page.evaluate((value) => {
    window.localStorage.removeItem("mingle_viewer_state_v1");
    window.localStorage.removeItem("mingle_checkin_draft_v1");
    window.localStorage.setItem(
      "mingle:checkin:v3",
      JSON.stringify({
        value,
        flowState: "IDLE",
        customerMessage: null,
        customerSecondaryMessage: null,
        isSubmitting: false,
        isVerified: false,
        error: null,
        resolution: null
      })
    );
  }, toCanonicalCheckinQr(qrUrl));
  await page.reload();
  await expect(page.getByRole("heading", { name: "프로필 설정" })).toBeVisible({ timeout: 10000 });
  await expect(page.locator("main")).not.toContainText("입장 실패", { timeout: 10000 });

  if (!data) {
    return;
  }

  const fullNameInput = page.getByLabel("이름");
  if (await fullNameInput.isVisible().catch(() => false)) {
    await fullNameInput.fill("E2E 참가자");
  }
  const contactInput = page.getByLabel("연락처");
  if (await contactInput.isVisible().catch(() => false)) {
    await contactInput.fill("01012341234");
  }
  const birthYearInput = page.getByLabel("출생연도");
  if (await birthYearInput.isVisible().catch(() => false)) {
    await birthYearInput.fill("1998");
  }
  const nextButton = page.getByRole("button", { name: "다음" });
  if (await nextButton.isVisible().catch(() => false)) {
    await nextButton.click();
  }

  const nicknameInput = page.getByTestId("profile-nickname");
  await expect(nicknameInput).toBeVisible({ timeout: 20000 });
  await nicknameInput.fill(data.nickname);

  const heightInput = page.getByLabel("키");
  if (await heightInput.isVisible().catch(() => false)) {
    await heightInput.fill(data.heightCm);
  }
  await nextButton.click();

  await expect(page.locator(".onboarding-progress-text")).toContainText("3/5", { timeout: 10000 });
  if (await page.getByText("직업 대분류").isVisible().catch(() => false)) {
    const categorySection = page.locator(".field").filter({
      has: page.getByText("직업 대분류", { exact: true })
    });
    const preferredCategory = categorySection.getByRole("button", { name: "IT/프로덕트" });
    if (await preferredCategory.isVisible().catch(() => false)) {
      await preferredCategory.click();
    } else {
      const jobCategoryButtons = categorySection.locator(".choice-card");
      if ((await jobCategoryButtons.count()) > 0) {
        await jobCategoryButtons.first().click();
      }
    }
  }
  if (await page.getByText("직업 소분류").isVisible().catch(() => false)) {
    const jobSection = page.locator(".field").filter({
      has: page.getByText("직업 소분류", { exact: true })
    });
    const preferredJob = jobSection.getByRole("button", { name: "브랜드 마케터" });
    if (await preferredJob.isVisible().catch(() => false)) {
      await preferredJob.click();
    } else {
      const jobButtons = jobSection.locator(".choice-card");
      if ((await jobButtons.count()) > 0) {
        await jobButtons.first().click();
      }
    }
  }
  await nextButton.click();
  if (
    await page
      .locator(".onboarding-progress-text")
      .filter({ hasText: "3/5" })
      .isVisible()
      .catch(() => false)
  ) {
    const fallbackCategorySection = page.locator(".field").filter({
      has: page.getByText("직업 대분류", { exact: true })
    });
    const fallbackJobSection = page.locator(".field").filter({
      has: page.getByText("직업 소분류", { exact: true })
    });
    const fallbackCategoryChoices = fallbackCategorySection.locator(".choice-card");
    const fallbackJobChoices = fallbackJobSection.locator(".choice-card");
    if ((await fallbackCategoryChoices.count()) > 0) {
      await fallbackCategoryChoices.first().click();
    }
    if ((await fallbackJobChoices.count()) > 0) {
      await fallbackJobChoices.first().click();
    }
    await nextButton.click();
  }
  await expect(page.locator(".onboarding-progress-text")).toContainText("4/5", { timeout: 10000 });

  const appearanceChoices = page
    .locator("div")
    .filter({ has: page.getByText("외모 (최대 3개)", { exact: true }) })
    .locator(".choice-card");
  if ((await appearanceChoices.count()) > 0) {
    await appearanceChoices.first().click();
  }
  const personalityChoices = page
    .locator("div")
    .filter({ has: page.getByText("성향 (최대 3개)", { exact: true }) })
    .locator(".choice-card");
  if ((await personalityChoices.count()) > 0) {
    await personalityChoices.first().click();
  }
  const energyButton = page.getByTestId(`profile-energy-${data.energyType.toLowerCase()}`);
  if (await energyButton.isVisible().catch(() => false)) {
    await energyButton.click();
  }
  if (await page.getByText("오늘 목표").isVisible().catch(() => false)) {
    const goalButtons = page.locator(".choice-card");
    if ((await goalButtons.count()) > 0) {
      await goalButtons.first().click();
    }
  }
  await nextButton.click();

  const idealButtons = page.locator(".choice-card");
  const idealCount = await idealButtons.count();
  for (let index = 0; index < Math.min(3, idealCount); index += 1) {
    await idealButtons.nth(index).click();
  }
  const consentPrivacy = page.getByLabel("개인정보 수집 동의");
  if (await consentPrivacy.isVisible().catch(() => false)) {
    await consentPrivacy.check();
  }
  const consentPortrait = page.getByLabel("사진촬영/초상권 동의");
  if (await consentPortrait.isVisible().catch(() => false)) {
    await consentPortrait.check();
  }
  for (let i = 0; i < 4; i += 1) {
    const nextButton = page.getByRole("button", { name: "다음" });
    if (!(await nextButton.isVisible().catch(() => false))) {
      break;
    }
    await nextButton.click();
    await page.waitForTimeout(250);
  }
  const completeButton = page.getByRole("button", { name: /완료|입장하기|참여 시작/ });
  await expect(completeButton).toBeVisible({ timeout: 10000 });
  await completeButton.click();
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
