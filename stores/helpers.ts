import { classifyParticipants } from "@/engine/tiering";
import {
  ADMIN_DEFAULT_CONFIG,
  findParticipant,
  MINGLE_CONSTANTS,
  setCachedParticipantId
} from "@/lib/mingle";
import type { SessionCommandResponse, SessionSnapshot, SessionView } from "@/types/mingle";

export function normalizeSnapshot(snapshot: SessionView): SessionSnapshot {
  const contactExchanges = snapshot.contactExchanges ?? [];
  const normalizedParticipants = snapshot.participants.map((participant) => {
    const base = {
      ...participant,
      reservationId: null,
      reservationExternalId: null,
      phone: null,
      popularityScore: 0,
      tier: "C",
      subTier: "LOW",
      score: 0,
      attractionScore: 0,
      engagementScore: 0,
      isVip: false,
      isHighValue: false,
      checkinMode: "qr",
      participantSessionState: "ACTIVE" as const,
      presenceState: "CHECKED_IN" as const
    };
    if (snapshot.session.phase === "ROUND_1") {
      return base;
    }
    return {
      ...base,
      age: participant.age ?? 0,
      jobCategory: participant.jobCategory ?? "",
      job: participant.job ?? ""
    };
  });
  const participants =
    snapshot.session.phase === "ROUND_1"
      ? (normalizedParticipants as SessionSnapshot["participants"])
      : classifyParticipants(normalizedParticipants as SessionSnapshot["participants"]);
  return {
    ...snapshot,
    participants,
    activeContentIds: snapshot.activeContentIds ?? [],
    liveContent: snapshot.liveContent ?? null,
    contentResponses: snapshot.contentResponses ?? [],
    anonymousMessages: snapshot.anonymousMessages ?? [],
    tableImpressionPicks: snapshot.tableImpressionPicks ?? [],
    tablePickWindows: snapshot.tablePickWindows ?? [],
    tableQrCodes: snapshot.tableQrCodes ?? [],
    contactExchanges,
    contactExchangeStats: snapshot.contactExchangeStats ?? {
      totalRequests: contactExchanges.length,
      pendingCount: contactExchanges.filter((item) => item.status === "PENDING").length,
      completedCount: contactExchanges.filter((item) => item.status === "COMPLETED").length,
      blockedCount: contactExchanges.filter((item) => item.status === "BLOCKED").length
    },
    announcements: snapshot.announcements ?? [],
    outboxEvents: "outboxEvents" in snapshot ? snapshot.outboxEvents ?? [] : [],
    rotationInstruction: snapshot.rotationInstruction ?? null,
    participantStatusMap: snapshot.participantStatusMap ?? {},
    reports: "reports" in snapshot ? snapshot.reports : [],
    blacklist: "blacklist" in snapshot ? snapshot.blacklist ?? [] : [],
    incidents: "incidents" in snapshot ? snapshot.incidents ?? [] : [],
    auditLogs: "auditLogs" in snapshot ? snapshot.auditLogs : [],
    seatingAssignments: "seatingAssignments" in snapshot ? snapshot.seatingAssignments : [],
    session: {
      ...snapshot.session,
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
      }
    }
  };
}

export function applyCommandResult(
  set: (partial: Record<string, unknown> | ((state: { snapshot?: SessionSnapshot | null }) => Record<string, unknown>)) => void,
  result: SessionCommandResponse,
  extra: Record<string, unknown> = {}
) {
  const snapshot = normalizeSnapshot(result.snapshot);
  set((state) => {
    const currentVersion = state.snapshot?.version ?? -1;
    if (snapshot.version < currentVersion) {
      // Still apply client-only fields (e.g. checkinDraft) even when the snapshot is stale —
      // otherwise verifyCheckin can succeed on the server but never update local draft state.
      return Object.keys(extra).length > 0 ? extra : {};
    }

    const nextState: Record<string, unknown> = {
      snapshot,
      ...extra
    };

    if (result.rotationPreview !== undefined) {
      nextState.rotationPreview = result.rotationPreview;
    }

    if (result.participantId !== undefined) {
      if (result.participantId === null) {
        setCachedParticipantId(null);
        nextState.currentParticipantId = null;
      } else if (findParticipant(snapshot.participants, result.participantId)) {
        setCachedParticipantId(result.participantId);
        nextState.currentParticipantId = result.participantId;
      }
    }

    return nextState;
  });
}

export function resolveRuntimeParticipantState(
  snapshot: SessionSnapshot,
  candidateParticipantId: string | null | undefined
) {
  const participant = findParticipant(snapshot.participants, candidateParticipantId);
  return {
    currentParticipantId: participant?.id ?? null,
    selectedTableId: participant?.tableId ?? 1,
    isValid: Boolean(participant) || !candidateParticipantId
  };
}

export function getInitialViewerState(
  snapshot: SessionSnapshot,
  serverParticipantId: string | null
) {
  const resolved = resolveRuntimeParticipantState(snapshot, serverParticipantId);
  if (!resolved.isValid || !resolved.currentParticipantId) {
    setCachedParticipantId(null);
  } else {
    setCachedParticipantId(resolved.currentParticipantId);
  }

  return {
    currentParticipantId: resolved.currentParticipantId,
    selectedTableId: resolved.selectedTableId
  };
}

export function syncCachedParticipantState(
  snapshot: SessionSnapshot,
  serverParticipantId: string | null
) {
  const resolved = resolveRuntimeParticipantState(snapshot, serverParticipantId);
  if (!resolved.isValid || !resolved.currentParticipantId) {
    setCachedParticipantId(null);
  } else {
    setCachedParticipantId(resolved.currentParticipantId);
  }

  return resolved;
}
