import { isSessionExpired } from "@/lib/mingle";
import type { CheckinDraft, ParsedCheckinQr, SessionRecord } from "@/types/mingle";

const SESSION_ID_PATTERN = /^[a-z0-9_-]+$/i;
const CHECKIN_CODE_PATTERN = /^\d{4}$/;

export const CHECKIN_SUCCESS_MESSAGE = "입장 확인 완료";
export const CHECKIN_REENTRY_MESSAGE = "기존 참가자 상태로 복귀했습니다";
export const CHECKIN_BLOCKED_MESSAGE = "입장 확인을 진행할 수 없습니다";
export const CHECKIN_FAILURE_MESSAGE = "입장 확인 중 문제가 발생했습니다";

export function createCheckinCopy() {
  return {
    title: "QR로 입장 확인",
    description:
      "운영자가 제공한 체크인 QR을 스캔하거나 그대로 붙여 넣어 예약/세션 컨텍스트를 확인합니다.",
    placeholder: "mingle://session/session-id?code=1234"
  };
}

export function parseCheckinQrValue(rawValue: string): ParsedCheckinQr | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const sessionId = url.pathname.replace(/^\/+/, "");
    const checkinCode = url.searchParams.get("code") ?? "";
    const queryKeys = [...url.searchParams.keys()];

    if (url.protocol !== "mingle:" || url.hostname !== "session") {
      return null;
    }

    if (url.hash || !SESSION_ID_PATTERN.test(sessionId) || sessionId.includes("/")) {
      return null;
    }

    if (queryKeys.length !== 1 || queryKeys[0] !== "code") {
      return null;
    }

    if (!CHECKIN_CODE_PATTERN.test(checkinCode)) {
      return null;
    }

    return { sessionId, checkinCode };
  } catch {
    return null;
  }
}

export function validateCheckinDraft(draft: CheckinDraft, session: SessionRecord) {
  const value = draft.value.trim();

  if (isSessionExpired(session.startedAt)) {
    return {
      ...draft,
      value,
      flowState: "BLOCKED" as const,
      customerMessage: CHECKIN_BLOCKED_MESSAGE,
      customerSecondaryMessage: "세션 운영 시간이 종료되어 체크인을 진행할 수 없습니다.",
      isSubmitting: false,
      isVerified: false,
      error: "세션 운영 시간이 종료되어 체크인을 진행할 수 없습니다.",
      resolution: null
    };
  }

  return {
    ...draft,
    value,
    flowState: "IDLE" as const,
    customerMessage: null,
    customerSecondaryMessage: null,
    isSubmitting: false,
    isVerified: false,
    error: parseCheckinQrValue(value) ? null : "QR 형식이 올바르지 않습니다. 다시 확인해주세요.",
    resolution: null
  };
}
