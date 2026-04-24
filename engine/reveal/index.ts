import type { HeartRecord, ParticipantRecord, RevealState, SessionRecord } from "@/types/mingle";

export function canRevealHeartSenders(session: SessionRecord) {
  return session.phase === "ROUND_2" && session.revealSenders === true;
}

export function buildRevealState(
  session: SessionRecord,
  participant: ParticipantRecord | null,
  hearts: HeartRecord[],
  participants: ParticipantRecord[]
): RevealState {
  if (!participant) {
    return {
      key: "round1-count-only",
      canReveal: false,
      status: "참가자 정보를 아직 불러오는 중입니다.",
      receivedCount: 0,
      heartsRemaining: 0,
      visibleSenders: []
    };
  }

  const inbox = hearts.filter((heart) => heart.recipientId === participant.id);
  const senders = inbox
    .map((heart) => participants.find((candidate) => candidate.id === heart.senderId))
    .filter((candidate): candidate is ParticipantRecord => Boolean(candidate));

  if (session.phase !== "ROUND_2") {
    return {
      key: "round1-count-only",
      canReveal: false,
      status: "라운드 1에서는 받은 하트 수만 확인할 수 있습니다.",
      receivedCount: inbox.length,
      heartsRemaining: participant.heartsRemaining,
      visibleSenders: []
    };
  }

  if (!session.revealSenders) {
    return {
      key: "round2-waiting-admin",
      canReveal: false,
      status: "운영자가 공개를 열면 보낸 사람을 확인할 수 있습니다.",
      receivedCount: inbox.length,
      heartsRemaining: participant.heartsRemaining,
      visibleSenders: []
    };
  }

  if (participant.heartsRemaining > 0) {
    return {
      key: "round2-waiting-admin",
      canReveal: false,
      status: "남은 하트를 모두 사용하면 결과를 볼 수 있어요.",
      receivedCount: inbox.length,
      heartsRemaining: participant.heartsRemaining,
      visibleSenders: []
    };
  }

  return {
    key: "round2-revealed",
    canReveal: true,
    status: inbox.length ? "보낸 사람이 공개되었습니다." : "아직 받은 하트가 없습니다.",
    receivedCount: inbox.length,
    heartsRemaining: participant.heartsRemaining,
    visibleSenders: senders
  };
}
