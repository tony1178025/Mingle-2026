import { createId } from "@/lib/mingle";
import {
  buildCustomerSession,
  issueCustomerSession
} from "@/lib/customer-session";
import {
  executeServerCommand,
  getServerSessionSnapshot,
  sanitizeSnapshotForCustomer
} from "@/lib/repositories/server-repository";
import type {
  CheckinResolution,
  CheckinMode,
  CustomerEnterRequest,
  CustomerSessionRecord,
  CustomerProfileStepRequest,
  ProfileDraft,
  SessionCommandResponse
} from "@/types/mingle";
import type { NextResponse } from "next/server";

type OnboardingDraftRecord = {
  id: string;
  sessionId: string;
  tableId: number;
  draft: ProfileDraft;
  gender: "M" | "F";
  updatedAt: number;
};

const DRAFT_TTL_MS = 12 * 60 * 60 * 1000;
const onboardingDraftStore = new Map<string, OnboardingDraftRecord>();

function pruneExpiredDrafts() {
  const now = Date.now();
  for (const [key, value] of onboardingDraftStore.entries()) {
    if (now - value.updatedAt > DRAFT_TTL_MS) {
      onboardingDraftStore.delete(key);
    }
  }
}

export function calculateAgeFromBirthYear(birthYear: number, nowDate = new Date()) {
  return Math.max(20, nowDate.getFullYear() - birthYear + 1);
}

function createDefaultDraft(): ProfileDraft {
  return {
    nickname: "",
    age: "",
    jobCategory: "",
    job: "",
    photoUrl: "",
    heightCm: "",
    animalType: "",
    energyType: "",
    fullName: "",
    contact: "",
    birthYear: "1998",
    onboardingGoal: "",
    idealType1: "",
    idealType2: "",
    idealType3: "",
    consentPrivacy: false,
    consentPortrait: false,
    customJobInput: ""
  };
}

function toPartialDraft(data: Record<string, unknown>): Partial<ProfileDraft> {
  const selectedIdealTypes = Array.isArray(data.selectedIdealTypes)
    ? data.selectedIdealTypes.map((item) => String(item))
    : [];
  return {
    fullName: typeof data.fullName === "string" ? data.fullName : undefined,
    contact: typeof data.contact === "string" ? data.contact : undefined,
    birthYear:
      typeof data.birthYear === "number"
        ? String(data.birthYear)
        : typeof data.birthYear === "string"
          ? data.birthYear
          : undefined,
    nickname: typeof data.nickname === "string" ? data.nickname : undefined,
    age:
      typeof data.birthYear === "number"
        ? String(calculateAgeFromBirthYear(data.birthYear))
        : undefined,
    heightCm: typeof data.heightCm === "number" ? String(data.heightCm) : undefined,
    jobCategory: typeof data.jobCategory === "string" ? data.jobCategory : undefined,
    job: typeof data.job === "string" ? data.job : undefined,
    customJobInput: typeof data.customJob === "string" ? data.customJob : undefined,
    animalType:
      Array.isArray(data.appearanceKeywords) || Array.isArray(data.personalityKeywords)
        ? `외모:${Array.isArray(data.appearanceKeywords) ? data.appearanceKeywords.join(",") : ""}|성향:${Array.isArray(data.personalityKeywords) ? data.personalityKeywords.join(",") : ""}`
        : undefined,
    energyType: data.energyType === "E" || data.energyType === "I" ? data.energyType : undefined,
    onboardingGoal: typeof data.goal === "string" ? data.goal : undefined,
    idealType1: selectedIdealTypes[0] ?? undefined,
    idealType2: selectedIdealTypes[1] ?? undefined,
    idealType3: selectedIdealTypes[2] ?? undefined,
    consentPrivacy: typeof data.consentPrivacy === "boolean" ? data.consentPrivacy : undefined,
    consentPortrait: typeof data.consentPortrait === "boolean" ? data.consentPortrait : undefined,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined
  };
}

export function saveOnboardingStep(input: CustomerProfileStepRequest) {
  pruneExpiredDrafts();
  const draftId = input.draftParticipantId ?? createId("draft");
  const existing = onboardingDraftStore.get(draftId);
  const mergedDraft: ProfileDraft = {
    ...(existing?.draft ?? createDefaultDraft()),
    ...toPartialDraft(input.data)
  };
  onboardingDraftStore.set(draftId, {
    id: draftId,
    sessionId: input.sessionId,
    tableId: input.tableId,
    draft: mergedDraft,
    gender:
      input.data.gender === "M" || input.data.gender === "F"
        ? input.data.gender
        : (existing?.gender ?? "M"),
    updatedAt: Date.now()
  });
  return { draftParticipantId: draftId };
}

function toResolution(
  snapshotSession: Awaited<ReturnType<typeof getServerSessionSnapshot>>["session"],
  record: OnboardingDraftRecord
): CheckinResolution {
  return {
    sessionId: snapshotSession.id,
    branchId: snapshotSession.branchId,
    tableId: record.tableId,
    reservationId: `manual:${record.id}`,
    reservationExternalId: null,
    participantId: null,
    phone: record.draft.contact,
    gender: record.gender,
    reservationLabel: record.draft.fullName || record.draft.nickname || "현장 참가자",
    checkinCode: "",
    flowState: "SUCCESS",
    customerMessage: "입장 확인 완료",
    customerSecondaryMessage: null
  };
}

export async function finalizeOnboardingEnter(input: CustomerEnterRequest): Promise<{
  payload: SessionCommandResponse;
  customerSession: CustomerSessionRecord | null;
}> {
  pruneExpiredDrafts();
  const draftRecord = onboardingDraftStore.get(input.draftParticipantId);
  if (!draftRecord) {
    throw new Error("온보딩 임시 저장 정보를 찾을 수 없습니다.");
  }

  const snapshot = await getServerSessionSnapshot();
  if (snapshot.session.id !== draftRecord.sessionId) {
    throw new Error("세션 정보가 변경되어 다시 입장이 필요합니다.");
  }

  const mergedDraft = {
    ...draftRecord.draft,
    age: calculateAgeFromBirthYear(Number(draftRecord.draft.birthYear ?? "1998")).toString()
  };
  const result = await executeServerCommand({
    type: "customer.completeProfile",
    checkinMode: "qr" satisfies CheckinMode,
    resolution: toResolution(snapshot.session, draftRecord),
    draft: mergedDraft
  });

  const payload: SessionCommandResponse = {
    ...result,
    snapshot: sanitizeSnapshotForCustomer(result.snapshot)
  };

  const customerSession = result.participantId
    ? buildCustomerSession({
        participantId: result.participantId,
        reservationId: `manual:${draftRecord.id}`,
        sessionId: result.snapshot.session.id,
        sessionVersion: result.snapshot.session.customerSessionVersion
      })
    : null;
  onboardingDraftStore.delete(input.draftParticipantId);
  return { payload, customerSession };
}

export function attachOnboardingSessionCookie(
  response: NextResponse,
  customerSession: CustomerSessionRecord | null
) {
  if (!customerSession) {
    return;
  }
  issueCustomerSession(response, customerSession);
}
