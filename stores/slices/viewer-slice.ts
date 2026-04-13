import { createAuditLog, createId, createToast } from "@/lib/mingle";
import { getMingleRepository } from "@/lib/repositories";
import { normalizeSnapshot } from "@/stores/helpers";
import type { PaymentCheckoutState } from "@/types/mingle";
import type { StoreSlice, ViewerSlice } from "@/stores/types";

function createPaymentState(): PaymentCheckoutState {
  const checkoutUrl = process.env.NEXT_PUBLIC_HEART_CHECKOUT_URL;
  if (checkoutUrl) {
    return {
      state: "ready",
      message: "결제창으로 이동해 유료 하트를 충전할 수 있습니다.",
      checkoutUrl
    };
  }

  return {
    state: "unavailable",
    message: "결제 연동 전이라 유료 하트는 실제로 충전되지 않습니다."
  };
}

export const createViewerSlice: StoreSlice<ViewerSlice> = (set, get) => ({
  viewerParticipantId: null,

  async viewParticipantProfile(participantId) {
    const snapshot = get().snapshot;
    const viewerParticipantId = get().viewerParticipantId;
    if (!snapshot || !viewerParticipantId || participantId === viewerParticipantId) return;

    const participant = snapshot.participants.find((candidate) => candidate.id === participantId);
    if (!participant) return;

    const createdAt = new Date().toISOString();
    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      participants: snapshot.participants.map((candidate) =>
        candidate.id === participantId
          ? { ...candidate, profileViews: candidate.profileViews + 1 }
          : candidate
      ),
      auditLogs: [
        createAuditLog(
          "PROFILE_VIEWED",
          viewerParticipantId,
          "CUSTOMER",
          `${participant.nickname} 님 프로필을 열람했습니다.`,
          { participantId },
          snapshot.session.id
        ),
        ...snapshot.auditLogs
      ],
      session: { ...snapshot.session, updatedAt: createdAt }
    });

    await getMingleRepository().saveSessionSnapshot(nextSnapshot);
    set({ snapshot: nextSnapshot });
  },

  async sendHeart(recipientId) {
    const snapshot = get().snapshot;
    const viewerParticipantId = get().viewerParticipantId;
    if (!snapshot || !viewerParticipantId) return false;

    const sender = snapshot.participants.find((participant) => participant.id === viewerParticipantId);
    const recipient = snapshot.participants.find((participant) => participant.id === recipientId);
    if (!sender || !recipient || sender.id === recipient.id) return false;

    const alreadySent = snapshot.hearts.some(
      (heart) =>
        heart.sessionId === snapshot.session.id &&
        heart.senderId === sender.id &&
        heart.recipientId === recipient.id
    );

    if (alreadySent) {
      set({ toast: createToast("info", "같은 참가자에게는 하트를 한 번만 보낼 수 있습니다.") });
      return false;
    }

    const source: "FREE" | "PAID" | null =
      sender.usedFreeHearts < snapshot.session.freeHeartLimit
        ? "FREE"
        : sender.paidHeartBalance > 0
          ? "PAID"
          : null;

    if (!source) {
      set({
        toast: createToast(
          "warning",
          "무료 하트를 모두 사용했어요. 유료 하트 연동이 필요합니다."
        )
      });
      return false;
    }

    const heart = {
      id: createId("heart"),
      sessionId: snapshot.session.id,
      senderId: sender.id,
      recipientId: recipient.id,
      source,
      createdAt: new Date().toISOString()
    };

    const audit = createAuditLog(
      "HEART_SENT",
      sender.id,
      "CUSTOMER",
      `${recipient.nickname} 님에게 ${source === "FREE" ? "무료" : "유료"} 하트를 보냈습니다.`,
      { recipientId: recipient.id, source },
      snapshot.session.id
    );

    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      hearts: [heart, ...snapshot.hearts],
      participants: snapshot.participants.map((participant) => {
        if (participant.id === sender.id) {
          return {
            ...participant,
            sentHearts: participant.sentHearts + 1,
            usedFreeHearts:
              source === "FREE" ? participant.usedFreeHearts + 1 : participant.usedFreeHearts,
            paidHeartBalance:
              source === "PAID"
                ? Math.max(0, participant.paidHeartBalance - 1)
                : participant.paidHeartBalance
          };
        }

        if (participant.id === recipient.id) {
          return {
            ...participant,
            receivedHearts: participant.receivedHearts + 1
          };
        }

        return participant;
      }),
      auditLogs: [audit, ...snapshot.auditLogs],
      session: { ...snapshot.session, updatedAt: audit.createdAt }
    });

    await getMingleRepository().saveSessionSnapshot(nextSnapshot);
    set({
      snapshot: nextSnapshot,
      toast: createToast("success", `${recipient.nickname} 님에게 하트를 보냈습니다.`)
    });

    return true;
  },

  async purchaseHeartBundle() {
    const paymentState = createPaymentState();
    set({
      toast: createToast(paymentState.state === "ready" ? "info" : "warning", paymentState.message)
    });
    return paymentState;
  },

  async submitReport(targetId, reason, details) {
    const snapshot = get().snapshot;
    const viewerParticipantId = get().viewerParticipantId;
    if (!snapshot || !viewerParticipantId || !details.trim()) return false;

    const report = {
      id: createId("report"),
      sessionId: snapshot.session.id,
      reporterId: viewerParticipantId,
      targetId,
      reason,
      details: details.trim(),
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      status: "PENDING" as const
    };

    const audit = createAuditLog(
      "REPORT_SUBMITTED",
      viewerParticipantId,
      "CUSTOMER",
      "운영팀에 신고를 전달했습니다.",
      { targetId, reason },
      snapshot.session.id
    );

    const nextSnapshot = normalizeSnapshot({
      ...snapshot,
      reports: [report, ...snapshot.reports],
      auditLogs: [audit, ...snapshot.auditLogs],
      session: { ...snapshot.session, updatedAt: audit.createdAt }
    });

    await getMingleRepository().saveSessionSnapshot(nextSnapshot);
    set({
      snapshot: nextSnapshot,
      toast: createToast("success", "운영팀에 신고가 전달되었습니다.")
    });

    return true;
  }
});
