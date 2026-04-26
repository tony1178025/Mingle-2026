import { classifyParticipants } from "../../engine/tiering/index.ts";
import {
  ADMIN_DEFAULT_CONFIG,
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

  const contactExchanges = snapshot.contactExchanges ?? [];
  return {
    ...snapshot,
    participants: normalizedParticipants,
    blacklist: snapshot.blacklist ?? [],
    incidents: snapshot.incidents ?? [],
    activeContentIds: snapshot.activeContentIds ?? [],
    liveContent: snapshot.liveContent ?? null,
    contentResponses: snapshot.contentResponses ?? [],
    anonymousMessages: snapshot.anonymousMessages ?? [],
    contactExchanges,
    contactExchangeStats: snapshot.contactExchangeStats ?? {
      totalRequests: contactExchanges.length,
      pendingCount: contactExchanges.filter((item) => item.status === "PENDING").length,
      completedCount: contactExchanges.filter((item) => item.status === "COMPLETED").length,
      blockedCount: contactExchanges.filter((item) => item.status === "BLOCKED").length
    },
    reservations: snapshot.reservations ?? [],
    announcements: snapshot.announcements ?? [],
    outboxEvents: snapshot.outboxEvents ?? [],
    rotationInstruction: snapshot.rotationInstruction ?? null,
    participantStatusMap: snapshot.participantStatusMap ?? {},
    session: {
      ...snapshot.session,
      hqId: snapshot.session.hqId || MINGLE_CONSTANTS.hqId,
      branchId: snapshot.session.branchId || MINGLE_CONSTANTS.branchId,
      eventId: snapshot.session.eventId || MINGLE_CONSTANTS.eventId,
      tableCount: snapshot.session.tableCount || MINGLE_CONSTANTS.tableCount,
      tableCapacity: snapshot.session.tableCapacity || MINGLE_CONSTANTS.tableCapacity,
      operationalConfig: {
        initialHearts:
          snapshot.session.operationalConfig?.initialHearts ?? ADMIN_DEFAULT_CONFIG.initialHearts,
        rotationDeadlineMinutes:
          snapshot.session.operationalConfig?.rotationDeadlineMinutes ??
          ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes,
        presenceGoneThresholdMinutes:
          snapshot.session.operationalConfig?.presenceGoneThresholdMinutes ??
          ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes,
        defaultProfileImagePaths: {
          male:
            snapshot.session.operationalConfig?.defaultProfileImagePaths?.male ??
            ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.male,
          female:
            snapshot.session.operationalConfig?.defaultProfileImagePaths?.female ??
            ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.female,
          unknown:
            snapshot.session.operationalConfig?.defaultProfileImagePaths?.unknown ??
            ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.unknown
        }
      },
      customerSessionVersion: snapshot.session.customerSessionVersion ?? 1
    }
  };
}
