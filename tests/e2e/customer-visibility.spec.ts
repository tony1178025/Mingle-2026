import { expect, test } from "@playwright/test";
import { expectNoContactFields, expectNoSensitiveFieldsInRound1, expectRound2HidesTable } from "./helpers/assertions";
import { completeCustomerOnboarding, openParticipantsTab } from "./helpers/customer";
import { getQrUrl } from "./helpers/qr";

test.describe("customer visibility by phase", () => {
  test("verifies ROUND_1 visibility in DOM and intercepted API payload", async ({ page }) => {
    let sessionPayload: unknown = null;
    await page.route("**/api/customer/session-state**", async (route) => {
      const response = await route.fetch();
      const json = (await response.json()) as unknown;
      sessionPayload = json;
      await route.fulfill({ response });
    });

    await page.goto(getQrUrl("validRound1"));
    await completeCustomerOnboarding(page, {
      qrUrl: getQrUrl("validRound1"),
      nickname: "가시성R1",
      age: "29",
      jobCategory: "IT",
      job: "엔지니어",
      heightCm: "175",
      animalType: "cat",
      energyType: "E"
    });
    await openParticipantsTab(page);

    await expect(page.locator("body")).toContainText("테이블");
    await expect(page.locator("body")).not.toContainText("전화번호");
    await expect(page.locator("body")).not.toContainText("birthYear");

    const participants = ((sessionPayload as { snapshot?: { participants?: unknown[] } })?.snapshot?.participants ??
      []) as unknown[];
    expect(participants.length, "ROUND_1 participants payload should not be empty").toBeGreaterThan(0);
    expectNoSensitiveFieldsInRound1(participants[0]);
    expectNoContactFields(participants[0]);
  });

  test("verifies ROUND_2 visibility rules via API payload", async ({ page }) => {
    let commandPayload: unknown = null;
    await page.route("**/api/session/command", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { type?: string } | null;
        if (body?.type === "admin.setSessionState") {
          const response = await route.fetch();
          commandPayload = await response.json();
          await route.fulfill({ response });
          return;
        }
      }
      await route.continue();
    });

    await page.goto("/admin");
    await page.getByRole("button", { name: "2라운드 시작" }).click();
    page.once("dialog", (dialog) => dialog.accept());

    const participants = ((commandPayload as { snapshot?: { participants?: unknown[] } })?.snapshot?.participants ??
      []) as unknown[];
    if (participants.length > 0) {
      expectRound2HidesTable(participants[0]);
      expectNoContactFields(participants[0]);
    }
  });
});
