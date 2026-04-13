import type { HeartRecord, ParticipantRecord, RevealState, SessionRecord } from "@/types/mingle";

export function canRevealHeartSenders(session: SessionRecord, participant: ParticipantRecord) {
  return (
    session.phase === "ROUND_2" &&
    session.revealSenders === true &&
    participant.usedFreeHearts >= session.freeHeartLimit
  );
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
      status: "입장 후에 받은 하트를 확인할 수 있습니다.",
      receivedCount: 0,
      remainingFreeHearts: session.freeHeartLimit,
      visibleSenders: []
    };
  }

  const inbox = hearts.filter((heart) => heart.recipientId === participant.id);
  const visibleSenders = canRevealHeartSenders(session, participant)
    ? inbox
        .map((heart) => participants.find((candidate) => candidate.id === heart.senderId))
        .filter((candidate): candidate is ParticipantRecord => Boolean(candidate))
    : [];

  if (session.phase !== "ROUND_2") {
    return {
      key: "round1-count-only",
      canReveal: false,
      status: "1부에서는 받은 하트 수만 공개됩니다.",
      receivedCount: inbox.length,
      remainingFreeHearts: Math.max(0, session.freeHeartLimit - participant.usedFreeHearts),
      visibleSenders: []
    };
  }

  if (!session.revealSenders) {
    return {
      key: "round2-waiting-admin",
      canReveal: false,
      status: "운영팀이 공개를 열기 전까지는 보낸 사람을 확인할 수 없습니다.",
      receivedCount: inbox.length,
      remainingFreeHearts: Math.max(0, session.freeHeartLimit - participant.usedFreeHearts),
      visibleSenders: []
    };
  }

  if (participant.usedFreeHearts < session.freeHeartLimit) {
    const remaining = session.freeHeartLimit - participant.usedFreeHearts;
    return {
      key: "round2-waiting-user",
      canReveal: false,
      status: `무료 하트 ${remaining}개를 더 사용하면 보낸 사람이 열립니다.`,
      receivedCount: inbox.length,
      remainingFreeHearts: remaining,
      visibleSenders: []
    };
  }

  return {
    key: "round2-revealed",
    canReveal: true,
    status: inbox.length ? "보낸 사람이 공개되었습니다." : "아직 받은 하트가 없습니다.",
    receivedCount: inbox.length,
    remainingFreeHearts: 0,
    visibleSenders
  };
}
