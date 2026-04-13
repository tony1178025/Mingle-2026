import {
  buildTableSummaries,
  calculateTableHeat,
  calculateTableQuality,
  isProtectedParticipant
} from "@/engine/heat";
import { classifyParticipants } from "@/engine/tiering";
import { average, clamp, createAuditLog, createId } from "@/lib/mingle";
import type {
  AuditLogRecord,
  ParticipantRecord,
  RotationPreview,
  RotationTablePreview,
  SessionSnapshot
} from "@/types/mingle";

function buildCapacityPlan(participantCount: number, tableCount: number) {
  const base = Math.floor(participantCount / tableCount);
  const remainder = participantCount % tableCount;
  return Array.from({ length: tableCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function tierWeight(participant: ParticipantRecord) {
  const tier = { A: 3, B: 2, C: 1 }[participant.tier];
  const subTier = { HIGH: 3, MID: 2, LOW: 1 }[participant.subTier];
  return tier * 10 + subTier;
}

function scorePlacement(
  table: ParticipantRecord[],
  candidate: ParticipantRecord,
  capacity: number
) {
  if (table.length >= capacity) return Number.NEGATIVE_INFINITY;

  const projected = [...table, candidate];
  const maleCount = projected.filter((participant) => participant.gender === "M").length;
  const femaleCount = projected.length - maleCount;
  const extrovertCount = projected.filter((participant) => participant.energyType === "E").length;
  const introvertCount = projected.length - extrovertCount;
  const protectedCount = table.filter(isProtectedParticipant).length;
  const repeatCount = table.filter(
    (participant) =>
      candidate.metParticipantIds.includes(participant.id) ||
      participant.metParticipantIds.includes(candidate.id)
  ).length;
  const sameOriginalTable = table.filter((participant) => participant.tableId === candidate.tableId).length;
  const sameTierA = table.filter((participant) => participant.tier === "A").length;
  const projectedQuality = calculateTableQuality(projected);
  const projectedHeat = calculateTableHeat(projected);
  const lowEngagementRescue = candidate.receivedHearts === 0 ? projectedHeat : 0;

  let score = 0;
  score += projectedQuality * 1.4;
  score += projectedHeat * 0.35;
  score += lowEngagementRescue * 0.25;
  score -= Math.abs(maleCount - femaleCount) * 7.5;
  score -= Math.abs(extrovertCount - introvertCount) * 5;
  score -= repeatCount * 22;
  score -= sameOriginalTable * 10;

  if (isProtectedParticipant(candidate) && protectedCount > 0) score -= 28;
  if (candidate.tier === "A" && sameTierA > 0) score -= 20;
  if (candidate.tier === "C" && projectedQuality < 70) score -= 6;
  if (candidate.energyType === "E" && table.some((participant) => participant.energyType === "I")) score += 4;
  if (candidate.energyType === "I" && table.some((participant) => participant.energyType === "E")) score += 4;

  return Number(score.toFixed(2));
}

function buildPreviewNotes(
  beforeParticipants: ParticipantRecord[],
  afterParticipants: ParticipantRecord[]
) {
  const notes: string[] = [];
  const warnings: string[] = [];
  const beforeIds = new Set(beforeParticipants.map((participant) => participant.id));
  const noveltyCount = afterParticipants.filter((participant) => !beforeIds.has(participant.id)).length;
  const protectedCount = afterParticipants.filter(isProtectedParticipant).length;

  if (noveltyCount >= 3) {
    notes.push("새로운 만남 비율을 충분히 확보했습니다.");
  } else {
    notes.push("과도한 이동 없이 안정감을 유지했습니다.");
  }

  if (protectedCount <= 1) {
    notes.push("보호 대상을 분산해 과열을 줄였습니다.");
  } else {
    warnings.push("보호 대상이 같은 테이블에 다시 겹쳤습니다.");
  }

  const afterQuality = calculateTableQuality(afterParticipants);
  if (afterQuality < 70) {
    warnings.push("회전 후에도 품질이 낮아 운영 개입이 필요합니다.");
  }

  return { notes, warnings };
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
    `${rotationRound}차 회전 미리보기를 생성했습니다.`,
    { fairnessDelta },
    sessionId
  );
}

export function generateRotationPreview(snapshot: SessionSnapshot): RotationPreview {
  const rotationRound =
    Math.max(0, ...snapshot.seatingAssignments.map((assignment) => assignment.rotationRound)) + 1;
  const classified = classifyParticipants(snapshot.participants);
  const currentTables = buildTableSummaries(classified, snapshot.session.tableCount);
  const capacityPlan = buildCapacityPlan(classified.length, snapshot.session.tableCount);
  const sortedPool = [...classified].sort((left, right) => {
    const protectionDelta = Number(isProtectedParticipant(right)) - Number(isProtectedParticipant(left));
    if (protectionDelta !== 0) return protectionDelta;
    const tierDelta = tierWeight(right) - tierWeight(left);
    if (tierDelta !== 0) return tierDelta;
    if (left.receivedHearts !== right.receivedHearts) return left.receivedHearts - right.receivedHearts;
    return left.id.localeCompare(right.id, "ko");
  });

  const draftTables = Array.from({ length: snapshot.session.tableCount }, (_, index) => ({
    tableId: index + 1,
    participants: [] as ParticipantRecord[]
  }));

  for (const participant of sortedPool) {
    const options = draftTables
      .map((table, index) => ({
        index,
        score: scorePlacement(table.participants, participant, capacityPlan[index])
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index);

    const chosen = options[0];
    draftTables[chosen.index].participants.push({
      ...participant,
      tableId: draftTables[chosen.index].tableId
    });
  }

  const tablePreviews: RotationTablePreview[] = draftTables.map((table) => {
    const before = currentTables.find((candidate) => candidate.tableId === table.tableId)?.participants ?? [];
    const after = table.participants;
    const noteBundle = buildPreviewNotes(before, after);
    return {
      tableId: table.tableId,
      beforeParticipants: before,
      afterParticipants: after,
      beforeHeat: Number(calculateTableHeat(before).toFixed(1)),
      afterHeat: Number(calculateTableHeat(after).toFixed(1)),
      beforeQuality: calculateTableQuality(before),
      afterQuality: calculateTableQuality(after),
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
    generatedAt: new Date().toISOString(),
    rotationRound,
    tableCapacityPlan: capacityPlan,
    tablePreviews,
    overallBeforeQuality,
    overallAfterQuality,
    overallBeforeHeat,
    overallAfterHeat,
    fairnessDelta,
    auditDraft: buildPreviewAudit(snapshot.session.id, rotationRound, fairnessDelta)
  };
}

export function applyRotationPreview(snapshot: SessionSnapshot, preview: RotationPreview): SessionSnapshot {
  const tableByParticipant = new Map<string, number>();
  preview.tablePreviews.forEach((table) => {
    table.afterParticipants.forEach((participant) => {
      tableByParticipant.set(participant.id, table.tableId);
    });
  });

  const currentPeers = new Map<number, string[]>();
  snapshot.participants.forEach((participant) => {
    const peers = currentPeers.get(participant.tableId) ?? [];
    peers.push(participant.id);
    currentPeers.set(participant.tableId, peers);
  });

  const nextParticipants = snapshot.participants.map((participant) => {
    const priorPeers = (currentPeers.get(participant.tableId) ?? []).filter((peer) => peer !== participant.id);
    return {
      ...participant,
      tableId: tableByParticipant.get(participant.id) ?? participant.tableId,
      metParticipantIds: Array.from(new Set([...participant.metParticipantIds, ...priorPeers]))
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
    `${preview.rotationRound}차 회전을 적용했습니다.`,
    {
      fairnessDelta: preview.fairnessDelta,
      overallBeforeQuality: preview.overallBeforeQuality,
      overallAfterQuality: preview.overallAfterQuality
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
