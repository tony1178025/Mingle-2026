import { createToast } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { applyCommandResult } from "@/stores/helpers";
import type { AdminSlice, StoreSlice } from "@/stores/types";

export const createAdminSlice: StoreSlice<AdminSlice> = (set, get) => ({
  rotationPreview: null,

  getExpectedVersion() {
    const version = get().snapshot?.version;
    if (typeof version !== "number") {
      throw new Error("세션 버전을 확인할 수 없습니다.");
    }
    return version;
  },

  async executeAdminCommandWithRetry(commandFactory) {
    try {
      return await getMingleRepository().executeCommand(commandFactory(get().getExpectedVersion()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("세션이 갱신되었습니다")) {
        throw error;
      }
      await get().syncFromRepository();
      return getMingleRepository().executeCommand(commandFactory(get().getExpectedVersion()));
    }
  },

  async setSessionState(state) {
    try {
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.setSessionState",
        state,
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", "세션 상태를 변경했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "상태 변경에 실패했습니다.")
      });
    }
  },

  async toggleRevealSenders(value) {
    try {
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.toggleReveal",
        value,
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", value ? "공개를 시작했습니다." : "공개를 중지했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "공개 제어에 실패했습니다.")
      });
    }
  },

  async triggerReveal() {
    try {
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.triggerReveal",
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", "하트를 공개했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "하트 공개에 실패했습니다.")
      });
    }
  },

  async generateRotationPreview() {
    const snapshot = get().snapshot;
    const activeParticipants =
      snapshot?.participants.filter((participant) => {
        const status = snapshot.participantStatusMap?.[participant.id] ?? "ACTIVE";
        return status === "ACTIVE";
      }).length ?? 0;
    if (activeParticipants < 2) {
      set({
        toast: createToast("warning", "ACTIVE 참가자 부족")
      });
      return;
    }
    try {
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.generateRotationPreview",
        expectedVersion
      }));
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
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.applyRotation",
        preview: rotationPreview,
        expectedVersion
      }));
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
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.resolveReport",
        reportId,
        expectedVersion
      }));
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
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.setBlacklistStatus",
        participantId,
        blocked,
        reason,
        expectedVersion
      }));
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

  async moveParticipant(participantId, toTableId) {
    try {
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.moveParticipant",
        participantId,
        toTableId,
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", `테이블 ${toTableId}으로 이동했습니다.`)
      });
      return true;
    } catch (error) {
      set({
        toast: createToast(
          "warning",
          error instanceof Error ? error.message : "참가자 이동에 실패했습니다."
        )
      });
      return false;
    }
  },

  async createManualParticipant(nickname, tableId, gender) {
    try {
      const result = await get().executeAdminCommandWithRetry((expectedVersion) => ({
        type: "admin.createManualParticipant",
        nickname,
        tableId,
        gender,
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", `${nickname} 참가자를 수동 등록했습니다.`)
      });
      return true;
    } catch (error) {
      set({
        toast: createToast(
          "warning",
          error instanceof Error ? error.message : "수동 참가자 등록에 실패했습니다."
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
