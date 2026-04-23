import { buildTableSummaries, isProtectedParticipant } from "@/engine/heat";
import { estimateRevisitLikelihood } from "@/engine/revisit";
import type { InterventionRecommendation, SessionSnapshot } from "@/types/mingle";

export function buildInterventionRecommendations(snapshot: SessionSnapshot): InterventionRecommendation[] {
  const recommendations: InterventionRecommendation[] = [];
  const tableSummaries = buildTableSummaries(snapshot.participants, snapshot.session.tableCount);

  for (const table of tableSummaries) {
    if (table.heat <= 10) {
      recommendations.push({
        id: `cold_${table.tableId}`,
        kind: "COLD_TABLE",
        title: `${table.tableId}번 테이블이 식어 있습니다`,
        description: "질문 카드나 짧은 운영 개입으로 첫 리듬을 다시 붙여 주세요.",
        priority: "HIGH",
        targetTableId: table.tableId
      });
    }

    if (table.protectedCount >= 2) {
      recommendations.push({
        id: `vip_${table.tableId}`,
        kind: "VIP_PROTECTION",
        title: `${table.tableId}번 테이블에 보호 대상이 몰려 있습니다`,
        description: "다음 회전에서는 VIP 또는 A티어 분산을 우선 검토해 주세요.",
        priority: "MEDIUM",
        targetTableId: table.tableId
      });
    }
  }

  for (const participant of snapshot.participants) {
    const participantTable = tableSummaries.find((table) => table.tableId === participant.tableId);
    const revisit = estimateRevisitLikelihood(participant, participantTable);
    if (participant.receivedHearts === 0 && participant.sentHearts <= 1) {
      recommendations.push({
        id: `risk_${participant.id}`,
        kind: "DROP_RISK",
        title: `${participant.nickname} 님 이탈 위험`,
        description: `재방문 가능성 ${revisit.score}점(${revisit.bucket}). 다음 회전에서 열기가 있는 테이블과 연결하거나 짧은 운영 케어가 필요합니다.`,
        priority: revisit.bucket === "LOW" ? "HIGH" : "MEDIUM",
        targetParticipantId: participant.id
      });
    }

    if (isProtectedParticipant(participant) && participant.receivedHearts === 0) {
      recommendations.push({
        id: `protect_${participant.id}`,
        kind: "VIP_PROTECTION",
        title: `${participant.nickname} 님 보호 배치 필요`,
        description: "고가치 참가자가 반응 없이 머물고 있어 다음 회전에서 보호 배치를 권장합니다.",
        priority: "HIGH",
        targetParticipantId: participant.id
      });
    }
  }

  const revealReadyCount = snapshot.participants.filter(
    (participant) => participant.receivedHearts > 0
  ).length;

  if (snapshot.session.phase === "ROUND_2" && !snapshot.session.revealSenders && revealReadyCount >= 4) {
    recommendations.push({
      id: "reveal_ready",
      kind: "REVEAL_READY",
      title: "공개 조건을 충족한 인원이 충분합니다",
      description: "운영 판단이 섰다면 보낸 사람 공개를 열 시점입니다.",
      priority: "LOW"
    });
  }

  const averageQuality =
    tableSummaries.reduce((sum, table) => sum + table.quality, 0) /
    Math.max(tableSummaries.length, 1);

  if (averageQuality < 72 || tableSummaries.some((table) => table.repeatMeetings >= 2)) {
    recommendations.push({
      id: "rotation_ready",
      kind: "ROTATION_READY",
      title: "회전 미리보기를 확인할 시점입니다",
      description: "현재 배치의 품질 또는 반복 만남이 누적되어 구조적 재배치가 필요합니다.",
      priority: "HIGH"
    });
  }

  return recommendations.sort((left, right) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[left.priority] - order[right.priority];
  });
}
