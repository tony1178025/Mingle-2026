import { expect, type Page } from "@playwright/test";

const ROUND1_SENSITIVE_FIELDS = [
  "age",
  "job",
  "jobCategory",
  "phone",
  "birthYear",
  "tableId",
  "heightCm",
  "animalType",
  "energyType",
  "receivedHearts",
  "sentHearts",
  "profileViews",
  "encounterHistory",
  "metParticipantIds",
  "likedParticipantIds",
  "likedByParticipantIds"
] as const;

export function expectNoSensitiveFieldsInRound1(payload: unknown) {
  const participants = extractParticipants(payload);
  for (const participant of participants) {
    for (const key of ROUND1_SENSITIVE_FIELDS) {
      expect(
        participant[key],
        `ROUND_1 payload must not expose sensitive field: ${key}`
      ).toBeUndefined();
    }
  }
}

export function expectNoContactFields(payload: unknown) {
  const participants = extractParticipants(payload);
  for (const participant of participants) {
    expect(participant.phone, "Customer payload must not expose phone").toBeUndefined();
    expect(participant.contact, "Customer payload must not expose contact").toBeUndefined();
    expect(participant.birthYear, "Customer payload must not expose birthYear").toBeUndefined();
  }
}

export function expectRound2HidesTable(payload: unknown) {
  const participants = extractParticipants(payload);
  for (const participant of participants) {
    expect(participant.tableId, "ROUND_2 payload must hide tableId").toBeUndefined();
    expect(participant.tableLabel, "ROUND_2 payload must hide tableLabel").toBeUndefined();
  }
}

export async function expectVisibleText(page: Page, text: string) {
  await expect(page.getByText(text), `Expected visible text: ${text}`).toBeVisible();
}

export async function expectNotVisibleText(page: Page, text: string) {
  await expect(page.getByText(text), `Expected hidden text: ${text}`).toHaveCount(0);
}

function extractParticipants(payload: unknown): Array<Record<string, unknown>> {
  const record = payload as { snapshot?: { participants?: unknown[] }; participants?: unknown[] };
  const raw =
    (Array.isArray(record.snapshot?.participants) && record.snapshot?.participants) ||
    (Array.isArray(record.participants) && record.participants) ||
    [];
  return raw.map((item) => item as Record<string, unknown>);
}
