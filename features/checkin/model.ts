import { MINGLE_CONSTANTS, resolveCheckinReservation } from "@/lib/mingle";
import type { CheckinDraft, CheckinMode } from "@/types/mingle";

const QR_PATTERN = /^mingle:\/\/session\/[a-z0-9-]+$/i;
const CODE_PATTERN = /^\d{4}$/;

export function createCheckinCopy(mode: CheckinMode) {
  if (mode === "qr") {
    return {
      title: "QR로 빠르게 입장",
      description: "현장 QR 토큰을 스캔하면 예약 정보와 입장 세션이 바로 연결됩니다.",
      placeholder: "mingle://session/..."
    };
  }

  if (mode === "code") {
    return {
      title: "4자리 코드로 입장",
      description: "테이블 카드나 안내 화면의 4자리 코드만 입력하면 체크인이 완료됩니다.",
      placeholder: MINGLE_CONSTANTS.defaultSessionCode
    };
  }

  return {
    title: "스태프 확인으로 입장",
    description: "QR이나 코드 확인이 어려울 때는 운영 메모 기반으로 안전하게 입장할 수 있습니다.",
    placeholder: "예: 바코드 인식 오류로 수기 확인"
  };
}

export function validateCheckinDraft(draft: CheckinDraft): CheckinDraft {
  const value = draft.value.trim();
  const staffNote = draft.staffNote.trim();

  if (draft.mode === "qr") {
    if (!QR_PATTERN.test(value)) {
      return {
        ...draft,
        isVerified: false,
        error: "현장 QR 형식을 다시 확인해 주세요.",
        resolution: null
      };
    }

    return {
      ...draft,
      value,
      isVerified: true,
      error: null,
      resolution: resolveCheckinReservation(draft.mode, value)
    };
  }

  if (draft.mode === "code") {
    const sanitized = value.replace(/\D/g, "");
    if (!CODE_PATTERN.test(sanitized)) {
      return {
        ...draft,
        value: sanitized,
        isVerified: false,
        error: "4자리 숫자 코드를 입력해 주세요.",
        resolution: null
      };
    }

    if (sanitized !== MINGLE_CONSTANTS.defaultSessionCode) {
      return {
        ...draft,
        value: sanitized,
        isVerified: false,
        error: "입장 코드를 다시 확인해 주세요.",
        resolution: null
      };
    }

    return {
      ...draft,
      value: sanitized,
      isVerified: true,
      error: null,
      resolution: resolveCheckinReservation(draft.mode, sanitized)
    };
  }

  if (staffNote.length < 4) {
    return {
      ...draft,
      isVerified: false,
      error: "스태프 확인 메모를 4자 이상 입력해 주세요.",
      resolution: null
    };
  }

  return {
    ...draft,
    staffNote,
    isVerified: true,
    error: null,
    resolution: resolveCheckinReservation(draft.mode, staffNote)
  };
}
