import { createToast } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { applyCommandResult } from "@/stores/helpers";
import type { StoreSlice, ViewerSlice } from "@/stores/types";

export const createViewerSlice: StoreSlice<ViewerSlice> = (set, get) => ({
  currentParticipantId: null,

  async sendHeart(recipientId) {
    const participantId = get().currentParticipantId;
    if (!participantId) return false;

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.sendHeart",
        participantId,
        recipientId
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "하트를 보냈습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "하트 전송에 실패했습니다.")
      });
      return false;
    }
  },

  async submitReport(targetId, reason, details) {
    const participantId = get().currentParticipantId;
    if (!participantId) return false;

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.submitReport",
        participantId,
        targetId,
        reason,
        details
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "운영 신고가 접수되었습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "신고 접수에 실패했습니다.")
      });
      return false;
    }
  },

  async updateParticipantProfile(nextProfile) {
    const participantId = get().currentParticipantId;
    if (!participantId) return false;

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.updateProfile",
        participantId,
        profile: nextProfile
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "프로필을 저장했습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "프로필 저장에 실패했습니다.")
      });
      return false;
    }
  },

  async updateRound2Attendance(attendance) {
    const participantId = get().currentParticipantId;
    if (!participantId) return false;

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.setRound2Attendance",
        participantId,
        attendance
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "2차 참석 여부를 저장했습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "참석 여부 저장에 실패했습니다.")
      });
      return false;
    }
  },

  async acknowledgeRotation() {
    const participantId = get().currentParticipantId;
    if (!participantId) return false;

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.ackRotation",
        participantId
      });
      applyCommandResult(set, result, {
        toast: createToast("info", "이동 지시를 확인했습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "이동 확인에 실패했습니다.")
      });
      return false;
    }
  },

  async submitContactExchangeConsent(targetParticipantId, methods, consent = true) {
    const participantId = get().currentParticipantId;
    if (!participantId) return false;

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.submitContactExchangeConsent",
        participantId,
        targetParticipantId,
        consent,
        methods
      });
      applyCommandResult(set, result, {
        toast: createToast("success", consent ? "연락처 교환 요청을 보냈습니다." : "교환 동의를 취소했습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast(
          "warning",
          error instanceof Error ? error.message : "연락처 교환 처리에 실패했습니다."
        )
      });
      return false;
    }
  }
});
