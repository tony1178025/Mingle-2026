import {
  buildTableSummaries,
  calculateTableHeat,
  calculateTableQuality,
  calculateTableVibe,
  calculateVibeScore,
  getEncounterCount
} from "@/engine/heat";
import { classifyParticipants } from "@/engine/tiering";
import { average, clamp, createAuditLog, createId } from "@/lib/mingle";
import type {
  AuditLogRecord,
  ParticipantGender,
  ParticipantRecord,
  RotationMoveBreakdown,
  RotationMovePreview,
  RotationPreview,
  RotationTablePreview,
  SessionSnapshot
} from "@/types/mingle";

const ROTATION_WEIGHTS = {
  NEW_PEOPLE: 5,
  INTEREST: 4,
  VIBE: 2,
  SEEN_ONCE: 5,
  POPULAR_CLUSTER: 4,
  EI_BALANCE: 1
} as const;

type CapacityPlanTable = {
  tableId: number;
  capacity: number;
  genderTarget: Record<ParticipantGender, number>;
  participants: ParticipantRecord[];
};

type PlacementEvaluation =
  | {
      valid: true;
      tableId: number;
      score: number;
      reasonTags: string[];
      breakdown: RotationMoveBreakdown;
    }
  | {
      valid: false;
      tableId: number;
      rejectReason: string;
    };

function buildCapacityPlan(participantCount: number, tableCount: number) {
  const base = Math.floor(participantCount / tableCount);
  const remainder = participantCount % tableCount;
  return Array.from({ length: tableCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function buildGenderTargets(participants: ParticipantRecord[], capacityPlan: number[]) {
  const maleCount = participants.filter((participant) => participant.gender === "M").length;
  const targets = capacityPlan.map((capacity, index) => ({
    tableId: index + 1,
    capacity,
    M: Math.floor(capacity / 2)
  }));

  let delta = maleCount - targets.reduce((sum, table) => sum + table.M, 0);
  if (delta > 0) {
    for (const table of [...targets].sort((left, right) => right.capacity - left.capacity || left.tableId - right.tableId)) {
      if (delta <= 0) break;
      if (table.M < table.capacity) {
        table.M += 1;
        delta -= 1;
      }
    }
  } else if (delta < 0) {
    for (const table of [...targets].sort((left, right) => left.M - right.M || right.tableId - left.tableId)) {
      if (delta >= 0) break;
      if (table.M > 0) {
        table.M -= 1;
        delta += 1;
      }
    }
  }

  return targets.map((table) => ({
    tableId: table.tableId,
    capacity: table.capacity,
    genderTarget: {
      M: table.M,
      F: table.capacity - table.M
    }
  }));
}

function buildCandidatePriority(participant: ParticipantRecord) {
  const repeatPressure = participant.encounterHistory.reduce((sum, encounter) => sum + encounter.count, 0);
  return (
    participant.popularityScore * 3 +
    repeatPressure * 2 +
    participant.receivedHearts * 1.5 +
    participant.sentHearts
  );
}

function hasInterestEdge(candidate: ParticipantRecord, other: ParticipantRecord) {
  return (
    candidate.likedParticipantIds.includes(other.id) ||
    other.likedParticipantIds.includes(candidate.id) ||
    candidate.likedByParticipantIds.includes(other.id) ||
    other.likedByParticipantIds.includes(candidate.id)
  );
}

function describeMoveReason(
  newPeople: number,
  interestMatch: number,
  seenOnce: number,
  popularUsers: number,
  vibeScore: number,
  eiImbalance: number
) {
  const tags: string[] = [];

  if (newPeople > 0) tags.push(`new ${newPeople}`);
  if (interestMatch > 0) tags.push(`interest ${interestMatch}`);
  if (vibeScore >= 5) tags.push(`vibe ${vibeScore.toFixed(1)}`);
  if (seenOnce === 0) tags.push("no repeat");
  if (popularUsers === 0) tags.push("spread popular");
  if (eiImbalance <= 1) tags.push("balanced EI");

  return tags;
}

function evaluatePlacement(
  candidate: ParticipantRecord,
  table: CapacityPlanTable,
  referenceTime: string
): PlacementEvaluation {
  if (table.participants.length >= table.capacity) {
    return { valid: false, tableId: table.tableId, rejectReason: "capacity" };
  }

  if (candidate.tableId === table.tableId) {
    return { valid: false, tableId: table.tableId, rejectReason: "same-table" };
  }

  const projected = [...table.participants, { ...candidate, tableId: table.tableId }];
  const projectedMale = projected.filter((participant) => participant.gender === "M").length;
  const projectedFemale = projected.length - projectedMale;
  if (
    projectedMale > table.genderTarget.M ||
    projectedFemale > table.genderTarget.F
  ) {
    return { valid: false, tableId: table.tableId, rejectReason: "gender-balance" };
  }

  let newPeople = 0;
  let seenOnce = 0;
  let interestMatch = 0;

  for (const other of table.participants) {
    const seenCount = Math.max(
      getEncounterCount(candidate, other.id),
      getEncounterCount(other, candidate.id)
    );

    if (seenCount >= 2) {
      return { valid: false, tableId: table.tableId, rejectReason: "repeat-encounter" };
    }

    if (seenCount === 1) {
      seenOnce += 1;
    } else {
      newPeople += 1;
    }

    if (hasInterestEdge(candidate, other)) {
      interestMatch += 1;
    }
  }

  const projectedVibeScore = calculateVibeScore(calculateTableVibe(projected, referenceTime));
  const projectedPopularUsers = projected.filter((participant) => participant.popularityScore > 5).length;
  const extrovertCount = projected.filter((participant) => participant.energyType === "E").length;
  const introvertCount = projected.length - extrovertCount;
  const eiImbalance = Math.abs(extrovertCount - introvertCount);

  const score =
    newPeople * ROTATION_WEIGHTS.NEW_PEOPLE +
    interestMatch * ROTATION_WEIGHTS.INTEREST +
    projectedVibeScore * ROTATION_WEIGHTS.VIBE -
    seenOnce * ROTATION_WEIGHTS.SEEN_ONCE -
    projectedPopularUsers * ROTATION_WEIGHTS.POPULAR_CLUSTER -
    eiImbalance * ROTATION_WEIGHTS.EI_BALANCE;

  const breakdown: RotationMoveBreakdown = {
    newPeople,
    interestMatch,
    vibe: Number(projectedVibeScore.toFixed(2)),
    seenOncePenalty: seenOnce,
    popularClusterPenalty: projectedPopularUsers,
    eiBalancePenalty: eiImbalance,
    finalScore: Number(score.toFixed(2))
  };

  return {
    valid: true,
    tableId: table.tableId,
    score: breakdown.finalScore,
    reasonTags: describeMoveReason(
      newPeople,
      interestMatch,
      seenOnce,
      projectedPopularUsers,
      projectedVibeScore,
      eiImbalance
    ),
    breakdown
  };
}

export function scoreRotationPlacement({
  candidate,
  tableId,
  tableParticipants,
  capacity,
  genderTarget,
  referenceTime = new Date().toISOString()
}: {
  candidate: ParticipantRecord;
  tableId: number;
  tableParticipants: ParticipantRecord[];
  capacity: number;
  genderTarget: Record<ParticipantGender, number>;
  referenceTime?: string;
}) {
  return evaluatePlacement(
    candidate,
    {
      tableId,
      capacity,
      genderTarget,
      participants: tableParticipants
    },
    referenceTime
  );
}

function getValidOptions(
  candidate: ParticipantRecord,
  tables: CapacityPlanTable[],
  referenceTime: string,
  blockedTableId?: number
) {
  return tables
    .filter((table) => table.tableId !== blockedTableId)
    .map((table) => evaluatePlacement(candidate, table, referenceTime))
    .filter((option): option is Extract<PlacementEvaluation, { valid: true }> => option.valid)
    .sort((left, right) => right.score - left.score || left.tableId - right.tableId);
}

function placeParticipant(
  candidate: ParticipantRecord,
  tables: CapacityPlanTable[],
  referenceTime: string,
  trail = new Set<string>(),
  blockedTableId?: number
): boolean {
  const directOptions = getValidOptions(candidate, tables, referenceTime, blockedTableId);
  if (directOptions.length) {
    const targetTable = tables.find((table) => table.tableId === directOptions[0].tableId);
    if (!targetTable) return false;
    targetTable.participants.push(candidate);
    return true;
  }

  const nextTrail = new Set(trail);
  nextTrail.add(candidate.id);

  for (const table of tables) {
    if (table.tableId === candidate.tableId || table.tableId === blockedTableId) {
      continue;
    }

    const sameGenderOccupants = table.participants
      .filter((occupant) => occupant.gender === candidate.gender)
      .sort((left, right) => left.id.localeCompare(right.id, "ko"));

    for (const occupant of sameGenderOccupants) {
      if (nextTrail.has(occupant.id)) {
        continue;
      }

      table.participants = table.participants.filter((participant) => participant.id !== occupant.id);
      const canEnter = evaluatePlacement(candidate, table, referenceTime);

      if (
        canEnter.valid &&
        placeParticipant(occupant, tables, referenceTime, nextTrail, table.tableId)
      ) {
        table.participants.push(candidate);
        return true;
      }

      table.participants.push(occupant);
    }
  }

  return false;
}

function buildPreviewNotes(table: RotationTablePreview) {
  const notes: string[] = [];
  const warnings: string[] = [];

  if (table.afterGenderBalance < table.beforeGenderBalance) {
    notes.push("gender balance improved");
  }
  if (table.afterRepeatMeetings < table.beforeRepeatMeetings) {
    notes.push("repeat risk reduced");
  }
  if (table.afterPopularityLoad < table.beforePopularityLoad) {
    notes.push("popular users spread");
  }
  if (table.afterVibeScore > table.beforeVibeScore) {
    notes.push("table vibe lifted");
  }

  if (table.afterGenderBalance > 1) {
    warnings.push("gender skew risk");
  }
  if (table.afterRepeatMeetings > 0) {
    warnings.push("repeat encounters remain");
  }
  if (table.afterPopularityLoad >= 3) {
    warnings.push("popular clustering risk");
  }

  return {
    notes: notes.length ? notes : ["stable assignment"],
    warnings
  };
}

function buildPreviewAudit(
  sessionId: string,
  rotationRound: number,
  fairnessDelta: number
): AuditLogRecord {
  return createAuditLog(
    "ROTATION_PREVIEWED",
    "admin",
    "ADMIN",
    `Rotation preview ${rotationRound} ready`,
    { fairnessDelta },
    sessionId
  );
}

function mergeEncounterHistory(
  participant: ParticipantRecord,
  peerIds: string[],
  participantsById: Map<string, ParticipantRecord>,
  rotationRound: number
) {
  const encounterMap = new Map(
    participant.encounterHistory.map((item) => [item.participantId, { ...item }])
  );

  for (const peerId of peerIds) {
    const peer = participantsById.get(peerId);
    const current = encounterMap.get(peerId);
    const interactionStrength = hasInterestEdge(participant, peer ?? participant) ? 1 : 0;

    encounterMap.set(peerId, {
      participantId: peerId,
      count: (current?.count ?? 0) + 1,
      lastRoundSeen: rotationRound - 1,
      interactionStrength: (current?.interactionStrength ?? 0) + interactionStrength
    });
  }

  const encounterHistory = [...encounterMap.values()].sort(
    (left, right) => right.count - left.count || left.participantId.localeCompare(right.participantId, "ko")
  );

  return {
    encounterHistory,
    metParticipantIds: encounterHistory.map((item) => item.participantId)
  };
}

export function generateRotationPreview(snapshot: SessionSnapshot): RotationPreview {
  const generatedAt = new Date().toISOString();
  const rotationRound =
    Math.max(0, ...snapshot.seatingAssignments.map((assignment) => assignment.rotationRound)) + 1;
  const classified = classifyParticipants(snapshot.participants);
  const capacityPlan = buildCapacityPlan(classified.length, snapshot.session.tableCount);
  const genderTargets = buildGenderTargets(classified, capacityPlan);
  const currentTables = buildTableSummaries(
    classified,
    snapshot.session.tableCount,
    snapshot.session.tableCapacity,
    generatedAt
  );

  const draftTables: CapacityPlanTable[] = genderTargets.map((table, index) => ({
    tableId: table.tableId,
    capacity: capacityPlan[index],
    genderTarget: table.genderTarget,
    participants: []
  }));

  const sortedPool = [...classified].sort((left, right) => {
    const priorityDelta = buildCandidatePriority(right) - buildCandidatePriority(left);
    if (priorityDelta !== 0) return priorityDelta;
    return left.id.localeCompare(right.id, "ko");
  });

  for (const participant of sortedPool) {
    if (!placeParticipant(participant, draftTables, generatedAt)) {
      throw new Error(`No valid rotation target for ${participant.nickname}.`);
    }
  }

  const afterParticipants = classifyParticipants(
    draftTables.flatMap((table) =>
      table.participants.map((participant) => ({
        ...participant,
        tableId: table.tableId
      }))
    )
  );
  const afterTables = buildTableSummaries(
    afterParticipants,
    snapshot.session.tableCount,
    snapshot.session.tableCapacity,
    generatedAt
  );
  const afterParticipantsByTable = new Map<number, ParticipantRecord[]>();
  const assignmentMap = new Map<string, number>();
  afterParticipants.forEach((participant) => {
    const current = afterParticipantsByTable.get(participant.tableId) ?? [];
    current.push(participant);
    afterParticipantsByTable.set(participant.tableId, current);
    assignmentMap.set(participant.id, participant.tableId);
  });

  const moves: RotationMovePreview[] = classified.map((participant) => {
    const toTableId = assignmentMap.get(participant.id);
    if (!toTableId) {
      throw new Error(`Missing assignment for ${participant.nickname}.`);
    }

    const targetTableParticipants = (afterParticipantsByTable.get(toTableId) ?? []).filter(
      (item) => item.id !== participant.id
    );
    const evaluation = evaluatePlacement(
      participant,
      {
        tableId: toTableId,
        capacity: capacityPlan[toTableId - 1],
        genderTarget: genderTargets.find((table) => table.tableId === toTableId)?.genderTarget ?? { M: 0, F: 0 },
        participants: targetTableParticipants
      },
      generatedAt
    );

    if (!evaluation.valid) {
      throw new Error(`Failed to build move breakdown for ${participant.nickname}.`);
    }

    return {
      participantId: participant.id,
      nickname: participant.nickname,
      fromTableId: participant.tableId,
      toTableId,
      reasonTags: evaluation.reasonTags,
      breakdown: evaluation.breakdown
    };
  });

  const tablePreviews: RotationTablePreview[] = draftTables.map((table) => {
    const before = currentTables.find((candidate) => candidate.tableId === table.tableId);
    const after = afterTables.find((candidate) => candidate.tableId === table.tableId);
    if (!before || !after) {
      throw new Error(`Missing table summary for ${table.tableId}.`);
    }

    const basePreview: RotationTablePreview = {
      tableId: table.tableId,
      beforeParticipants: before.participants,
      afterParticipants: after.participants,
      beforeHeat: Number(before.heat.toFixed(1)),
      afterHeat: Number(after.heat.toFixed(1)),
      beforeQuality: before.quality,
      afterQuality: after.quality,
      beforeVibeScore: before.vibeScore,
      afterVibeScore: after.vibeScore,
      beforeGenderBalance: before.genderBalance,
      afterGenderBalance: after.genderBalance,
      beforeRepeatMeetings: before.repeatMeetings,
      afterRepeatMeetings: after.repeatMeetings,
      beforePopularityLoad: before.popularityLoad,
      afterPopularityLoad: after.popularityLoad,
      beforeEnergyBalance: before.energyBalance,
      afterEnergyBalance: after.energyBalance,
      notes: [],
      warnings: [],
      moves: moves.filter((move) => move.toTableId === table.tableId)
    };

    const noteBundle = buildPreviewNotes(basePreview);
    return {
      ...basePreview,
      notes: noteBundle.notes,
      warnings: noteBundle.warnings
    };
  });

  const overallBeforeQuality = Number(
    average(tablePreviews.map((table) => table.beforeQuality)).toFixed(1)
  );
  const overallAfterQuality = Number(
    average(tablePreviews.map((table) => table.afterQuality)).toFixed(1)
  );
  const overallBeforeHeat = Number(
    average(tablePreviews.map((table) => table.beforeHeat)).toFixed(1)
  );
  const overallAfterHeat = Number(
    average(tablePreviews.map((table) => table.afterHeat)).toFixed(1)
  );
  const fairnessDelta = Number(clamp(overallAfterQuality - overallBeforeQuality, -100, 100).toFixed(1));

  return {
    generatedAt,
    rotationRound,
    tableCapacityPlan: capacityPlan,
    tablePreviews,
    moves,
    overallBeforeQuality,
    overallAfterQuality,
    overallBeforeHeat,
    overallAfterHeat,
    fairnessDelta,
    baseVersion: snapshot.version,
    auditDraft: buildPreviewAudit(snapshot.session.id, rotationRound, fairnessDelta)
  };
}

export function applyRotationPreview(snapshot: SessionSnapshot, preview: RotationPreview): SessionSnapshot {
  const tableByParticipant = new Map(preview.moves.map((move) => [move.participantId, move.toTableId]));
  const currentPeers = new Map<number, string[]>();
  const participantsById = new Map(snapshot.participants.map((participant) => [participant.id, participant]));

  snapshot.participants.forEach((participant) => {
    const peers = currentPeers.get(participant.tableId) ?? [];
    peers.push(participant.id);
    currentPeers.set(participant.tableId, peers);
  });

  const nextParticipants = snapshot.participants.map((participant) => {
    const priorPeers = (currentPeers.get(participant.tableId) ?? []).filter((peer) => peer !== participant.id);
    const encounter = mergeEncounterHistory(
      participant,
      priorPeers,
      participantsById,
      preview.rotationRound
    );

    return {
      ...participant,
      tableId: tableByParticipant.get(participant.id) ?? participant.tableId,
      encounterHistory: encounter.encounterHistory,
      metParticipantIds: encounter.metParticipantIds
    };
  });

  const appliedAt = new Date().toISOString();
  const nextAssignments = nextParticipants.map((participant) => ({
    id: createId("seat"),
    sessionId: snapshot.session.id,
    rotationRound: preview.rotationRound,
    participantId: participant.id,
    tableId: participant.tableId,
    assignedAt: appliedAt,
    assignmentSource: "ROTATION_APPLY" as const
  }));

  const applyAudit = createAuditLog(
    "ROTATION_APPLIED",
    "admin",
    "ADMIN",
    `Rotation ${preview.rotationRound} applied`,
    {
      fairnessDelta: preview.fairnessDelta,
      overallBeforeQuality: preview.overallBeforeQuality,
      overallAfterQuality: preview.overallAfterQuality,
      moveCount: preview.moves.length
    },
    snapshot.session.id
  );

  return {
    ...snapshot,
    participants: classifyParticipants(nextParticipants),
    seatingAssignments: [...nextAssignments, ...snapshot.seatingAssignments],
    auditLogs: [applyAudit, ...snapshot.auditLogs],
    session: {
      ...snapshot.session,
      updatedAt: appliedAt
    }
  };
}
