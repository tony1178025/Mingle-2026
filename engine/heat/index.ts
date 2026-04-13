import { average, clamp } from "@/lib/mingle";
import type { ParticipantRecord, TableSummary } from "@/types/mingle";

export function calculateTableHeat(participants: ParticipantRecord[]) {
  return participants.reduce((sum, participant) => {
    return (
      sum +
      participant.receivedHearts * 1.2 +
      participant.sentHearts * 1.1 +
      participant.profileViews * 0.45
    );
  }, 0);
}

export function calculateRepeatMeetings(participants: ParticipantRecord[]) {
  let repeats = 0;

  for (let index = 0; index < participants.length; index += 1) {
    const current = participants[index];
    for (let nextIndex = index + 1; nextIndex < participants.length; nextIndex += 1) {
      const candidate = participants[nextIndex];
      if (current.metParticipantIds.includes(candidate.id) || candidate.metParticipantIds.includes(current.id)) {
        repeats += 1;
      }
    }
  }

  return repeats;
}

export function isProtectedParticipant(participant: ParticipantRecord) {
  return participant.isVip || participant.isHighValue || (participant.tier === "A" && participant.subTier !== "LOW");
}

export function calculateTableQuality(participants: ParticipantRecord[]) {
  if (!participants.length) return 0;

  const maleCount = participants.filter((participant) => participant.gender === "M").length;
  const femaleCount = participants.length - maleCount;
  const extrovertCount = participants.filter((participant) => participant.energyType === "E").length;
  const introvertCount = participants.length - extrovertCount;
  const repeatMeetings = calculateRepeatMeetings(participants);
  const averageScore = average(participants.map((participant) => participant.score ?? 0));
  const protectedCount = participants.filter(isProtectedParticipant).length;
  const zeroHeartCount = participants.filter((participant) => participant.receivedHearts === 0).length;

  const quality =
    74 +
    averageScore * 0.72 -
    Math.abs(maleCount - femaleCount) * 8 -
    Math.abs(extrovertCount - introvertCount) * 4.6 -
    repeatMeetings * 4.5 -
    protectedCount * 2.2 -
    zeroHeartCount * 1.5;

  return Number(clamp(quality, 0, 100).toFixed(1));
}

export function buildTableSummaries(participants: ParticipantRecord[], tableCount: number) {
  const tables: TableSummary[] = [];

  for (let tableId = 1; tableId <= tableCount; tableId += 1) {
    const tableParticipants = participants.filter((participant) => participant.tableId === tableId);
    const maleCount = tableParticipants.filter((participant) => participant.gender === "M").length;
    const femaleCount = tableParticipants.length - maleCount;
    const extrovertCount = tableParticipants.filter((participant) => participant.energyType === "E").length;
    const introvertCount = tableParticipants.length - extrovertCount;

    tables.push({
      tableId,
      participants: tableParticipants,
      heat: Number(calculateTableHeat(tableParticipants).toFixed(1)),
      quality: calculateTableQuality(tableParticipants),
      genderBalance: Math.abs(maleCount - femaleCount),
      energyBalance: Math.abs(extrovertCount - introvertCount),
      repeatMeetings: calculateRepeatMeetings(tableParticipants),
      protectedCount: tableParticipants.filter(isProtectedParticipant).length
    });
  }

  return tables;
}
