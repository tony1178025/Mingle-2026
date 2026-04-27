import type { ParticipantRecord } from "@/types/mingle";

export function getParticipantSessionState(participant: ParticipantRecord) {
  return participant.participantSessionState ?? "ACTIVE";
}

export function getPresenceState(participant: ParticipantRecord) {
  return participant.presenceState ?? "CHECKED_IN";
}

export function isEligibleForInteraction(participant: ParticipantRecord) {
  const sessionState = getParticipantSessionState(participant);
  if (sessionState !== "ACTIVE") return false;
  const presence = getPresenceState(participant);
  return presence === "CHECKED_IN" || presence === "RE_ENTERED" || presence === "TEMP_AWAY";
}
