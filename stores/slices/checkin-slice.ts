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
import type { CheckinSlice, StoreSlice } from "@/stores/types";

const CHECKIN_RETRY_ATTEMPTS = 2;

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

export const createCheckinSlice: StoreSlice<CheckinSlice> = (set, get) => ({
  checkinDraft: createEmptyCheckinDraft(),
  profileDraft: createEmptyProfileDraft(),

  updateCheckinValue(value) {
    set((state) => ({
      checkinDraft: {
        ...state.checkinDraft,
        value,
        ...resetOperationalState()
      }
    }));
  },

  async verifyCheckin() {
    const snapshot = get().snapshot;
    if (!snapshot || get().checkinDraft.isSubmitting) {
      return false;
    }

    const validatedDraft = validateCheckinDraft(get().checkinDraft, snapshot.session);
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

    const parsedQr = parseCheckinQrValue(validatedDraft.value);
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
            customerTab: "table",
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
          toast: createToast(
            "warning",
            error instanceof Error ? error.message : CHECKIN_FAILURE_MESSAGE
          )
        }));
        return false;
      }
    }

    return false;
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
        customerTab: "table",
        selectedTableId: result.participantId
          ? result.snapshot.participants.find((item) => item.id === result.participantId)?.tableId ?? 1
          : 1,
        checkinDraft: createEmptyCheckinDraft(),
        profileDraft: createEmptyProfileDraft(),
        toast: createToast("success", "입장이 완료되었습니다.")
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
