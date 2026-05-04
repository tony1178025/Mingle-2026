import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { customerSelectors } from "@/tests/e2e/fixtures/selectors";
import type { CustomerOnboardingData } from "@/tests/e2e/fixtures/test-data";
import { testBranch } from "@/tests/e2e/fixtures/test-data";

async function clickOnboardingNext(page: Page) {
  const btn = page.getByRole("button", { name: "다음" });
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
}

async function readEnvelopeJson<T>(response: import("@playwright/test").APIResponse): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Empty response from ${response.url()} (${response.status()})`);
  }
  const parsed = JSON.parse(text) as { ok?: boolean; data?: T; error?: string; code?: string };
  if (typeof parsed === "object" && parsed !== null && "ok" in parsed && parsed.ok === true && "data" in parsed) {
    return parsed.data as T;
  }
  return parsed as T;
}

type OnboardingDebugState = {
  lastSessionContextFlowState: string | null;
  lastProfileStepStatus: number | null;
  lastEnterStatus: number | null;
};

async function logOnboardingState(page: Page, state: OnboardingDebugState, label: string) {
  const heading = (await page.locator("main h3").first().textContent().catch(() => null)) ?? "none";
  const progress = (await page.locator(".onboarding-progress-text").first().textContent().catch(() => null)) ?? "none";
  const nicknameVisible = await page.getByTestId("profile-nickname").isVisible().catch(() => false);
  const bodyText = (await page.locator("main").textContent().catch(() => ""))?.replace(/\s+/g, " ").trim().slice(0, 180);
  console.log(
    `[e2e-onboard] ${label} url=${page.url()} heading=${heading} step=${progress} nicknameVisible=${nicknameVisible} ` +
      `flowState=${state.lastSessionContextFlowState ?? "none"} profileStepStatus=${state.lastProfileStepStatus ?? "none"} ` +
      `enterStatus=${state.lastEnterStatus ?? "none"} body=${bodyText || "none"}`
  );
}

async function ensureOptionSelected(stepRoot: import("@playwright/test").Locator, testId: string) {
  const option = stepRoot.getByTestId(testId);
  for (let i = 0; i < 6; i += 1) {
    if (!(await option.isVisible().catch(() => false))) {
      return false;
    }
    try {
      await option.click({ timeout: 4000 });
      if ((await option.getAttribute("class"))?.includes("active")) {
        return true;
      }
      return true;
    } catch {
      // detached, retry
    }
  }
  return false;
}

function toCanonicalCheckinQr(qrUrl: string) {
  const parsed = new URL(qrUrl, "http://localhost");
  const branchId = parsed.searchParams.get("branchId") ?? "";
  const tableId = parsed.searchParams.get("tableId") ?? "";
  const code = parsed.searchParams.get("code") ?? "";
  return `mingle://table/${branchId}/${tableId}${code ? `?code=${code}` : ""}`;
}

export async function completeCustomerOnboarding(
  page: Page,
  qrUrlOrData: string | CustomerOnboardingData,
  maybeData?: CustomerOnboardingData
) {
  const debugState: OnboardingDebugState = {
    lastSessionContextFlowState: null,
    lastProfileStepStatus: null,
    lastEnterStatus: null
  };
  const onResponse = async (response: import("@playwright/test").Response) => {
    const url = response.url();
    if (url.includes("/api/reservations/session-context")) {
      try {
        const text = await response.text();
          const parsed = JSON.parse(text) as
            | { ok?: boolean; data?: { checkinResolution?: { flowState?: string } } }
            | { checkinResolution?: { flowState?: string } };
          const envelope = parsed as { ok?: boolean; data?: { checkinResolution?: { flowState?: string } } };
          const plain = parsed as { checkinResolution?: { flowState?: string } };
          debugState.lastSessionContextFlowState =
            (typeof parsed === "object" && parsed && "ok" in parsed
              ? envelope.data?.checkinResolution?.flowState
              : plain.checkinResolution?.flowState) ?? null;
      } catch {
        // ignore
      }
    } else if (url.includes("/api/customer/profile/step")) {
      debugState.lastProfileStepStatus = response.status();
    } else if (url.includes("/api/customer/enter")) {
      debugState.lastEnterStatus = response.status();
    }
  };
  page.on("response", onResponse);
  try {
    await logOnboardingState(page, debugState, "start");
    const data =
      typeof qrUrlOrData === "string" ? (maybeData as CustomerOnboardingData | undefined) : qrUrlOrData;
    const qrUrl = typeof qrUrlOrData === "string" ? qrUrlOrData : qrUrlOrData.qrUrl;
    await logOnboardingState(page, debugState, "entry-skip-preflight");
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
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible({
      timeout: 10000
    });

    const onboardingStart = await Promise.race([
      page
        .locator(".onboarding-progress-text")
        .first()
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => "progress"),
      page
        .getByTestId("profile-nickname")
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => "nickname"),
      page
        .locator("main")
        .filter({ hasText: "입장 실패" })
        .first()
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => "failed")
    ]);
    if (onboardingStart === "failed") {
      throw new Error("Onboarding failed early: 입장 실패 visible");
    }

    await expect(page.getByRole("heading", { name: "프로필 설정" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main")).not.toContainText("입장 실패", { timeout: 10000 });
    await logOnboardingState(page, debugState, "after-open");

    if (!data) {
      return;
    }

    await expect(page.locator('main[data-testid="customer-onboarding-ready"]')).toBeVisible({
      timeout: 45000
    });
    await logOnboardingState(page, debugState, "onboarding-ready");

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
    if (await page.getByRole("button", { name: "다음" }).isVisible().catch(() => false)) {
      await clickOnboardingNext(page);
    }

    const nicknameInput = page.getByTestId("profile-nickname");
    await expect(nicknameInput).toBeVisible({ timeout: 20000 });
    await nicknameInput.fill(data.nickname);

    const heightInput = page.getByLabel("키");
    if (await heightInput.isVisible().catch(() => false)) {
      await heightInput.fill(data.heightCm);
    }
    await clickOnboardingNext(page);
    await logOnboardingState(page, debugState, "after-step2");

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
    await clickOnboardingNext(page);
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
      await clickOnboardingNext(page);
    }
    await expect(page.locator(".onboarding-progress-text")).toContainText(/4\/5|5\/5/, { timeout: 15000 });
    await logOnboardingState(page, debugState, "after-step3");

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
    const step4Root = page.locator("main");
    const energyTestId = `profile-energy-${data.energyType.toLowerCase()}`;
    const energySelected = await ensureOptionSelected(step4Root, energyTestId);
    if (!energySelected) {
      throw new Error(`Failed to select energy option: ${energyTestId}`);
    }
    if (await page.getByText("오늘 목표").isVisible().catch(() => false)) {
      const goalButtons = page.locator(".choice-card");
      if ((await goalButtons.count()) > 0) {
        await goalButtons.first().click();
      }
    }
    const progressAfterMood = await page.locator(".onboarding-progress-text").textContent();
    if (
      progressAfterMood?.includes("4/5") &&
      (await page.getByRole("button", { name: "다음" }).isVisible().catch(() => false))
    ) {
      await clickOnboardingNext(page);
    }
    await logOnboardingState(page, debugState, "after-step4");

    await expect(page.locator(".onboarding-progress-text")).toContainText("5/5", { timeout: 15000 });
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
    const completeButton = page.getByRole("button", { name: /완료|입장하기|참여 시작/ });
    await expect(completeButton).toBeVisible({ timeout: 15000 });
    await completeButton.click();
    await logOnboardingState(page, debugState, "after-submit");
  } finally {
    page.off("response", onResponse);
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
