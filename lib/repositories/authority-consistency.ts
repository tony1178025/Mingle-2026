import { logAuthorityMismatch } from "@/lib/authority-monitoring";
import { normalizeAuthoritySnapshot } from "@/lib/repositories/snapshot-normalizer";
import {
  buildDbAuthorityProjection,
  type DbAuthorityProjection,
  type DbAuthorityRepository
} from "@/lib/repositories/db-repository";
import type { SessionSnapshot } from "@/types/mingle";

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeProjectionForComparison(projection: DbAuthorityProjection) {
  return {
    session: {
      id: projection.session.id,
      hq_id: projection.session.hq_id,
      branch_id: projection.session.branch_id,
      event_id: projection.session.event_id,
      customer_session_version: projection.session.customer_session_version,
      snapshot_version: projection.session.snapshot_version,
      authority_backend: projection.session.authority_backend
    },
    snapshot_json: normalizeAuthoritySnapshot(projection.session.snapshot_json),
    participants: sortById(
      projection.participants.map((participant) => ({
        id: participant.id,
        session_id: participant.session_id,
        branch_id: participant.branch_id,
        reservation_id: participant.reservation_id,
        reservation_external_id: participant.reservation_external_id,
        phone: participant.phone,
        nickname: participant.nickname,
        table_id: participant.table_id
      }))
    ),
    reservations: sortById(
      projection.reservations.map((reservation) => ({
        id: reservation.id,
        session_id: reservation.session_id,
        branch_id: reservation.branch_id,
        reservation_external_id: reservation.reservation_external_id,
        participant_id: reservation.participant_id,
        phone: reservation.phone,
        status: reservation.status
      }))
    ),
    blacklist: sortById(
      projection.blacklist.map((entry) => ({
        id: entry.id,
        session_id: entry.session_id,
        branch_id: entry.branch_id,
        participant_id: entry.participant_id,
        reason: entry.reason
      }))
    ),
    incidents: sortById(
      projection.incidents.map((entry) => ({
        id: entry.id,
        session_id: entry.session_id,
        branch_id: entry.branch_id,
        reporter_id: entry.reporter_id,
        target_id: entry.target_id,
        type: entry.type,
        message: entry.message,
        timestamp: entry.timestamp
      }))
    )
  };
}

export async function assertAuthorityConsistency(input: {
  fileSnapshot: SessionSnapshot;
  dbRepository: DbAuthorityRepository;
}) {
  const expectedProjection = buildDbAuthorityProjection(input.fileSnapshot);
  const actualSnapshot = await input.dbRepository.getExistingSessionSnapshot({ fresh: true });
  const actualProjection = await input.dbRepository.getProjection(input.fileSnapshot.session.id, {
    fresh: true
  });

  const mismatches: string[] = [];

  if (!actualSnapshot) {
    mismatches.push("db snapshot missing");
  } else {
    const expectedSnapshot = normalizeAuthoritySnapshot(input.fileSnapshot);
    const normalizedActualSnapshot = normalizeAuthoritySnapshot(actualSnapshot);
    if (JSON.stringify(expectedSnapshot) !== JSON.stringify(normalizedActualSnapshot)) {
      mismatches.push("snapshot_json mismatch");
    }
  }

  if (!actualProjection) {
    mismatches.push("db projection missing");
  } else {
    const expectedShape = normalizeProjectionForComparison(expectedProjection);
    const actualShape = normalizeProjectionForComparison(actualProjection);
    if (JSON.stringify(expectedShape) !== JSON.stringify(actualShape)) {
      mismatches.push("projection mismatch");
    }
  }

  if (mismatches.length) {
    logAuthorityMismatch({
      sessionId: input.fileSnapshot.session.id,
      version: input.fileSnapshot.version,
      mismatches
    });
    throw new Error(`Authority consistency check failed: ${mismatches.join(", ")}`);
  }
}
