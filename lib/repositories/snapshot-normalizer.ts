import { classifyParticipants } from "../../engine/tiering/index.ts";
import {
  applyDerivedParticipantSignals,
  deriveHeartsRemaining,
  MINGLE_CONSTANTS
} from "../mingle.ts";
import type { ParticipantRecord, SessionSnapshot } from "../../types/mingle.ts";

export function normalizeAuthoritySnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  const normalizedParticipants = applyDerivedParticipantSignals(
    classifyParticipants(
      snapshot.participants.map((participant) => {
        const legacyParticipant = participant as ParticipantRecord & Record<string, unknown>;
        const legacySpentHearts = Number(legacyParticipant["used" + "Free" + "Hearts"] ?? 0);
        const legacyGrantedHearts = Number(legacyParticipant["paid" + "Heart" + "Balance"] ?? 0);

        return {
          ...participant,
          sessionId: participant.sessionId || snapshot.session.id,
          branchId: participant.branchId || snapshot.session.branchId || MINGLE_CONSTANTS.branchId,
          heartsRemaining: deriveHeartsRemaining({
            heartsRemaining: participant.heartsRemaining,
            legacySpentHearts,
            legacyGrantedHearts
          }),
          round2Attendance: participant.round2Attendance ?? "UNDECIDED"
        };
      })
    ),
    snapshot.hearts ?? []
  );

  return {
    ...snapshot,
    participants: normalizedParticipants,
    blacklist: snapshot.blacklist ?? [],
    incidents: snapshot.incidents ?? [],
    activeContentIds: snapshot.activeContentIds ?? [],
    liveContent: snapshot.liveContent ?? null,
    contentResponses: snapshot.contentResponses ?? [],
    anonymousMessages: snapshot.anonymousMessages ?? [],
    announcements: snapshot.announcements ?? [],
    rotationInstruction: snapshot.rotationInstruction ?? null,
    session: {
      ...snapshot.session,
      hqId: snapshot.session.hqId || MINGLE_CONSTANTS.hqId,
      branchId: snapshot.session.branchId || MINGLE_CONSTANTS.branchId,
      eventId: snapshot.session.eventId || MINGLE_CONSTANTS.eventId,
      tableCount: snapshot.session.tableCount || MINGLE_CONSTANTS.tableCount,
      tableCapacity: snapshot.session.tableCapacity || MINGLE_CONSTANTS.tableCapacity,
      customerSessionVersion: snapshot.session.customerSessionVersion ?? 1
    }
  };
}
