import { createEmptyCheckinDraft, createEmptyProfileDraft, createToast } from "@/lib/mingle";
import {
  CHECKIN_BLOCKED_MESSAGE,
  CHECKIN_FAILURE_MESSAGE,
  CHECKIN_REENTRY_MESSAGE,
  CHECKIN_SUCCESS_MESSAGE,
  parseCheckinQrValue,
  validateCheckinDraft
} from "@/features/checkin/model";
import { getMingleRepository } from "@/lib/repositories";
import { applyCommandResult } from "@/stores/helpers";
import type { CheckinSlice, MingleStoreState, StoreSlice } from "@/stores/types";

const CHECKIN_RETRY_ATTEMPTS = 2;

/** Serialize verify calls — concurrent triggers must not race `isSubmitting` / network. */
let verifyCheckinTail: Promise<boolean> = Promise.resolve(true);

function readBrowserQrFromSearch(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const branchId = params.get("branchId")?.trim() ?? "";
  const tableId = params.get("tableId")?.trim() ?? "";
  const code = params.get("code")?.trim() ?? "";
  if (!branchId || !tableId) {
    return null;
  }
  const canonical = `mingle://table/${branchId}/${tableId}${code ? `?code=${code}` : ""}`;
  return parseCheckinQrValue(canonical) ? canonical : null;
}

function resetOperationalState() {
  const draft = createEmptyCheckinDraft();
  return {
    flowState: draft.flowState,
    customerMessage: draft.customerMessage,
    customerSecondaryMessage: draft.customerSecondaryMessage,
    isSubmitting: draft.isSubmitting,
    isVerified: draft.isVerified,
    error: draft.error,
    resolution: draft.resolution
  };
}

async function runVerifyCheckin(
  get: () => MingleStoreState,
  set: Parameters<StoreSlice<CheckinSlice>>[0]
): Promise<boolean> {
  const snapshot = get().snapshot;
  if (!snapshot) {
    return false;
  }

  const draftFromStore = get().checkinDraft;
  if (
    draftFromStore.flowState === "SUCCESS" &&
    draftFromStore.resolution &&
    draftFromStore.isVerified
  ) {
    return true;
  }

  const urlQr = readBrowserQrFromSearch();
  const draftForValidation =
    !draftFromStore.value.trim() && urlQr ? { ...draftFromStore, value: urlQr } : draftFromStore;

  const validatedDraft = validateCheckinDraft(draftForValidation, snapshot.session);
  if (validatedDraft.error || validatedDraft.flowState === "BLOCKED") {
    set({
      checkinDraft: validatedDraft,
      toast:
        validatedDraft.flowState === "BLOCKED"
          ? createToast("warning", validatedDraft.customerMessage ?? CHECKIN_BLOCKED_MESSAGE)
          : null
    });
    return false;
  }

  let qrValue = validatedDraft.value.trim();
  let parsedQr = parseCheckinQrValue(qrValue);
  if (!parsedQr) {
    const fromUrl = readBrowserQrFromSearch();
    if (fromUrl) {
      qrValue = fromUrl;
      parsedQr = parseCheckinQrValue(fromUrl);
    }
  }
  if (!parsedQr) {
    set({
      checkinDraft: {
        ...validatedDraft,
        isSubmitting: false,
        isVerified: false,
        error: "QR 형식이 올바르지 않습니다. 다시 확인해주세요."
      }
    });
    return false;
  }

  set({
    checkinDraft: {
      ...validatedDraft,
      value: qrValue,
      flowState: "LOADING",
      isSubmitting: true,
      error: null,
      customerMessage: null,
      customerSecondaryMessage: null
    }
  });

  for (let attempt = 0; attempt < CHECKIN_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const result = await getMingleRepository().getReservationSessionContext({
        branchId: parsedQr.branchId,
        tableId: parsedQr.tableId,
        checkinCode: parsedQr.checkinCode,
        participantId: get().currentParticipantId
      });
      const resolution = result.checkinResolution;

      if (!resolution) {
        throw new Error("체크인 응답을 확인할 수 없습니다.");
      }

      if (resolution.flowState === "RE_ENTRY" && result.participantId) {
        const participantTableId =
          result.snapshot.participants.find((participant) => participant.id === result.participantId)
            ?.tableId ?? 1;
        applyCommandResult(set, result, {
          customerTab: "all",
          selectedTableId: participantTableId,
          checkinDraft: createEmptyCheckinDraft(),
          toast: createToast("info", CHECKIN_REENTRY_MESSAGE)
        });
        return true;
      }

      if (resolution.flowState === "BLOCKED") {
        applyCommandResult(set, result, {
          checkinDraft: {
            ...validatedDraft,
            flowState: "BLOCKED",
            customerMessage: resolution.customerMessage,
            customerSecondaryMessage: resolution.customerSecondaryMessage,
            isSubmitting: false,
            isVerified: false,
            error: resolution.customerMessage ?? CHECKIN_BLOCKED_MESSAGE,
            resolution
          },
          toast: createToast("warning", resolution.customerMessage ?? CHECKIN_BLOCKED_MESSAGE)
        });
        return false;
      }

      applyCommandResult(set, result, {
        checkinDraft: {
          ...validatedDraft,
          flowState: resolution.flowState,
          customerMessage: resolution.customerMessage,
          customerSecondaryMessage: resolution.customerSecondaryMessage,
          isSubmitting: false,
          isVerified: resolution.flowState === "SUCCESS",
          error: null,
          resolution
        },
        toast: createToast(
          "success",
          resolution.flowState === "SUCCESS" ? CHECKIN_SUCCESS_MESSAGE : CHECKIN_REENTRY_MESSAGE
        )
      });
      return true;
    } catch (error) {
      if (attempt < CHECKIN_RETRY_ATTEMPTS - 1) {
        continue;
      }

      set((state) => ({
        checkinDraft: {
          ...state.checkinDraft,
          flowState: "FAILURE",
          customerMessage: CHECKIN_FAILURE_MESSAGE,
          customerSecondaryMessage: "잠시 후 다시 시도해 주세요.",
          isSubmitting: false,
          isVerified: false,
          error: error instanceof Error ? error.message : CHECKIN_FAILURE_MESSAGE
        },
        toast: createToast("warning", error instanceof Error ? error.message : CHECKIN_FAILURE_MESSAGE)
      }));
      return false;
    }
  }

  return false;
}

export const createCheckinSlice: StoreSlice<CheckinSlice> = (set, get) => ({
  checkinDraft: createEmptyCheckinDraft(),
  profileDraft: createEmptyProfileDraft(),

  updateCheckinValue(value) {
    set((state) => {
      const trimmed = value.trim();
      const previous = state.checkinDraft.value.trim();
      if (trimmed === previous) {
        return state;
      }
      return {
        checkinDraft: {
          ...state.checkinDraft,
          value,
          ...resetOperationalState()
        }
      };
    });
  },

  async verifyCheckin() {
    verifyCheckinTail = verifyCheckinTail.catch((): boolean => false).then(() => runVerifyCheckin(get, set));
    return verifyCheckinTail;
  },

  updateProfileDraft(field, value) {
    set((state) => ({
      profileDraft: {
        ...state.profileDraft,
        [field]: value
      }
    }));
  },

  async completeProfile() {
    const { checkinDraft, profileDraft } = get();

    if (checkinDraft.flowState !== "SUCCESS" || !checkinDraft.resolution) {
      set({ toast: createToast("warning", "입장 확인을 먼저 완료해 주세요.") });
      return false;
    }

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.completeProfile",
        resolution: checkinDraft.resolution,
        checkinMode: "qr",
        draft: profileDraft
      });

      applyCommandResult(set, result, {
        customerTab: "all",
        selectedTableId: result.participantId
          ? result.snapshot.participants.find((item) => item.id === result.participantId)?.tableId ?? 1
          : 1,
        checkinDraft: createEmptyCheckinDraft(),
        profileDraft: createEmptyProfileDraft(),
        toast: createToast("success", "이제 참여가 시작됩니다. 자리에서 대화를 시작해주세요.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast(
          "warning",
          error instanceof Error ? error.message : "프로필 저장에 실패했습니다."
        )
      });
      return false;
    }
  }
});
