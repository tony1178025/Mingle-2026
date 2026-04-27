import type { ParticipantRecord } from "@/types/mingle";

export type ParticipantFilter = "OPPOSITE" | "SAME" | "ALL";

export function filterParticipants(
  participants: ParticipantRecord[],
  me: ParticipantRecord,
  filter: ParticipantFilter,
  participantStatusMap: Record<string, string>
) {
  return participants
    .filter((item) => item.id !== me.id)
    .filter((item) => {
      const status = participantStatusMap[item.id] ?? "ACTIVE";
      return status === "ACTIVE" || status === "IDLE";
    })
    .filter((item) => {
      if (filter === "ALL") return true;
      if (filter === "SAME") return item.gender === me.gender;
      return item.gender !== me.gender;
    });
}
