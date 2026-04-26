import { classifyParticipants } from "@/engine/tiering";
import { clamp, createAuditLog, createId } from "@/lib/mingle";
import type {
  ParticipantRecord,
  RotationMovePreview,
  RotationPreview,
  RotationTablePreview,
  SessionSnapshot
} from "@/types/mingle";

type ReactionGrade = "S" | "A+" | "A" | "A-" | "B";
type Candidate = ParticipantRecord & { reactionScore: number; reactionGrade: ReactionGrade };
type TablePlan = { tableId: number; members: Candidate[] };

const TARGET_MIN = 6;
const TARGET_MAX = 8;
const HARD_MAX = 10;

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function getReportsInvolved(snapshot: SessionSnapshot, participantId: string) {
  return snapshot.reports.filter(
    (report) => report.reporterId === participantId || report.targetId === participantId
  ).length;
}

function getMutualMatches(snapshot: SessionSnapshot, participantId: string) {
  return snapshot.hearts.filter((heart) => {
    if (heart.senderId !== participantId) return false;
    return snapshot.hearts.some(
      (reverse) => reverse.senderId === heart.recipientId && reverse.recipientId === heart.senderId
    );
  }).length;
}

function getCompletedContactExchanges(snapshot: SessionSnapshot, participantId: string) {
  return (snapshot.contactExchanges ?? []).filter(
    (exchange) =>
      exchange.status === "COMPLETED" &&
      (exchange.participantAId === participantId || exchange.participantBId === participantId)
  ).length;
}

function getReactionGrade(index: number, total: number): ReactionGrade {
  const percentile = total <= 1 ? 0 : index / (total - 1);
  if (percentile <= 0.1) return "S";
  if (percentile <= 0.25) return "A+";
  if (percentile <= 0.5) return "A";
  if (percentile <= 0.75) return "A-";
  return "B";
}

function buildCandidates(snapshot: SessionSnapshot) {
  const blocked = new Set((snapshot.blacklist ?? []).map((entry) => entry.participantId));
  const statusMap = snapshot.participantStatusMap ?? {};
  const candidates = snapshot.participants
    .filter((participant) => !blocked.has(participant.id))
    .filter((participant) => participant.round2Attendance !== "NO")
    .filter((participant) => {
      const status = statusMap[participant.id];
      return !status || status === "ACTIVE";
    })
    .map((participant) => {
      const reactionScore =
        participant.receivedHearts * 3 +
        getMutualMatches(snapshot, participant.id) * 5 +
        getCompletedContactExchanges(snapshot, participant.id) * 8 -
        getReportsInvolved(snapshot, participant.id) * 8;
      return { ...participant, reactionScore, reactionGrade: "B" as ReactionGrade };
    })
    .sort((a, b) => b.reactionScore - a.reactionScore || a.id.localeCompare(b.id, "ko-KR"))
    .map((participant, index, arr) => ({
      ...participant,
      reactionGrade: getReactionGrade(index, arr.length)
    }));

  return classifyParticipants(candidates) as Candidate[];
}

function calcTableScore(snapshot: SessionSnapshot, table: TablePlan) {
  const males = table.members.filter((member) => member.gender === "M").length;
  const females = table.members.filter((member) => member.gender === "F").length;
  const size = table.members.length;
  const gradeCount = table.members.reduce<Record<ReactionGrade, number>>(
    (acc, member) => ({ ...acc, [member.reactionGrade]: acc[member.reactionGrade] + 1 }),
    { S: 0, "A+": 0, A: 0, "A-": 0, B: 0 }
  );
  const samePrevTable = table.members.reduce((count, a, idx) => {
    return (
      count +
      table.members.slice(idx + 1).filter((b) => b.tableId === a.tableId).length
    );
  }, 0);
  const heartCollisions = table.members.reduce((count, a, idx) => {
    return (
      count +
      table.members
        .slice(idx + 1)
        .filter((b) => {
          const aToB = snapshot.hearts.some((heart) => heart.senderId === a.id && heart.recipientId === b.id);
          const bToA = snapshot.hearts.some((heart) => heart.senderId === b.id && heart.recipientId === a.id);
          return aToB || bToA;
        }).length
    );
  }, 0);
  const mutualCollisions = table.members.reduce((count, a, idx) => {
    return (
      count +
      table.members
        .slice(idx + 1)
        .filter((b) => {
          const aToB = snapshot.hearts.some((heart) => heart.senderId === a.id && heart.recipientId === b.id);
          const bToA = snapshot.hearts.some((heart) => heart.senderId === b.id && heart.recipientId === a.id);
          return aToB && bToA;
        }).length
    );
  }, 0);
  const iCount = table.members.filter((member) => member.energyType === "I").length;
  const eCount = size - iCount;
  const jobDiversity = new Set(table.members.map((member) => member.jobCategory)).size;
  const risky = table.members.filter((member) => getReportsInvolved(snapshot, member.id) > 0).length;

  const femaleShortageAllowed = females === 2 && males === 4;
  const imbalancePenalty = males <= females + 1 || femaleShortageAllowed ? 0 : 1;
  const hardMax = Math.max(1, Math.min(HARD_MAX, snapshot.session.tableCapacity || HARD_MAX));
  const tableSizeScore = size >= TARGET_MIN && size <= TARGET_MAX ? 1 : size <= hardMax ? 0.4 : -1;
  const reactionSpreadScore = gradeCount.S > 1 || gradeCount["A+"] > 2 ? -1 : 1;
  const topClusterPenalty = gradeCount.S > 1 ? 1 : 0;
  const personalityMixScore = iCount === 0 || eCount === 0 ? 0 : 1;
  const noveltyScore = samePrevTable === 0 ? 1 : 0.2;
  const riskSeparationPenalty = risky >= 2 ? 1 : 0;

  const score =
    (1 - Math.abs(males - females) / Math.max(1, size)) * 4 +
    tableSizeScore * 3 +
    reactionSpreadScore * 5 +
    personalityMixScore * 2 +
    (jobDiversity / Math.max(1, size)) * 1 +
    noveltyScore * 5 -
    topClusterPenalty * 6 -
    (heartCollisions + mutualCollisions * 2) * 7 -
    samePrevTable * 8 -
    riskSeparationPenalty * 10 -
    imbalancePenalty * 10;

  return {
    score,
    males,
    females,
    gradeCount,
    samePrevTable,
    heartCollisions,
    mutualCollisions,
    iCount,
    eCount,
    jobDiversity,
    risky
  };
}

function isGenderValid(table: TablePlan) {
  const males = table.members.filter((member) => member.gender === "M").length;
  const females = table.members.filter((member) => member.gender === "F").length;
  return males <= females + 1 || (females === 2 && males === 4);
}

function enforceGenderConstraints(plan: TablePlan[], hardMax: number) {
  let changed = true;
  while (changed) {
    changed = false;
    const invalid = plan.find((table) => !isGenderValid(table));
    if (!invalid) break;
    const maleIdx = invalid.members.findIndex((member) => member.gender === "M");
    if (maleIdx < 0) break;
    const male = invalid.members[maleIdx]!;
    const target = plan
      .filter((table) => table.tableId !== invalid.tableId && table.members.length < hardMax)
      .find((table) => {
        const projected = [...table.members, male];
        const pTable: TablePlan = { ...table, members: projected };
        return isGenderValid(pTable);
      });
    if (!target) break;
    invalid.members.splice(maleIdx, 1);
    target.members.push(male);
    changed = true;
  }
}

function totalScore(snapshot: SessionSnapshot, plan: TablePlan[]) {
  return plan.reduce((sum, table) => sum + calcTableScore(snapshot, table).score, 0);
}

export function generateAdvancedRotationPreview(snapshot: SessionSnapshot, seed = 20260426): RotationPreview {
  const rng = seeded(seed);
  const candidates = buildCandidates(snapshot);
  if (candidates.length === 0) {
    throw new Error("ROUND_2 이동 후보가 없습니다. ACTIVE/참석 상태를 확인해 주세요.");
  }

  const hardMax = Math.max(1, Math.min(HARD_MAX, snapshot.session.tableCapacity || HARD_MAX));
  const tableCount = snapshot.session.tableCount;
  const plan: TablePlan[] = Array.from({ length: tableCount }, (_, idx) => ({ tableId: idx + 1, members: [] }));
  const gradeOrder: ReactionGrade[] = ["S", "A+", "A", "A-", "B"];
  const ordered = gradeOrder.flatMap((grade) => candidates.filter((candidate) => candidate.reactionGrade === grade));

  for (const candidate of ordered) {
    const target = [...plan]
      .sort((a, b) => a.members.length - b.members.length || a.tableId - b.tableId)
      .find((table) => table.members.length < hardMax);
    if (!target) break;
    target.members.push(candidate);
  }
  enforceGenderConstraints(plan, hardMax);

  let best = plan.map((table) => ({ ...table, members: [...table.members] }));
  let bestScore = totalScore(snapshot, best);
  for (let iter = 0; iter < 1000; iter += 1) {
    const t1 = Math.floor(rng() * tableCount);
    const t2 = Math.floor(rng() * tableCount);
    if (t1 === t2 || best[t1]!.members.length === 0 || best[t2]!.members.length === 0) continue;
    const i1 = Math.floor(rng() * best[t1]!.members.length);
    const i2 = Math.floor(rng() * best[t2]!.members.length);
    const next = best.map((table) => ({ ...table, members: [...table.members] }));
    const a = next[t1]!.members[i1]!;
    const b = next[t2]!.members[i2]!;
    next[t1]!.members[i1] = b;
    next[t2]!.members[i2] = a;
    if (!isGenderValid(next[t1]!) || !isGenderValid(next[t2]!)) {
      continue;
    }
    const score = totalScore(snapshot, next);
    if (score >= bestScore || rng() < 0.02) {
      best = next;
      bestScore = score;
    }
  }

  const moves: RotationMovePreview[] = [];
  const tablePreviews: RotationTablePreview[] = best.map((table) => {
    const beforeParticipants = candidates.filter((candidate) => candidate.tableId === table.tableId);
    const membersByGrade = table.members.reduce<Record<ReactionGrade, number>>(
      (acc, member) => ({ ...acc, [member.reactionGrade]: acc[member.reactionGrade] + 1 }),
      { S: 0, "A+": 0, A: 0, "A-": 0, B: 0 }
    );
    for (const member of table.members) {
      if (member.tableId !== table.tableId) {
        moves.push({
          participantId: member.id,
          nickname: member.nickname,
          fromTableId: member.tableId,
          toTableId: table.tableId,
          reasonTags: ["운영 반응 등급 분산", "이전 테이블 재중복 완화", "하트 그래프 충돌 완화"],
          breakdown: {
            newPeople: 0,
            interestMatch: 0,
            vibe: 0,
            seenOncePenalty: 0,
            popularClusterPenalty: 0,
            eiBalancePenalty: 0,
            finalScore: Number(bestScore.toFixed(2))
          }
        });
      }
    }
    const score = calcTableScore(snapshot, table);
    return {
      tableId: table.tableId,
      beforeParticipants,
      afterParticipants: table.members,
      beforeHeat: 0,
      afterHeat: 0,
      beforeQuality: 0,
      afterQuality: 0,
      beforeVibeScore: 0,
      afterVibeScore: 0,
      beforeGenderBalance: Math.abs(
        beforeParticipants.filter((item) => item.gender === "M").length -
          beforeParticipants.filter((item) => item.gender === "F").length
      ),
      afterGenderBalance: Math.abs(score.males - score.females),
      beforeRepeatMeetings: 0,
      afterRepeatMeetings: score.samePrevTable,
      beforePopularityLoad: 0,
      afterPopularityLoad: score.gradeCount.S + score.gradeCount["A+"],
      beforeEnergyBalance: 0,
      afterEnergyBalance: Math.abs(score.iCount - score.eCount),
      notes: [
        `인원 ${table.members.length}명`,
        `성비 M${score.males}/F${score.females}`,
        `운영 반응 등급 분포 S:${membersByGrade.S} A+:${membersByGrade["A+"]} A:${membersByGrade.A} A-:${membersByGrade["A-"]} B:${membersByGrade.B}`,
        `이전 테이블 중복 ${score.samePrevTable}`,
        `하트 관계 충돌 ${score.heartCollisions} (상호 ${score.mutualCollisions})`,
        `I/E 분포 ${score.iCount}/${score.eCount}`,
        `직군 다양성 ${score.jobDiversity}`
      ],
      warnings: [
        ...(score.risky >= 2 ? ["리스크 참가자 집중"] : []),
        ...(score.mutualCollisions > 0 ? ["상호 관심 쌍 충돌"] : []),
        ...(table.members.length > TARGET_MAX ? ["권장 인원 초과"] : [])
      ],
      moves: moves.filter((move) => move.toTableId === table.tableId)
    };
  });

  const rotationRound =
    Math.max(0, ...snapshot.seatingAssignments.map((assignment) => assignment.rotationRound)) + 1;
  return {
    generatedAt: new Date().toISOString(),
    rotationRound,
    tableCapacityPlan: best.map((table) => table.members.length),
    tablePreviews,
    moves,
    overallBeforeQuality: 0,
    overallAfterQuality: Number(bestScore.toFixed(2)),
    overallBeforeHeat: 0,
    overallAfterHeat: 0,
    fairnessDelta: Number(bestScore.toFixed(2)),
    baseVersion: snapshot.version,
    auditDraft: createAuditLog(
      "ROTATION_PREVIEWED",
      "admin",
      "ADMIN",
      "ROUND_2 좌석 추천안을 생성했습니다.",
      { algorithm: "advanced-rotation-engine", totalScore: Number(bestScore.toFixed(2)) },
      snapshot.session.id
    )
  };
}

export function applyAdvancedRotationPreview(snapshot: SessionSnapshot, preview: RotationPreview): SessionSnapshot {
  const tableByParticipant = new Map(preview.moves.map((move) => [move.participantId, move.toTableId]));
  const now = new Date().toISOString();

  const participants = snapshot.participants.map((participant) => ({
    ...participant,
    tableId: tableByParticipant.get(participant.id) ?? participant.tableId
  }));

  const assignments = participants.map((participant) => ({
    id: createId("seat"),
    sessionId: snapshot.session.id,
    rotationRound: preview.rotationRound,
    participantId: participant.id,
    tableId: participant.tableId,
    assignedAt: now,
    assignmentSource: "ROTATION_APPLY" as const
  }));

  return {
    ...snapshot,
    participants: classifyParticipants(participants),
    seatingAssignments: [...assignments, ...snapshot.seatingAssignments],
    auditLogs: [
      createAuditLog(
        "ROTATION_APPLIED",
        "admin",
        "ADMIN",
        "ROUND_2 좌석 추천안을 적용했습니다.",
        { totalScore: preview.fairnessDelta, moveCount: preview.moves.length },
        snapshot.session.id
      ),
      ...snapshot.auditLogs
    ],
    session: { ...snapshot.session, updatedAt: now }
  };
}
