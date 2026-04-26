import { isSessionExpired } from "@/lib/mingle";
import type { CheckinDraft, ParsedCheckinQr, SessionRecord } from "@/types/mingle";

const BRANCH_ID_PATTERN = /^[a-z0-9_-]+$/i;
const CHECKIN_CODE_PATTERN = /^\d{4}$/;

export const CHECKIN_SUCCESS_MESSAGE = "입장 확인 완료";
export const CHECKIN_REENTRY_MESSAGE = "기존 참가자 상태로 복귀했습니다";
export const CHECKIN_BLOCKED_MESSAGE = "입장 확인을 진행할 수 없습니다";
export const CHECKIN_FAILURE_MESSAGE = "입장 확인 중 문제가 발생했습니다";

export function createCheckinCopy() {
  return {
    title: "QR로 입장 확인",
    description:
      "테이블에 부착된 QR을 스캔하거나 그대로 붙여 넣어 예약/세션 컨텍스트를 확인합니다.",
    placeholder: "https://app-domain/customer?branchId=branch-id&tableId=1"
  };
}

// QR contract: mingle://table/<branchId>/<tableId>[?code=<4digit>]
// branchId + tableId identify the physical table (permanent, session-independent).
// Session is resolved at runtime from branchId.
// Web QR for browser/PWA uses /customer?branchId=<branchId>&tableId=<tableId>[&code=...].
export function parseCheckinQrValue(rawValue: string): ParsedCheckinQr | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    let branchId = "";
    let tableIdStr = "";
    if (url.protocol === "mingle:" && url.hostname === "table") {
      if (url.hash) {
        return null;
      }
      const pathParts = url.pathname.replace(/^\/+/, "").split("/");
      if (pathParts.length !== 2) {
        return null;
      }
      [branchId, tableIdStr] = pathParts;
    } else if ((url.protocol === "https:" || url.protocol === "http:") && url.pathname === "/customer") {
      branchId = url.searchParams.get("branchId") ?? "";
      tableIdStr = url.searchParams.get("tableId") ?? "";
    } else {
      return null;
    }
    if (!branchId || !BRANCH_ID_PATTERN.test(branchId)) {
      return null;
    }

    if (!tableIdStr || !/^\d+$/.test(tableIdStr)) {
      return null;
    }

    const tableId = parseInt(tableIdStr, 10);
    if (tableId < 1) {
      return null;
    }

    const rawCheckinCode = url.searchParams.get("code")?.trim() ?? "";
    if (rawCheckinCode && !CHECKIN_CODE_PATTERN.test(rawCheckinCode)) {
      return null;
    }

    return { branchId, tableId, checkinCode: rawCheckinCode };
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
