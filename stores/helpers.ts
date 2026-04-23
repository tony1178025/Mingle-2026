import { classifyParticipants } from "@/engine/tiering";
import {
  findParticipant,
  MINGLE_CONSTANTS,
  setCachedParticipantId
} from "@/lib/mingle";
import type { CommandResult, SessionSnapshot } from "@/types/mingle";

export function normalizeSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    participants: classifyParticipants(
      snapshot.participants.map((participant) => ({
        ...participant,
        round2Attendance: participant.round2Attendance ?? "UNDECIDED"
      }))
    ),
    activeContentIds: snapshot.activeContentIds ?? [],
    liveContent: snapshot.liveContent ?? null,
    contentResponses: snapshot.contentResponses ?? [],
    anonymousMessages: snapshot.anonymousMessages ?? [],
    announcements: snapshot.announcements ?? [],
    rotationInstruction: snapshot.rotationInstruction ?? null,
    session: {
      ...snapshot.session,
      tableCount: snapshot.session.tableCount || MINGLE_CONSTANTS.tableCount,
      tableCapacity: snapshot.session.tableCapacity || MINGLE_CONSTANTS.tableCapacity
    }
  };
}

export function applyCommandResult(
  set: (partial: Record<string, unknown>) => void,
  result: CommandResult,
  extra: Record<string, unknown> = {}
) {
  const snapshot = normalizeSnapshot(result.snapshot);
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

  set(nextState);
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
