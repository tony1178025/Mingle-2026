import { average, clamp } from "@/lib/mingle";
import type {
  ParticipantRecord,
  ParticipantStatus,
  TableState,
  TableSummary,
  TableVibeMetrics
} from "@/types/mingle";

// Table heat scoring windows — independent of presence thresholds.
// 8 min = "recently interacted enough to count as an active signal for table heat".
const ACTIVE_WINDOW_MS = 8 * 60 * 1000;
const IDLE_WINDOW_MS = 15 * 60 * 1000;

export function getEncounterCount(participant: ParticipantRecord, otherParticipantId: string) {
  const encounter = participant.encounterHistory.find(
    (item) => item.participantId === otherParticipantId
  );
  if (encounter) {
    return encounter.count;
  }

  return participant.metParticipantIds.includes(otherParticipantId) ? 1 : 0;
}

export function calculateTableHeat(participants: ParticipantRecord[]) {
  return participants.reduce((sum, participant) => {
    return (
      sum +
      participant.receivedHearts * 1.5 +
      participant.sentHearts * 1.2 +
      participant.profileViews * 0.35 +
      participant.popularityScore * 0.9
    );
  }, 0);
}

export function calculateRepeatMeetings(participants: ParticipantRecord[]) {
  let repeats = 0;

  for (let index = 0; index < participants.length; index += 1) {
    const current = participants[index];
    for (let nextIndex = index + 1; nextIndex < participants.length; nextIndex += 1) {
      const candidate = participants[nextIndex];
      if (getEncounterCount(current, candidate.id) > 0 || getEncounterCount(candidate, current.id) > 0) {
        repeats += 1;
      }
    }
  }

  return repeats;
}

export function isProtectedParticipant(participant: ParticipantRecord) {
  return participant.isVip || participant.isHighValue || (participant.tier === "A" && participant.subTier !== "LOW");
}

export function calculatePopularityLoad(participants: ParticipantRecord[]) {
  return participants.filter((participant) => participant.popularityScore > 5).length;
}

export function calculateTableVibe(
  participants: ParticipantRecord[],
  referenceTime = new Date().toISOString()
): TableVibeMetrics {
  if (!participants.length) {
    return {
      activeUsersRatio: 0,
      totalInteractions: 0,
      normalizedInteractionCount: 0,
      recentHeartSignals: 0,
      normalizedHeartSignals: 0,
      idlePenalty: 1
    };
  }

  const referenceMs = new Date(referenceTime).getTime();
  const activeUsers = participants.filter((participant) => {
    if (!participant.lastActiveAt) return false;
    return referenceMs - new Date(participant.lastActiveAt).getTime() <= ACTIVE_WINDOW_MS;
  }).length;

  const idleUsers = participants.filter((participant) => {
    if (!participant.lastActiveAt) return true;
    return referenceMs - new Date(participant.lastActiveAt).getTime() > IDLE_WINDOW_MS;
  }).length;

  const totalInteractions = participants.reduce((sum, participant) => {
    return sum + participant.sentHearts + participant.receivedHearts + participant.profileViews;
  }, 0);
  const recentHeartSignals = participants.reduce((sum, participant) => {
    return sum + participant.likedParticipantIds.length + participant.likedByParticipantIds.length;
  }, 0);

  return {
    activeUsersRatio: Number((activeUsers / participants.length).toFixed(3)),
    totalInteractions,
    normalizedInteractionCount: Number(clamp(totalInteractions / (participants.length * 8), 0, 1).toFixed(3)),
    recentHeartSignals,
    normalizedHeartSignals: Number(
      clamp(recentHeartSignals / (participants.length * 4), 0, 1).toFixed(3)
    ),
    idlePenalty: Number((idleUsers / participants.length).toFixed(3))
  };
}

export function calculateVibeScore(vibe: TableVibeMetrics) {
  return Number(
    clamp(
      (vibe.activeUsersRatio * 0.5 +
        vibe.normalizedInteractionCount * 0.3 +
        vibe.normalizedHeartSignals * 0.1 -
        vibe.idlePenalty * 0.1) * 10,
      0,
      10
    ).toFixed(2)
  );
}

export function calculateTableQuality(
  participants: ParticipantRecord[],
  referenceTime = new Date().toISOString()
) {
  if (!participants.length) return 0;

  const maleCount = participants.filter((participant) => participant.gender === "M").length;
  const femaleCount = participants.length - maleCount;
  const extrovertCount = participants.filter((participant) => participant.energyType === "E").length;
  const introvertCount = participants.length - extrovertCount;
  const repeatMeetings = calculateRepeatMeetings(participants);
  const averageScore = average(participants.map((participant) => participant.score ?? 0));
  const protectedCount = participants.filter(isProtectedParticipant).length;
  const popularityLoad = calculatePopularityLoad(participants);
  const vibeScore = calculateVibeScore(calculateTableVibe(participants, referenceTime));

  const quality =
    72 +
    averageScore * 0.6 +
    vibeScore * 2.1 -
    Math.abs(maleCount - femaleCount) * 11 -
    Math.abs(extrovertCount - introvertCount) * 2.2 -
    repeatMeetings * 8 -
    protectedCount * 2 -
    popularityLoad * 3.5;

  return Number(clamp(quality, 0, 100).toFixed(1));
}

export function buildTableSummaries(
  participants: ParticipantRecord[],
  tableCount: number,
  tableCapacity = 0,
  referenceTime = new Date().toISOString(),
  participantStatusMap: Record<string, ParticipantStatus> = {}
) {
  const tables: TableSummary[] = [];

  const classifyTableState = (
    statusCounts: { ACTIVE: number; GONE: number },
    occupancy: number
  ): TableState => {
    if (occupancy === 0) {
      return "NORMAL";
    }
    if (statusCounts.GONE >= 2) {
      return "COLLAPSING";
    }
    if (statusCounts.ACTIVE < 4) {
      return "LOW_ACTIVITY";
    }
    return "NORMAL";
  };

  for (let tableId = 1; tableId <= tableCount; tableId += 1) {
    const tableParticipants = participants.filter((participant) => participant.tableId === tableId);
    const maleCount = tableParticipants.filter((participant) => participant.gender === "M").length;
    const femaleCount = tableParticipants.length - maleCount;
    const extrovertCount = tableParticipants.filter((participant) => participant.energyType === "E").length;
    const introvertCount = tableParticipants.length - extrovertCount;
    const vibe = calculateTableVibe(tableParticipants, referenceTime);

    const statusCounts = { ACTIVE: 0, IDLE: 0, GONE: 0, BLOCKED: 0 };
    for (const participant of tableParticipants) {
      const status = participantStatusMap[participant.id] ?? "IDLE";
      statusCounts[status] += 1;
    }

    tables.push({
      tableId,
      participants: tableParticipants,
      capacity: tableCapacity || tableParticipants.length || 0,
      occupancy: tableParticipants.length,
      heat: Number(calculateTableHeat(tableParticipants).toFixed(1)),
      quality: calculateTableQuality(tableParticipants, referenceTime),
      vibeScore: calculateVibeScore(vibe),
      vibe,
      genderBalance: Math.abs(maleCount - femaleCount),
      energyBalance: Math.abs(extrovertCount - introvertCount),
      repeatMeetings: calculateRepeatMeetings(tableParticipants),
      protectedCount: tableParticipants.filter(isProtectedParticipant).length,
      popularityLoad: calculatePopularityLoad(tableParticipants),
      statusCounts,
      tableState: classifyTableState(statusCounts, tableParticipants.length)
    });
  }

  return tables;
}
