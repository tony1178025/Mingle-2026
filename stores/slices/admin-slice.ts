import { createToast } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { applyCommandResult } from "@/stores/helpers";
import type { AdminSlice, StoreSlice } from "@/stores/types";

export const createAdminSlice: StoreSlice<AdminSlice> = (set, get) => ({
  rotationPreview: null,

  async setPhase(phase) {
    try {
      const result = await getMingleRepository().executeCommand({
        type: "admin.setPhase",
        phase
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "세션 단계를 변경했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "단계 변경에 실패했습니다.")
      });
    }
  },

  async toggleRevealSenders(value) {
    try {
      const result = await getMingleRepository().executeCommand({
        type: "admin.toggleReveal",
        value
      });
      applyCommandResult(set, result, {
        toast: createToast("success", value ? "공개를 시작했습니다." : "공개를 중지했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "공개 제어에 실패했습니다.")
      });
    }
  },

  async generateRotationPreview() {
    try {
      const result = await getMingleRepository().executeCommand({
        type: "admin.generateRotationPreview"
      });
      applyCommandResult(set, result, {
        adminPanel: "rotation",
        toast: createToast("info", "테이블 이동 미리보기를 생성했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast(
          "warning",
          error instanceof Error ? error.message : "이동 미리보기 생성에 실패했습니다."
        )
      });
    }
  },

  async applyRotationPreview() {
    const rotationPreview = get().rotationPreview;
    if (!rotationPreview) {
      return;
    }

    try {
      const result = await getMingleRepository().executeCommand({
        type: "admin.applyRotation",
        preview: rotationPreview
      });
      applyCommandResult(set, result, {
        rotationPreview: null,
        toast: createToast("success", "테이블 이동을 적용했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "이동 적용에 실패했습니다.")
      });
    }
  },

  async resolveReport(reportId) {
    try {
      const result = await getMingleRepository().executeCommand({
        type: "admin.resolveReport",
        reportId
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "신고 처리를 완료했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "신고 처리에 실패했습니다.")
      });
    }
  },

  async setBlacklistStatus(participantId, blocked, reason) {
    try {
      const result = await getMingleRepository().executeCommand({
        type: "admin.setBlacklistStatus",
        participantId,
        blocked,
        reason
      });
      applyCommandResult(set, result, {
        toast: createToast(
          "success",
          blocked ? "참가자 차단을 적용했습니다." : "참가자 차단을 해제했습니다."
        )
      });
      return true;
    } catch (error) {
      set({
        toast: createToast(
          "warning",
          error instanceof Error ? error.message : "참가자 차단 상태 변경에 실패했습니다."
        )
      });
      return false;
    }
  },

  async grantHearts(participantId, heartsToAdd) {
    try {
      const result = await getMingleRepository().grantHearts({
        participantId,
        heartsToAdd
      });
      applyCommandResult(set, { snapshot: result.snapshot }, {
        toast: createToast("success", `하트 ${heartsToAdd}개를 지급했습니다.`)
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "하트 지급에 실패했습니다.")
      });
      return false;
    }
  }
});
