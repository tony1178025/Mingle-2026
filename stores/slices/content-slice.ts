import { CONTENT_LIBRARY } from "@/features/content/library";
import { createToast } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { applyCommandResult } from "@/stores/helpers";
import type { ContentSlice, StoreSlice } from "@/stores/types";

export const createContentSlice: StoreSlice<ContentSlice> = (set, get) => ({
  contentLibrary: CONTENT_LIBRARY,

  async executeAdminContentCommandWithRetry(commandFactory) {
    const execute = async () => {
      const expectedVersion = get().snapshot?.version;
      if (typeof expectedVersion !== "number") {
        throw new Error("세션 버전을 확인할 수 없습니다.");
      }
      return getMingleRepository().executeCommand(commandFactory(expectedVersion));
    };

    try {
      return await execute();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("세션이 갱신되었습니다")) {
        throw error;
      }
      await get().syncFromRepository();
      return execute();
    }
  },

  async activateContent(templateId, targetTableId = null, message) {
    try {
      const result = await get().executeAdminContentCommandWithRetry((expectedVersion) => ({
        type: "admin.activateContent",
        templateId,
        targetTableId,
        message,
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", "라이브 콘텐츠를 시작했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "콘텐츠 시작에 실패했습니다.")
      });
    }
  },

  async clearContent() {
    try {
      const result = await get().executeAdminContentCommandWithRetry((expectedVersion) => ({
        type: "admin.clearContent",
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("info", "진행 중인 콘텐츠를 종료했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "콘텐츠 종료에 실패했습니다.")
      });
    }
  },

  async publishAnnouncement(message) {
    try {
      const result = await get().executeAdminContentCommandWithRetry((expectedVersion) => ({
        type: "admin.publishAnnouncement",
        message,
        expectedVersion
      }));
      applyCommandResult(set, result, {
        toast: createToast("success", "운영 공지를 발행했습니다.")
      });
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "공지 발행에 실패했습니다.")
      });
    }
  },

  async respondToContent(value, recipientId = null) {
    const snapshot = get().snapshot;
    const participantId = get().currentParticipantId;
    if (!snapshot?.liveContent || !participantId) {
      return false;
    }

    try {
      const result = await getMingleRepository().executeCommand({
        type: "customer.respondContent",
        participantId,
        contentId: snapshot.liveContent.id,
        value,
        recipientId
      });
      applyCommandResult(set, result, {
        toast: createToast("success", "응답을 저장했습니다.")
      });
      return true;
    } catch (error) {
      set({
        toast: createToast("warning", error instanceof Error ? error.message : "응답 저장에 실패했습니다.")
      });
      return false;
    }
  }
});
