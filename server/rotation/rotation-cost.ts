import type { SessionSnapshot } from "@/types/mingle";

export function getRotationRoundLimit(snapshot: SessionSnapshot) {
  return snapshot.session.phase === "ROUND_2" ? 1 : 2;
}

export function canGenerateRotation(snapshot: SessionSnapshot) {
  const maxRound = Math.max(0, ...snapshot.seatingAssignments.map((item) => item.rotationRound));
  return maxRound < getRotationRoundLimit(snapshot);
}
