import { generateAdvancedRotationPreview, applyAdvancedRotationPreview } from "@/lib/algorithms/rotation-engine";
import type { ParticipantGender, ParticipantRecord, SessionSnapshot } from "@/types/mingle";

export function scoreRotationPlacement({
  candidate,
  tableId,
  tableParticipants,
  capacity,
  genderTarget
}: {
  candidate: ParticipantRecord;
  tableId: number;
  tableParticipants: ParticipantRecord[];
  capacity: number;
  genderTarget: Record<ParticipantGender, number>;
}) {
  const projected = [...tableParticipants, candidate];
  const males = projected.filter((member) => member.gender === "M").length;
  const females = projected.length - males;
  const overCapacity = projected.length > capacity;
  const overGender = males > genderTarget.M || females > genderTarget.F;
  const repeatEncounter = tableParticipants.some((member) => {
    const count =
      candidate.encounterHistory.find((item) => item.participantId === member.id)?.count ?? 0;
    return count >= 2;
  });
  if (repeatEncounter) {
    return {
      valid: false,
      tableId,
      rejectReason: "repeat-encounter" as const,
      score: -999,
      reasonTags: ["재만남 제한"],
      breakdown: {
        newPeople: 0,
        interestMatch: 0,
        vibe: 0,
        seenOncePenalty: 0,
        popularClusterPenalty: 0,
        eiBalancePenalty: 0,
        finalScore: -999
      }
    };
  }
  return {
    valid: !overCapacity && !overGender,
    tableId,
    score:
      overCapacity || overGender
        ? -999
        : 100 -
          tableParticipants.reduce((sum, member) => {
            const encounterCount =
              candidate.encounterHistory.find((item) => item.participantId === member.id)?.count ?? 0;
            const seenPenalty = encounterCount === 1 ? 8 : 0;
            const popularPenalty =
              candidate.popularityScore >= 7 && member.popularityScore >= 7 ? 6 : 0;
            return sum + seenPenalty + popularPenalty;
          }, 0) -
          Math.abs(
            projected.filter((member) => member.energyType === "E").length -
              projected.filter((member) => member.energyType === "I").length
          ),
    reasonTags: overCapacity || overGender ? ["제약 위반"] : ["제약 통과"],
    breakdown: {
      newPeople: tableParticipants.every(
        (member) =>
          (candidate.encounterHistory.find((item) => item.participantId === member.id)?.count ?? 0) === 0
      )
        ? 1
        : 0,
      interestMatch: 0,
      vibe: 0,
      seenOncePenalty: tableParticipants.reduce((sum, member) => {
        const count = candidate.encounterHistory.find((item) => item.participantId === member.id)?.count ?? 0;
        return sum + (count === 1 ? 1 : 0);
      }, 0),
      popularClusterPenalty: tableParticipants.some(
        (member) => candidate.popularityScore >= 7 && member.popularityScore >= 7
      )
        ? 1
        : 0,
      eiBalancePenalty: Math.abs(
        projected.filter((member) => member.energyType === "E").length -
          projected.filter((member) => member.energyType === "I").length
      ),
      finalScore: overCapacity || overGender ? -999 : 1
    }
  };
}

export function generateRotationPreview(snapshot: SessionSnapshot) {
  return generateAdvancedRotationPreview(snapshot);
}

export function applyRotationPreview(snapshot: SessionSnapshot, preview: ReturnType<typeof generateRotationPreview>) {
  return applyAdvancedRotationPreview(snapshot, preview);
}
