import { applyRotationPreview, generateRotationPreview } from "@/engine/rotation";
import {
  CHECKIN_BLOCKED_MESSAGE,
  CHECKIN_REENTRY_MESSAGE,
  CHECKIN_SUCCESS_MESSAGE,
  parseCheckinQrValue
} from "@/features/checkin/model";
import { getContentTemplate, isTemplateAllowedInPhase } from "@/features/content/library";
import { isEligibleForInteraction } from "@/lib/policies/participant-state-policy";
import { serializeParticipantForCustomer } from "@/lib/policies/participant-visibility-policy";
import {
  ADMIN_DEFAULT_CONFIG,
  computeParticipantStatusMap,
  createAuditLog,
  createSeedSnapshot,
  createId,
  isSessionExpired,
  MINGLE_CONSTANTS,
  normalizePhoneNumber,
  PROFILE_RULES,
  selectLeastCrowdedTable
} from "@/lib/mingle";
import { readFromDbAuthority } from "@/lib/repositories/authority-config";
import { logHighFrequencyAction, logSuspiciousPattern } from "@/lib/authority-monitoring";
import { getSessionAuthorityRepository } from "@/lib/repositories/authority-backend";
import { getSessionContext as getExternalReservationSessionContext } from "@/lib/reservations/external-reservation-adapter";
import { DEFAULT_AVATAR_BY_GENDER } from "@/types/mingle";
import type {
  AdminSessionView,
  CustomerParticipantView,
  CustomerSessionView,
  AnonymousMessageRecord,
  BlacklistRecord,
  CheckinResolution,
  CheckinMode,
  CommandResult,
  ContactExchangeMethod,
  ContactExchangeRecord,
  ContentResponseRecord,
  EnergyType,
  IncidentRecord,
  IncidentType,
  LiveContentRecord,
  MingleCommand,
  ParticipantRecord,
  ParticipantExportRow,
  MatchExportRow,
  ContactExchangeExportRow,
  ReservationImportResult,
  ReservationImportRow,
  ReservationImportExportAdapter,
  ReservationLookupRule,
  ReservationBridgeRecord,
  ReservationStatus,
  ReservationSessionContextRequest,
  WebsiteEntryContext,
  WebsiteEntryPayload,
  RotationInstructionState,
  RotationPreview,
  SessionSnapshot
} from "@/types/mingle";

const OPERATIONAL_STATE_TRANSITIONS: Record<string, readonly string[]> = {
  ROUND_1: ["BREAK", "ROUND_2", "CLOSED"],
  BREAK: ["ROUND_2", "CLOSED"],
  ROUND_2: ["CLOSED"],
  CLOSED: []
};

export const SESSION_SNAPSHOT_LOAD_FAILED_CODE = "SESSION_SNAPSHOT_LOAD_FAILED";

const ADMIN_COMMAND_ALLOWLIST = new Set<string>([
  "admin.setSessionState",
  "admin.toggleReveal",
  "admin.triggerReveal",
  "admin.generateRotationPreview",
  "admin.applyRotation",
  "admin.activateContent",
  "admin.clearContent",
  "admin.publishAnnouncement",
  "admin.openTablePickWindow",
  "admin.closeTablePickWindow",
  "admin.regenerateTableQr",
  "admin.resolveReport",
  "admin.setBlacklistStatus",
  "admin.moveParticipant",
  "admin.createManualParticipant",
  "admin.importReservations",
  "admin.updateSessionConfig"
]);

export const WEBSITE_ENTRY_REQUIRED_FIELDS = ["branchId", "eventId", "eventDate"] as const;
export const RESERVATION_IMPORT_REQUIRED_FIELDS = [
  "reservationExternalId",
  "reservationId",
  "branchId",
  "eventId",
  "eventDate",
  "status"
] as const;
export const RESERVATION_LOOKUP_RULE: ReservationLookupRule = {
  mode: "EXTERNAL_ID_FIRST_PHONE_FALLBACK",
  phonePolicy: "NORMALIZED_EXACT_MATCH",
  notes: "Reservation grants eligibility only; participant is created only after QR check-in."
};
export const RESERVATION_ACTIVE_STATUSES = new Set<ReservationStatus>(["CONFIRMED", "CHECKED_IN"]);

function isSnapshotFallbackAllowed() {
  return process.env.MINGLE_ALLOW_SNAPSHOT_FALLBACK === "true";
}

function hasMissingSupabaseEnv() {
  return (
    readFromDbAuthority() &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  );
}

function buildSnapshotLoadErrorMessage(error: unknown) {
  if (hasMissingSupabaseEnv()) {
    return "세션 스냅샷 로드 실패: Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)를 확인해 주세요.";
  }
  if (error instanceof Error && error.message.trim()) {
    return `세션 스냅샷 로드 실패: ${error.message}`;
  }
  return "세션 스냅샷 로드 실패: 저장소 상태를 확인해 주세요.";
}

function createSeedFallbackSnapshot() {
  const seed = createSeedSnapshot();
  return {
    ...seed,
    participantStatusMap: computeParticipantStatusMap(seed)
  };
}

function isAdminCommand(command: MingleCommand): command is Extract<MingleCommand, { type: `admin.${string}` }> {
  return command.type.startsWith("admin.");
}

async function persistSnapshot(nextSnapshot: SessionSnapshot) {
  const persisted = await getSessionAuthorityRepository().persistSessionSnapshot(nextSnapshot);
  return { ...persisted, participantStatusMap: computeParticipantStatusMap(persisted) };
}

async function enforceSessionExpiry(snapshot: SessionSnapshot) {
  if (process.env.NODE_ENV === "test") {
    return snapshot;
  }
  if (!isSessionExpired(snapshot.session.startedAt) || snapshot.session.phase === "CLOSED") {
    return snapshot;
  }

  const now = new Date().toISOString();
  const audit = createAuditLog(
    "SESSION_STATE_CHANGED",
    "system",
    "SYSTEM",
    "세션 운영 시간이 만료되어 자동 종료되었습니다.",
    {
      changed_by: "system",
      from_state: snapshot.session.phase,
      to_state: "CLOSED",
      reason: "AUTO_EXPIRED_12H",
      timestamp: now
    },
    snapshot.session.id
  );

  return persistSnapshot({
    ...snapshot,
    session: {
      ...snapshot.session,
      phase: "CLOSED",
      updatedAt: now
    },
    auditLogs: [audit, ...snapshot.auditLogs]
  });
}

export async function getServerSessionSnapshot() {
  try {
    const snapshot = await getSessionAuthorityRepository().getSessionSnapshot();
    if (!snapshot) {
      throw new Error("SNAPSHOT_NULL_GUARD");
    }
    const effectiveSnapshot = await enforceSessionExpiry(snapshot);
    if (!effectiveSnapshot) {
      throw new Error("SNAPSHOT_NULL_GUARD");
    }
    return {
      ...effectiveSnapshot,
      participantStatusMap: computeParticipantStatusMap(effectiveSnapshot)
    };
  } catch (error) {
    if (process.env.NODE_ENV === "test") {
      throw error;
    }
    console.error("[session/current] snapshot load failed; returning seed fallback", error);
    return createSeedFallbackSnapshot();
  }
}

export function subscribeToSessionSnapshots(listener: (snapshot: SessionSnapshot) => void) {
  return getSessionAuthorityRepository().subscribeToSessionSnapshots(listener);
}

function getParticipant(snapshot: SessionSnapshot, participantId: string) {
  const participant = snapshot.participants.find((item) => item.id === participantId);
  if (!participant) {
    throw new Error("참가자를 찾을 수 없습니다.");
  }

  return participant;
}

function updateParticipant(
  snapshot: SessionSnapshot,
  participantId: string,
  updater: (participant: ParticipantRecord) => ParticipantRecord
) {
  let found = false;
  const participants = snapshot.participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant;
    }

    found = true;
    return updater(participant);
  });

  if (!found) {
    throw new Error("참가자를 찾을 수 없습니다.");
  }

  return participants;
}

function touchParticipant(participant: ParticipantRecord, activeAt: string) {
  return {
    ...participant,
    lastActiveAt: activeAt
  };
}

type ParticipantIdentityConsistency = {
  reservationId?: string | null;
  reservationExternalId?: string | null;
  phone?: string | null;
};

function hasReservationLink(
  participant: ParticipantRecord,
  identity: Pick<ParticipantIdentityConsistency, "reservationId" | "reservationExternalId">
) {
  if (identity.reservationExternalId && participant.reservationExternalId) {
    return participant.reservationExternalId === identity.reservationExternalId;
  }

  return participant.reservationId === identity.reservationId;
}

function filterParticipantsByPhone(participants: ParticipantRecord[], phone: string | null | undefined) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    return [];
  }

  return participants.filter(
    (participant) => normalizePhoneNumber(participant.phone) === normalizedPhone
  );
}

function getBlacklistEntry(snapshot: SessionSnapshot, participantId: string) {
  return (
    snapshot.blacklist?.find((entry) => entry.participantId === participantId) ?? null
  );
}

function buildBlockedParticipantError(message: string) {
  const error = new Error(message);
  error.name = "BlockedParticipantError";
  return error;
}

function createIncident(
  snapshot: SessionSnapshot,
  input: {
    type: IncidentType;
    reporterId?: string | null;
    targetId?: string | null;
    message: string;
    timestamp?: string;
  }
): IncidentRecord {
  return {
    id: createId("incident"),
    sessionId: snapshot.session.id,
    branchId: snapshot.session.branchId,
    reporterId: input.reporterId ?? null,
    targetId: input.targetId ?? null,
    type: input.type,
    message: input.message,
    timestamp: input.timestamp ?? new Date().toISOString()
  };
}

function hasRecentMatchingIncident(
  snapshot: SessionSnapshot,
  incident: IncidentRecord,
  windowMs = 60 * 1000
) {
  return (snapshot.incidents ?? []).some((entry) => {
    if (
      entry.type !== incident.type ||
      entry.reporterId !== incident.reporterId ||
      entry.targetId !== incident.targetId ||
      entry.message !== incident.message
    ) {
      return false;
    }

    return (
      Math.abs(new Date(incident.timestamp).getTime() - new Date(entry.timestamp).getTime()) <=
      windowMs
    );
  });
}

async function persistIncident(
  snapshot: SessionSnapshot,
  incident: IncidentRecord
) {
  if (hasRecentMatchingIncident(snapshot, incident)) {
    return snapshot;
  }

  return persistSnapshot({
    ...snapshot,
    incidents: [incident, ...(snapshot.incidents ?? [])],
    session: {
      ...snapshot.session,
      updatedAt: incident.timestamp
    }
  });
}

function countRecentAuditActions(
  snapshot: SessionSnapshot,
  actorId: string,
  action: string,
  windowMs = 60 * 1000
) {
  const now = Date.now();
  return snapshot.auditLogs.filter((entry) => {
    return (
      entry.actorId === actorId &&
      entry.action === action &&
      now - new Date(entry.createdAt).getTime() <= windowMs
    );
  }).length;
}

async function requireCustomerParticipant(
  snapshot: SessionSnapshot,
  participantId: string,
  actionLabel: string,
  expected: ParticipantIdentityConsistency = {}
) {
  const participant = requireSessionParticipant(snapshot, participantId, expected);
  const blacklistEntry = getBlacklistEntry(snapshot, participant.id);
  if (!blacklistEntry) {
    return participant;
  }

  logSuspiciousPattern({
    participantId: participant.id,
    sessionId: snapshot.session.id,
    action: actionLabel,
    reason: blacklistEntry.reason
  });

  await persistIncident(
    snapshot,
    createIncident(snapshot, {
      type: "BLACKLIST_BLOCKED",
      reporterId: participant.id,
      targetId: participant.id,
      message: `${actionLabel} blocked for blacklisted participant: ${blacklistEntry.reason}`
    })
  );

  throw buildBlockedParticipantError(
    "운영 정책상 제한된 참가자입니다. 현장 스태프에게 문의해 주세요."
  );
}

// The current authority repository remains the server-authoritative session context in this pass.
function requireSessionParticipant(
  snapshot: SessionSnapshot,
  participantId: string,
  expected: ParticipantIdentityConsistency = {}
) {
  const participant = getParticipant(snapshot, participantId);

  if (expected.reservationId && participant.reservationId !== expected.reservationId) {
    throw new Error("현재 세션의 참가자 예약 정보가 일치하지 않습니다.");
  }

  if (
    expected.reservationExternalId &&
    participant.reservationExternalId &&
    participant.reservationExternalId !== expected.reservationExternalId
  ) {
    throw new Error("외부 예약 식별자가 현재 참가자 정보와 일치하지 않습니다.");
  }

  const expectedPhone = normalizePhoneNumber(expected.phone);
  const participantPhone = normalizePhoneNumber(participant.phone);
  if (expectedPhone && participantPhone && expectedPhone !== participantPhone) {
    throw new Error("예약 전화번호와 현재 참가자 정보가 일치하지 않습니다.");
  }

  return participant;
}

function buildCheckinResolution(options: {
  resolution: CheckinResolution;
  flowState: CheckinResolution["flowState"];
  participantId?: string | null;
  customerMessage: string | null;
  customerSecondaryMessage: string | null;
}) {
  const {
    resolution,
    flowState,
    participantId = null,
    customerMessage,
    customerSecondaryMessage
  } = options;

  return {
    ...resolution,
    flowState,
    participantId,
    customerMessage,
    customerSecondaryMessage
  };
}

function requireNonEmptyValue(value: string | null | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${label} 값이 필요합니다.`);
  }
  return normalized;
}

export function validateWebsiteEntryPayload(payload: WebsiteEntryPayload): WebsiteEntryPayload {
  return {
    branchId: requireNonEmptyValue(payload.branchId, "branchId"),
    eventId: requireNonEmptyValue(payload.eventId, "eventId"),
    eventDate: requireNonEmptyValue(payload.eventDate, "eventDate"),
    reservationExternalId: payload.reservationExternalId?.trim() || null,
    phone: normalizePhoneNumber(payload.phone) || null
  };
}

export function resolveWebsiteEntryContext(
  snapshot: SessionSnapshot,
  payload: WebsiteEntryPayload
): WebsiteEntryContext {
  const validated = validateWebsiteEntryPayload(payload);
  if (validated.branchId !== snapshot.session.branchId) {
    throw new Error("웹사이트 진입 브랜치가 현재 운영 세션과 일치하지 않습니다.");
  }
  if (validated.eventId !== snapshot.session.eventId) {
    throw new Error("웹사이트 진입 이벤트가 현재 운영 세션과 일치하지 않습니다.");
  }

  return {
    sessionId: snapshot.session.id,
    branchId: validated.branchId,
    eventId: validated.eventId,
    eventDate: validated.eventDate,
    tableId: null,
    reservationExternalId: validated.reservationExternalId ?? null,
    participantId: null,
    checkinCode: null,
    reservationId: null
  };
}

export function validateReservationImportRow(row: ReservationImportRow) {
  const normalizedStatus = row.status;
  if (!RESERVATION_ACTIVE_STATUSES.has(normalizedStatus) && normalizedStatus !== "CANCELLED" && normalizedStatus !== "BLOCKED" && normalizedStatus !== "PENDING") {
    throw new Error("지원되지 않는 예약 상태입니다.");
  }

  return {
    reservationExternalId: requireNonEmptyValue(row.reservationExternalId, "reservationExternalId"),
    reservationId: requireNonEmptyValue(row.reservationId, "reservationId"),
    branchId: requireNonEmptyValue(row.branchId, "branchId"),
    eventId: requireNonEmptyValue(row.eventId, "eventId"),
    eventDate: requireNonEmptyValue(row.eventDate, "eventDate"),
    phone: normalizePhoneNumber(row.phone) || null,
    status: normalizedStatus,
    reservationLabel: row.reservationLabel?.trim() || null,
    checkinCode: row.checkinCode?.trim() || null
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    const next = line[i + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function escapeCsvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (!raw.includes(",") && !raw.includes("\"") && !raw.includes("\n")) {
    return raw;
  }
  return `"${raw.replace(/"/g, "\"\"")}"`;
}

function toCsv<T extends Record<string, string | number | null | undefined>>(
  rows: T[],
  headers: Array<keyof T>
) {
  const headerLine = headers.map((header) => escapeCsvCell(String(header))).join(",");
  const bodyLines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","));
  return [headerLine, ...bodyLines].join("\n");
}

export function mapReservationCsvToRows(csv: string): ReservationImportRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]!).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])) as Record<
      string,
      string
    >;
    return {
      reservationExternalId: row.reservationExternalId ?? "",
      reservationId: row.reservationId ?? "",
      branchId: row.branchId ?? "",
      eventId: row.eventId ?? "",
      eventDate: row.eventDate ?? "",
      phone: row.phone || null,
      status: (row.status as ReservationStatus) ?? "PENDING",
      reservationLabel: row.reservationLabel || undefined,
      checkinCode: row.checkinCode || undefined
    };
  });
}

export function importReservationsFromCsv(csv: string): {
  rows: ReservationImportRow[];
  result: ReservationImportResult;
} {
  const parsedRows = mapReservationCsvToRows(csv);
  let accepted = 0;
  let rejected = 0;
  const errors: Array<{ row: number; message: string }> = [];
  const rows: ReservationImportRow[] = [];

  parsedRows.forEach((row, index) => {
    try {
      const normalized = validateReservationImportRow(row);
      rows.push({
        reservationExternalId: normalized.reservationExternalId,
        reservationId: normalized.reservationId,
        branchId: normalized.branchId,
        eventId: normalized.eventId,
        eventDate: normalized.eventDate,
        phone: normalized.phone,
        status: normalized.status,
        reservationLabel: normalized.reservationLabel ?? undefined,
        checkinCode: normalized.checkinCode ?? undefined
      });
      accepted += 1;
    } catch (error) {
      rejected += 1;
      errors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : "유효하지 않은 예약 데이터입니다."
      });
    }
  });

  return {
    rows,
    result: {
      accepted,
      rejected,
      errors
    }
  };
}

export function buildParticipantExportRows(
  snapshot: SessionSnapshot,
  options: { includePhone: boolean }
): ParticipantExportRow[] {
  const matchSet = new Set<string>();
  for (const heart of snapshot.hearts) {
    const isMutual = snapshot.hearts.some(
      (target) => target.senderId === heart.recipientId && target.recipientId === heart.senderId
    );
    if (isMutual) {
      matchSet.add(heart.senderId);
      matchSet.add(heart.recipientId);
    }
  }

  return snapshot.participants.map((participant) => ({
    participantId: participant.id,
    nickname: participant.nickname,
    phone: options.includePhone ? normalizePhoneNumber(participant.phone) : null,
    tableId: participant.tableId,
    matchStatus: matchSet.has(participant.id) ? "MATCHED" : "UNMATCHED"
  }));
}

export function buildMatchExportRows(
  snapshot: SessionSnapshot,
  options: { includePhone: boolean }
): MatchExportRow[] {
  const participantMap = new Map(snapshot.participants.map((participant) => [participant.id, participant]));
  const pairKeys = new Set<string>();
  const rows: MatchExportRow[] = [];

  for (const heart of snapshot.hearts) {
    const isMutual = snapshot.hearts.some(
      (target) => target.senderId === heart.recipientId && target.recipientId === heart.senderId
    );
    if (!isMutual) {
      continue;
    }
    const [aId, bId] = [heart.senderId, heart.recipientId].sort();
    const key = `${aId}:${bId}`;
    if (pairKeys.has(key)) {
      continue;
    }
    pairKeys.add(key);
    const participantA = participantMap.get(aId);
    const participantB = participantMap.get(bId);
    if (!participantA || !participantB) {
      continue;
    }
    rows.push({
      participantAId: participantA.id,
      participantANickname: participantA.nickname,
      participantAPhone: options.includePhone ? normalizePhoneNumber(participantA.phone) : null,
      participantBId: participantB.id,
      participantBNickname: participantB.nickname,
      participantBPhone: options.includePhone ? normalizePhoneNumber(participantB.phone) : null,
      status: "MATCHED"
    });
  }

  return rows;
}

export function buildContactExchangeExportRows(
  snapshot: SessionSnapshot,
  options: { includePhone: boolean }
): ContactExchangeExportRow[] {
  const participantMap = new Map(snapshot.participants.map((participant) => [participant.id, participant]));
  return (snapshot.contactExchanges ?? []).map((exchange) => {
    const participantA = participantMap.get(exchange.participantAId);
    const participantB = participantMap.get(exchange.participantBId);
    return {
      participantAId: exchange.participantAId,
      participantANickname: participantA?.nickname ?? exchange.participantAId,
      participantAPhone: options.includePhone ? normalizePhoneNumber(participantA?.phone) : null,
      participantBId: exchange.participantBId,
      participantBNickname: participantB?.nickname ?? exchange.participantBId,
      participantBPhone: options.includePhone ? normalizePhoneNumber(participantB?.phone) : null,
      contactExchangeStatus: exchange.status
    };
  });
}

export function createCsvReservationImportExportAdapter(): ReservationImportExportAdapter {
  return {
    async importRows(rows) {
      let accepted = 0;
      let rejected = 0;
      const errors: Array<{ row: number; message: string }> = [];
      rows.forEach((row, index) => {
        try {
          validateReservationImportRow(row);
          accepted += 1;
        } catch (error) {
          rejected += 1;
          errors.push({
            row: index + 1,
            message: error instanceof Error ? error.message : "유효하지 않은 예약 데이터입니다."
          });
        }
      });
      return { accepted, rejected, errors };
    },
    async exportRows(input) {
      const rows = input.rows.map((row) => ({
        sessionId: row.sessionId,
        reservationExternalId: row.reservationExternalId,
        reservationId: row.reservationId,
        branchId: row.branchId,
        eventId: row.eventId,
        eventDate: row.eventDate,
        phone: row.phone ?? null,
        status: row.status,
        reservationLabel: row.reservationLabel ?? null,
        checkinCode: row.checkinCode ?? null,
        eligible: row.eligible ? "true" : "false",
        participantId: row.participantId ?? null
      }));
      const headers: Array<keyof (typeof rows)[number]> = [
        "sessionId",
        "reservationExternalId",
        "reservationId",
        "branchId",
        "eventId",
        "eventDate",
        "phone",
        "status",
        "reservationLabel",
        "checkinCode",
        "eligible",
        "participantId"
      ];
      return {
        fileName: `reservations-${input.sessionId}.csv`,
        mimeType: "text/csv",
        body: toCsv(rows, headers)
      };
    },
    async exportParticipants(input) {
      const rows = input.rows.map((row) => ({
        ...row,
        phone: input.includePhone ? row.phone : null
      }));
      return {
        fileName: `participants-${input.sessionId}.csv`,
        mimeType: "text/csv",
        body: toCsv(rows, ["participantId", "nickname", "phone", "tableId", "matchStatus"])
      };
    },
    async exportMatches(input) {
      const rows = input.rows.map((row) => ({
        ...row,
        participantAPhone: input.includePhone ? row.participantAPhone : null,
        participantBPhone: input.includePhone ? row.participantBPhone : null
      }));
      return {
        fileName: `matches-${input.sessionId}.csv`,
        mimeType: "text/csv",
        body: toCsv(rows, [
          "participantAId",
          "participantANickname",
          "participantAPhone",
          "participantBId",
          "participantBNickname",
          "participantBPhone",
          "status"
        ])
      };
    },
    async exportContactExchanges(input) {
      const rows = input.rows.map((row) => ({
        ...row,
        participantAPhone: input.includePhone ? row.participantAPhone : null,
        participantBPhone: input.includePhone ? row.participantBPhone : null
      }));
      return {
        fileName: `contact-exchanges-${input.sessionId}.csv`,
        mimeType: "text/csv",
        body: toCsv(rows, [
          "participantAId",
          "participantANickname",
          "participantAPhone",
          "participantBId",
          "participantBNickname",
          "participantBPhone",
          "contactExchangeStatus"
        ])
      };
    }
  };
}

export function applyHeartGrant(
  snapshot: SessionSnapshot,
  participantId: string,
  heartsToAdd: number,
  updatedAt = new Date().toISOString()
) {
  const amount = Math.trunc(heartsToAdd);
  if (amount <= 0) {
    throw new Error("추가 하트 수량은 1 이상이어야 합니다.");
  }

  let updatedParticipant: ParticipantRecord | null = null;
  const participants = updateParticipant(snapshot, participantId, (participant) => {
    updatedParticipant = {
      ...participant,
      heartsRemaining: participant.heartsRemaining + amount
    };
    return updatedParticipant;
  });

  return {
    snapshot: {
      ...snapshot,
      participants,
      session: { ...snapshot.session, updatedAt }
    },
    participant: updatedParticipant ?? getParticipant(snapshot, participantId)
  };
}

export function applyHeartSend(
  snapshot: SessionSnapshot,
  senderId: string,
  recipientId: string,
  createdAt = new Date().toISOString()
) {
  const sender = getParticipant(snapshot, senderId);
  const recipient = getParticipant(snapshot, recipientId);
  if (!isEligibleForInteraction(sender) || !isEligibleForInteraction(recipient)) {
    throw new Error("현재 상태에서는 하트를 보낼 수 없습니다.");
  }

  if (sender.id === recipient.id) {
    throw new Error("본인에게는 하트를 보낼 수 없습니다.");
  }

  if (
    snapshot.hearts.some(
      (heart) =>
        heart.sessionId === snapshot.session.id &&
        heart.senderId === sender.id &&
        heart.recipientId === recipient.id
    )
  ) {
    throw new Error("같은 참가자에게는 한 번만 하트를 보낼 수 있습니다.");
  }

  if (sender.heartsRemaining <= 0) {
    throw new Error("남은 하트가 없습니다.");
  }

  return {
    snapshot: {
      ...snapshot,
      hearts: [
        {
          id: createId("heart"),
          sessionId: snapshot.session.id,
          senderId: sender.id,
          recipientId: recipient.id,
          createdAt
        },
        ...snapshot.hearts
      ],
      participants: snapshot.participants.map((participant) => {
        if (participant.id === sender.id) {
          return {
            ...touchParticipant(participant, createdAt),
            sentHearts: participant.sentHearts + 1,
            heartsRemaining: Math.max(0, participant.heartsRemaining - 1)
          };
        }

        if (participant.id === recipient.id) {
          return {
            ...touchParticipant(participant, createdAt),
            receivedHearts: participant.receivedHearts + 1
          };
        }

        return participant;
      }),
      session: { ...snapshot.session, updatedAt: createdAt }
    },
    sender,
    recipient
  };
}

function ensureProfileFields(draft: {
  nickname: string;
  age: number;
  jobCategory: string;
  job: string;
  heightCm: number;
  animalType: string;
  energyType: string;
}) {
  if (
    !draft.nickname.trim() ||
    !draft.jobCategory ||
    !draft.job ||
    !draft.animalType ||
    !draft.energyType
  ) {
    throw new Error("필수 프로필 정보를 모두 입력해 주세요.");
  }

  if (draft.age < PROFILE_RULES.minAge || draft.age > PROFILE_RULES.maxAge) {
    throw new Error(`나이는 ${PROFILE_RULES.minAge}~${PROFILE_RULES.maxAge} 범위여야 합니다.`);
  }

  if (draft.heightCm < PROFILE_RULES.minHeightCm || draft.heightCm > PROFILE_RULES.maxHeightCm) {
    throw new Error(`키는 ${PROFILE_RULES.minHeightCm}~${PROFILE_RULES.maxHeightCm}cm 범위여야 합니다.`);
  }
}

function normalizeProfilePhotoUrl(photoUrl: string | null | undefined) {
  const normalized = photoUrl?.trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized === "default-profile-placeholder" ||
    normalized === "placeholder:default-profile" ||
    normalized === "placeholder://default-profile"
  ) {
    return null;
  }

  return normalized;
}

function normalizeReservationStatus(status: string | null | undefined): ReservationStatus {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "CHECKED_IN") return "CHECKED_IN";
  if (normalized === "CONFIRMED") return "CONFIRMED";
  if (normalized === "CANCELLED") return "CANCELLED";
  if (normalized === "BLOCKED") return "BLOCKED";
  return "PENDING";
}

function buildReservationImportKey(row: ReservationBridgeRecord) {
  return `${normalizePhoneNumber(row.phone) ?? row.normalizedPhone ?? ""}|${row.eventDate}|${row.slot ?? ""}`;
}

function resolveProfilePhotoUrl(
  snapshot: SessionSnapshot,
  photoUrl: string | null | undefined,
  gender: string
) {
  const normalized = normalizeProfilePhotoUrl(photoUrl);
  if (normalized) {
    return normalized;
  }
  const defaultProfileImagePaths = snapshot.session.operationalConfig?.defaultProfileImagePaths ??
    ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths;
  if (gender === "M" || gender === "F") {
    return gender === "M"
      ? defaultProfileImagePaths.male || DEFAULT_AVATAR_BY_GENDER.M
      : defaultProfileImagePaths.female || DEFAULT_AVATAR_BY_GENDER.F;
  }
  return defaultProfileImagePaths.unknown || "/avatars/default.png";
}

function normalizeNickname(nickname: string | null | undefined) {
  return (nickname ?? "").trim().toLocaleLowerCase("ko-KR");
}

function buildContactExchangePair(participantId: string, targetParticipantId: string) {
  return [participantId, targetParticipantId].sort() as [string, string];
}

function findContactExchange(
  snapshot: SessionSnapshot,
  participantAId: string,
  participantBId: string
) {
  return (
    snapshot.contactExchanges?.find(
      (item) =>
        (item.participantAId === participantAId && item.participantBId === participantBId) ||
        (item.participantAId === participantBId && item.participantBId === participantAId)
    ) ?? null
  );
}

function isMutualHeartMatch(snapshot: SessionSnapshot, participantId: string, targetParticipantId: string) {
  const sent = snapshot.hearts.some(
    (heart) => heart.senderId === participantId && heart.recipientId === targetParticipantId
  );
  const received = snapshot.hearts.some(
    (heart) => heart.senderId === targetParticipantId && heart.recipientId === participantId
  );
  return sent && received;
}

function normalizeContactMethods(methods: ContactExchangeMethod | undefined): ContactExchangeMethod {
  return {
    realName: methods?.realName?.trim() || undefined,
    phone: normalizePhoneNumber(methods?.phone) || undefined,
    kakaoId: methods?.kakaoId?.trim() || undefined,
    instagramId: methods?.instagramId?.trim() || undefined
  };
}

function hasAtLeastOneContactMethod(methods: ContactExchangeMethod) {
  return Boolean(methods.phone || methods.kakaoId || methods.instagramId);
}

function buildContactExchangeStats(contactExchanges: ContactExchangeRecord[]) {
  return {
    totalRequests: contactExchanges.length,
    pendingCount: contactExchanges.filter((item) => item.status === "PENDING").length,
    completedCount: contactExchanges.filter((item) => item.status === "COMPLETED").length,
    blockedCount: contactExchanges.filter((item) => item.status === "BLOCKED").length
  };
}

export function sanitizeSnapshotForClient(snapshot: SessionSnapshot): CustomerSessionView {
  return sanitizeSnapshotForCustomer(snapshot);
}

export function sanitizeSnapshotForCustomer(snapshot: SessionSnapshot): CustomerSessionView {
  const normalizedExchanges = (snapshot.contactExchanges ?? []).map((exchange) => {
    if (exchange.status === "COMPLETED") {
      return exchange;
    }
    return {
      ...exchange,
      participantAMethods: null,
      participantBMethods: null
    };
  });

  return {
    session: snapshot.session,
    participants: snapshot.participants.map((participant) =>
      serializeParticipantForCustomer(participant, snapshot.session.phase)
    ),
    hearts: snapshot.hearts,
    activeContentIds: snapshot.activeContentIds,
    liveContent: snapshot.liveContent,
    contentResponses: snapshot.contentResponses,
    anonymousMessages: snapshot.anonymousMessages,
    tableImpressionPicks: snapshot.tableImpressionPicks ?? [],
    tablePickWindows: snapshot.tablePickWindows ?? [],
    tableQrCodes: snapshot.tableQrCodes ?? [],
    participantStatusMap: snapshot.participantStatusMap ?? {},
    contactExchanges: normalizedExchanges,
    contactExchangeStats: buildContactExchangeStats(normalizedExchanges),
    announcements: snapshot.announcements,
    rotationInstruction: snapshot.rotationInstruction,
    version: snapshot.version
  };
}

export function sanitizeSnapshotForAdmin(snapshot: SessionSnapshot): AdminSessionView {
  const normalizedExchanges = (snapshot.contactExchanges ?? []).map((exchange) => {
    if (exchange.status === "COMPLETED") {
      return exchange;
    }
    return {
      ...exchange,
      participantAMethods: null,
      participantBMethods: null
    };
  });

  return {
    ...snapshot,
    participantStatusMap: snapshot.participantStatusMap ?? {},
    contactExchanges: normalizedExchanges,
    contactExchangeStats: buildContactExchangeStats(normalizedExchanges)
  };
}

const MANUAL_PARTICIPANT_DEFAULTS: Pick<
  ParticipantRecord,
  "age" | "jobCategory" | "job" | "heightCm" | "animalType" | "energyType" | "checkinMode"
> = {
  age: 29,
  jobCategory: "운영",
  job: "현장 등록",
  heightCm: 170,
  animalType: "알수없음",
  energyType: "E",
  checkinMode: "staff" satisfies CheckinMode
};

export function validateNicknameAvailability(
  participants: ParticipantRecord[],
  nickname: string,
  excludeParticipantId?: string
) {
  if (typeof nickname !== "string" || !nickname.trim()) {
    throw new Error("닉네임을 입력해주세요.");
  }
  const normalized = normalizeNickname(nickname);
  const conflict = participants.find((participant) => {
    if (excludeParticipantId && participant.id === excludeParticipantId) {
      return false;
    }

    return normalizeNickname(participant.nickname) === normalized;
  });

  if (conflict) {
    throw new Error("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
  }

  return nickname.trim();
}

type StableCheckinIdentityResult = {
  flowState: CheckinResolution["flowState"];
  participantId: string | null;
  customerMessage: string | null;
  customerSecondaryMessage: string | null;
};

type StableCheckinIdentityInput = {
  participantId?: string | null;
  reservationId: string;
  reservationExternalId?: string | null;
  phone?: string | null;
};

// Nickname is a display/business field. Reservation-linked identity remains the stable check-in authority here.
export function resolveStableCheckinIdentity(
  snapshot: SessionSnapshot,
  reservationParticipants: ParticipantRecord[],
  input: StableCheckinIdentityInput
): StableCheckinIdentityResult {
  if (input.participantId) {
    try {
      const participant = requireSessionParticipant(snapshot, input.participantId, {
        reservationId: input.reservationId,
        reservationExternalId: input.reservationExternalId ?? null,
        phone: input.phone ?? null
      });
      return {
        flowState: "RE_ENTRY",
        participantId: participant.id,
        customerMessage: CHECKIN_REENTRY_MESSAGE,
        customerSecondaryMessage: "기존 참가자 상태를 우선 복구했습니다."
      };
    } catch {
      // Cached participant identity is a convenience hint only. Fall back to reservation-linked recovery.
    }
  }

  const phoneMatches = filterParticipantsByPhone(reservationParticipants, input.phone);
  if (phoneMatches.length === 1) {
    return {
      flowState: "RE_ENTRY",
      participantId: phoneMatches[0]!.id,
      customerMessage: CHECKIN_REENTRY_MESSAGE,
      customerSecondaryMessage: "예약 및 전화번호 정보 기준으로 기존 참가자 상태를 복구했습니다."
    };
  }

  if (phoneMatches.length > 1) {
    return {
      flowState: "BLOCKED",
      participantId: null,
      customerMessage: CHECKIN_BLOCKED_MESSAGE,
      customerSecondaryMessage: "동일한 연락처와 연결된 참가자 정보가 여러 건입니다. 현장 스태프에게 문의해주세요."
    };
  }

  if (reservationParticipants.length === 0) {
    return {
      flowState: "SUCCESS",
      participantId: createId("viewer"),
      customerMessage: CHECKIN_SUCCESS_MESSAGE,
      customerSecondaryMessage: "다음 단계로 진행해 주세요."
    };
  }

  if (reservationParticipants.length === 1) {
    const existingParticipant = reservationParticipants[0]!;
    return {
      flowState: "RE_ENTRY",
      participantId: existingParticipant.id,
      customerMessage: CHECKIN_REENTRY_MESSAGE,
      customerSecondaryMessage: "예약 연동 정보 기준으로 기존 참가자 상태를 복구했습니다."
    };
  }

  return {
    flowState: "BLOCKED",
    participantId: null,
    customerMessage: CHECKIN_BLOCKED_MESSAGE,
    customerSecondaryMessage: "체크인 가능한 참가자 정보를 확인할 수 없습니다. 현장 스태프에게 문의해주세요."
  };
}

function createBlockedCheckinResolution(
  sessionId: string,
  branchId: string,
  checkinCode: string,
  customerSecondaryMessage: string
): CheckinResolution {
  return {
    sessionId,
    branchId,
    tableId: null,
    reservationId: "unknown",
    reservationExternalId: null,
    participantId: null,
    phone: null,
    gender: "M",
    reservationLabel: "체크인 확인",
    checkinCode,
    flowState: "BLOCKED",
    customerMessage: CHECKIN_BLOCKED_MESSAGE,
    customerSecondaryMessage
  };
}

export async function getReservationSessionContext(
  input: ReservationSessionContextRequest
): Promise<CommandResult> {
  const snapshot = await getServerSessionSnapshot();

  // Guard 1: branchId must match the active session's branch.
  // Session is resolved from branchId at runtime — not from QR.
  if (input.branchId !== snapshot.session.branchId) {
    return {
      snapshot,
      participantId: null,
      checkinResolution: createBlockedCheckinResolution(
        snapshot.session.id,
        snapshot.session.branchId,
        input.checkinCode ?? "",
        "체크인 대상 브랜치가 현재 운영 중인 세션과 일치하지 않습니다."
      )
    };
  }

  // Guard 2: CLOSED/MATCH_END blocks all new check-ins (late entry allowed in all other phases).
  if (snapshot.session.phase === "MATCH_END" || snapshot.session.phase === "CLOSED") {
    return {
      snapshot,
      participantId: null,
      checkinResolution: createBlockedCheckinResolution(
        snapshot.session.id,
        snapshot.session.branchId,
        input.checkinCode ?? "",
        "세션이 종료되어 체크인을 진행할 수 없습니다."
      )
    };
  }

  // Guard 3: tableId must be within session bounds.
  if (input.tableId < 1 || input.tableId > snapshot.session.tableCount) {
    return {
      snapshot,
      participantId: null,
      checkinResolution: createBlockedCheckinResolution(
        snapshot.session.id,
        snapshot.session.branchId,
        input.checkinCode ?? "",
        "QR의 테이블 정보가 현재 세션과 일치하지 않습니다."
      )
    };
  }

  // Session ID is resolved at runtime from the active snapshot — never taken from the QR.
  const resolvedSessionId = snapshot.session.id;

  const normalizedCheckinCode = input.checkinCode?.trim() ?? "";
  const hasCheckinCode = normalizedCheckinCode.length > 0;
  let resolution: CheckinResolution;

  if (!hasCheckinCode) {
    resolution = {
      sessionId: resolvedSessionId,
      branchId: snapshot.session.branchId,
      tableId: input.tableId,
      reservationId: createId("walkin_reservation"),
      reservationExternalId: null,
      participantId: null,
      phone: null,
      gender: "M",
      reservationLabel: "현장 QR 입장",
      checkinCode: "",
      flowState: "SUCCESS",
      customerMessage: null,
      customerSecondaryMessage: null
    };
  } else {
    const externalContext = await getExternalReservationSessionContext({
      sessionId: resolvedSessionId,
      checkinCode: normalizedCheckinCode
    });

    if (!externalContext || externalContext.status !== "ACTIVE" || !externalContext.eligible) {
      return {
        snapshot,
        participantId: null,
        checkinResolution: createBlockedCheckinResolution(
          resolvedSessionId,
          snapshot.session.branchId,
          normalizedCheckinCode,
          "체크인 정보가 올바른지 다시 확인해 주세요."
        )
      };
    }

    if (externalContext.branchId && externalContext.branchId !== snapshot.session.branchId) {
      return {
        snapshot,
        participantId: null,
        checkinResolution: createBlockedCheckinResolution(
          resolvedSessionId,
          snapshot.session.branchId,
          normalizedCheckinCode,
          "예약 정보의 브랜치가 현재 운영 중인 세션과 일치하지 않습니다."
        )
      };
    }

    resolution = {
      sessionId: resolvedSessionId,
      branchId: externalContext.branchId ?? snapshot.session.branchId,
      tableId: input.tableId,
      reservationId: externalContext.reservationId,
      reservationExternalId: externalContext.reservationExternalId ?? null,
      participantId: null,
      phone: normalizePhoneNumber(externalContext.phone),
      gender: externalContext.gender,
      reservationLabel: externalContext.reservationLabel,
      checkinCode: externalContext.checkinCode,
      flowState: "SUCCESS",
      customerMessage: null,
      customerSecondaryMessage: null
    };
  }

  const identityResult = hasCheckinCode
    ? resolveStableCheckinIdentity(
        snapshot,
        snapshot.participants.filter((participant) =>
          hasReservationLink(participant, {
            reservationId: resolution.reservationId,
            reservationExternalId: resolution.reservationExternalId ?? null
          })
        ),
        {
          participantId: input.participantId ?? null,
          reservationId: resolution.reservationId,
          reservationExternalId: resolution.reservationExternalId ?? null,
          phone: resolution.phone ?? null
        }
      )
    : input.participantId &&
        snapshot.participants.some((participant) => participant.id === input.participantId)
      ? {
          flowState: "RE_ENTRY" as const,
          participantId: input.participantId,
          customerMessage: CHECKIN_REENTRY_MESSAGE,
          customerSecondaryMessage: "기존 참가자 상태로 이어서 참여할 수 있어요."
        }
      : {
          flowState: "SUCCESS" as const,
          participantId: createId("viewer"),
          customerMessage: CHECKIN_SUCCESS_MESSAGE,
          customerSecondaryMessage: "이제 프로필을 입력하면 참여가 시작됩니다."
        };

  if (identityResult.flowState === "BLOCKED") {
    return {
      snapshot,
      participantId: null,
      checkinResolution: buildCheckinResolution({
        resolution,
        flowState: "BLOCKED",
        participantId: null,
        customerMessage: identityResult.customerMessage,
        customerSecondaryMessage: identityResult.customerSecondaryMessage
      })
    };
  }

  if (identityResult.participantId) {
    const blacklistEntry = getBlacklistEntry(snapshot, identityResult.participantId);
    if (blacklistEntry) {
      logSuspiciousPattern({
        participantId: identityResult.participantId,
        reservationId: resolution.reservationId,
        sessionId: resolvedSessionId,
        action: "checkin",
        reason: blacklistEntry.reason
      });

      const blockedSnapshot = await persistIncident(
        snapshot,
        createIncident(snapshot, {
          type: "BLACKLIST_BLOCKED",
          reporterId: identityResult.participantId,
          targetId: identityResult.participantId,
          message: `checkin blocked for blacklisted participant: ${blacklistEntry.reason}`
        })
      );

      return {
        snapshot: blockedSnapshot,
        participantId: null,
        checkinResolution: buildCheckinResolution({
          resolution,
          flowState: "BLOCKED",
          participantId: null,
          customerMessage: CHECKIN_BLOCKED_MESSAGE,
          customerSecondaryMessage:
            "운영 정책상 체크인이 제한된 참가자입니다. 현장 스태프에게 문의해 주세요."
        })
      };
    }
  }

  const audit = createAuditLog(
    "CHECKIN_VERIFIED",
    identityResult.participantId ?? "customer_pending",
    "CUSTOMER",
    `${resolution.reservationLabel} 체크인이 확인되었습니다.`,
    {
      reservationId: resolution.reservationId,
      tableId: input.tableId,
      mode: "qr",
      flowState: identityResult.flowState
    },
    resolvedSessionId
  );

  const nextSnapshot = await persistSnapshot({
    ...snapshot,
    auditLogs: [audit, ...snapshot.auditLogs],
    session: { ...snapshot.session, updatedAt: audit.createdAt }
  });

  return {
    snapshot: nextSnapshot,
    participantId: identityResult.participantId,
    checkinResolution: buildCheckinResolution({
      resolution,
      flowState: identityResult.flowState,
      participantId: identityResult.participantId,
      customerMessage: identityResult.customerMessage,
      customerSecondaryMessage: identityResult.customerSecondaryMessage
    })
  };
}

function ensureContentVisibility(snapshot: SessionSnapshot, participant: ParticipantRecord) {
  const liveContent = snapshot.liveContent;
  if (!liveContent || liveContent.status !== "LIVE") {
    throw new Error("吏湲?吏꾪뻾 以묒씤 肄섑뀗痢좉? ?놁뒿?덈떎.");
  }

  if (liveContent.targetTableId !== null && liveContent.targetTableId !== participant.tableId) {
    throw new Error("?꾩옱 ?뚯씠釉붿뿉 ?대젮 ?덈뒗 肄섑뀗痢좉? ?꾨떃?덈떎.");
  }

  if (liveContent.expiresAt && new Date(liveContent.expiresAt).getTime() < Date.now()) {
    throw new Error("?대? 醫낅즺??肄섑뀗痢좎엯?덈떎.");
  }

  return liveContent;
}

function getTablePickWindow(snapshot: SessionSnapshot, rotationIndex: 0 | 1) {
  return (
    (snapshot.tablePickWindows ?? []).find(
      (window) => window.sessionId === snapshot.session.id && window.rotationIndex === rotationIndex
    ) ?? null
  );
}

function upsertTablePickWindow(
  snapshot: SessionSnapshot,
  rotationIndex: 0 | 1,
  status: "OPEN" | "CLOSED",
  now: string
) {
  const windows = [...(snapshot.tablePickWindows ?? [])];
  const index = windows.findIndex(
    (window) => window.sessionId === snapshot.session.id && window.rotationIndex === rotationIndex
  );
  if (index < 0) {
    windows.push({
      id: createId("table_pick_window"),
      sessionId: snapshot.session.id,
      rotationIndex,
      status,
      openedAt: now,
      closedAt: status === "CLOSED" ? now : null
    });
    return windows;
  }
  const current = windows[index]!;
  windows[index] = {
    ...current,
    status,
    openedAt: status === "OPEN" ? now : current.openedAt,
    closedAt: status === "CLOSED" ? now : null
  };
  return windows;
}

function createCheckinCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function buildRotationInstruction(
  beforeSnapshot: SessionSnapshot,
  afterSnapshot: SessionSnapshot,
  preview: RotationPreview
): RotationInstructionState {
  const previousTableMap = new Map(beforeSnapshot.participants.map((participant) => [participant.id, participant.tableId]));
  const rotationDeadlineMinutes =
    beforeSnapshot.session.operationalConfig?.rotationDeadlineMinutes ??
    ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes;
  const startsAt = new Date().toISOString();
  const deadlineAt = new Date(
    Date.now() + Math.max(1, rotationDeadlineMinutes) * 60 * 1000
  ).toISOString();
  const moveReasonMap = new Map(
    preview.moves.map((move) => [move.participantId, move.reasonTags])
  );

  return {
    version: afterSnapshot.version + 1,
    rotationRound: preview.rotationRound,
    startsAt,
    deadlineAt,
    assignments: afterSnapshot.participants
      .map((participant) => ({
        participantId: participant.id,
        fromTableId: previousTableMap.get(participant.id) ?? participant.tableId,
        toTableId: participant.tableId,
        reasonTags: moveReasonMap.get(participant.id) ?? [],
        acknowledgedAt: null
      }))
      .filter((assignment) => assignment.fromTableId !== assignment.toTableId)
  };
}

function createContentResponse(
  snapshot: SessionSnapshot,
  participant: ParticipantRecord,
  contentId: string,
  value: string,
  recipientId: string | null
): ContentResponseRecord {
  return {
    id: createId("content_response"),
    contentId,
    participantId: participant.id,
    tableId: participant.tableId,
    value,
    recipientId,
    createdAt: new Date().toISOString()
  };
}

function createLiveContent(snapshot: SessionSnapshot, templateId: string, targetTableId: number | null, message?: string) {
  const template = getContentTemplate(templateId);
  if (!template) {
    throw new Error("議댁옱?섏? ?딅뒗 肄섑뀗痢??쒗뵆由우엯?덈떎.");
  }

  if (!isTemplateAllowedInPhase(template.phasePolicy, snapshot.session.phase)) {
    throw new Error("?꾩옱 ?쇱슫?쒖뿉???ъ슜?????녿뒗 肄섑뀗痢좎엯?덈떎.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + template.durationSec * 1000).toISOString();
  const liveContent: LiveContentRecord = {
    id: createId("content"),
    templateId: template.id,
    kind: template.kind,
    title: template.title,
    description: message?.trim() ? message.trim() : template.description,
    ctaLabel: template.ctaLabel,
    scope: template.scope,
    targetTableId,
    createdAt: now.toISOString(),
    expiresAt,
    status: "LIVE",
    options: template.options ?? [],
    message: message?.trim() ? message.trim() : null
  };

  return { liveContent, template };
}

export async function grantHeartsByAdmin(participantId: string, heartsToAdd: number) {
  const snapshot = await getServerSessionSnapshot();
  const updatedAt = new Date().toISOString();
  const { snapshot: grantedSnapshot, participant } = applyHeartGrant(
    snapshot,
    participantId,
    heartsToAdd,
    updatedAt
  );
  const nextSnapshot = await persistSnapshot(grantedSnapshot);
  const updatedParticipant = getParticipant(nextSnapshot, participant.id);

  return {
    snapshot: nextSnapshot,
    participant: updatedParticipant
  };
}

export async function executeServerCommand(command: MingleCommand): Promise<CommandResult> {
  const snapshot = await getServerSessionSnapshot();

  if (isAdminCommand(command)) {
    if (!ADMIN_COMMAND_ALLOWLIST.has(command.type)) {
      throw new Error("허용되지 않은 관리자 명령입니다.");
    }
    if (snapshot.session.phase === "CLOSED") {
      throw new Error("세션이 종료되었습니다.");
    }
    if (typeof command.expectedVersion === "number" && command.expectedVersion !== snapshot.version) {
      throw new Error("세션이 갱신되었습니다. 다시 시도해 주세요.");
    }
  }

  switch (command.type) {
    case "customer.verifyCheckin": {
      const parsedQr = parseCheckinQrValue(command.draft.value);
      if (!parsedQr) {
        return {
          snapshot,
          participantId: null,
          checkinResolution: createBlockedCheckinResolution(
            snapshot.session.id,
            snapshot.session.branchId,
            "",
            "체크인 QR 형식이 올바른지 다시 확인해 주세요."
          )
        };
      }

      const activeTableQr = (snapshot.tableQrCodes ?? []).find(
        (item) =>
          item.branchId === parsedQr.branchId &&
          item.sessionId === snapshot.session.id &&
          item.tableId === parsedQr.tableId &&
          item.status === "ACTIVE"
      );
      if (activeTableQr) {
        if (!parsedQr.checkinCode || parsedQr.checkinCode !== activeTableQr.code) {
          return {
            snapshot,
            participantId: null,
            checkinResolution: createBlockedCheckinResolution(
              snapshot.session.id,
              snapshot.session.branchId,
              "",
              "만료되었거나 교체된 QR입니다. 새 QR로 다시 시도해 주세요."
            )
          };
        }
      }

      return getReservationSessionContext({
        branchId: parsedQr.branchId,
        tableId: parsedQr.tableId,
        checkinCode: parsedQr.checkinCode,
        participantId: command.participantId ?? null
      });
    }

    case "customer.completeProfile": {
      const age = Number(command.draft.age);
      const heightCm = Number(command.draft.heightCm);
      const energyType = command.draft.energyType as EnergyType;
      ensureProfileFields({
        nickname: command.draft.nickname,
        age,
        jobCategory: command.draft.jobCategory,
        job: command.draft.job,
        heightCm,
        animalType: command.draft.animalType,
        energyType
      });

      const normalizedDraftPhone = normalizePhoneNumber(command.draft.contact);
      const linkedReservation =
        (snapshot.reservations ?? []).find(
          (reservation) =>
            reservation.reservationId === command.resolution.reservationId ||
            (normalizedDraftPhone &&
              (reservation.normalizedPhone === normalizedDraftPhone ||
                normalizePhoneNumber(reservation.phone) === normalizedDraftPhone))
        ) ?? null;
      const resolvedReservationId = linkedReservation?.reservationId ?? command.resolution.reservationId ?? null;
      const resolvedReservationExternalId =
        linkedReservation?.reservationExternalId ?? command.resolution.reservationExternalId ?? null;
      const existingReservationParticipants = snapshot.participants.filter((participant) =>
        hasReservationLink(participant, {
          reservationId: resolvedReservationId,
          reservationExternalId: resolvedReservationExternalId
        })
      );

      if (command.resolution.flowState !== "SUCCESS") {
        throw new Error("신규 입장이 승인된 상태에서만 프로필을 완료할 수 있습니다.");
      }

      if (!command.resolution.participantId) {
        throw new Error("체크인에서 발급된 참가자 정보가 없습니다. 다시 체크인을 진행해 주세요.");
      }

      if (existingReservationParticipants.length > 0) {
        throw new Error("이미 체크인된 예약입니다.");
      }

      if (snapshot.participants.some((participant) => participant.id === command.resolution.participantId)) {
        throw new Error("이미 사용 중인 참가자 정보입니다. 다시 체크인을 진행해 주세요.");
      }

      const nickname = validateNicknameAvailability(snapshot.participants, command.draft.nickname);

      // QR check-in carries tableId from the physical table asset.
      // Staff/code check-in falls back to least-crowded auto-assignment.
      const tableId =
        command.resolution.tableId ??
        selectLeastCrowdedTable(snapshot.participants, snapshot.session.tableCount);
      const createdAt = new Date().toISOString();
      const participant: ParticipantRecord = {
        id: command.resolution.participantId,
        sessionId: snapshot.session.id,
        branchId: snapshot.session.branchId,
        reservationId: resolvedReservationId,
        reservationExternalId: resolvedReservationExternalId,
        phone: normalizePhoneNumber(command.resolution.phone) ?? normalizedDraftPhone,
        nickname,
        gender: command.resolution.gender,
        age,
        jobCategory: command.draft.jobCategory,
        job: command.draft.job,
        photoUrl: resolveProfilePhotoUrl(snapshot, command.draft.photoUrl, command.resolution.gender),
        heightCm,
        animalType: command.draft.animalType,
        energyType,
        checkinMode: command.checkinMode,
        tableId,
        round2Attendance: "UNDECIDED",
        participantSessionState: "ACTIVE",
        presenceState: "CHECKED_IN",
        receivedHearts: 0,
        sentHearts: 0,
        profileViews: 0,
        heartsRemaining:
          snapshot.session.operationalConfig?.initialHearts ?? ADMIN_DEFAULT_CONFIG.initialHearts,
        metParticipantIds: [],
        encounterHistory: [],
        likedParticipantIds: [],
        likedByParticipantIds: [],
        popularityScore: 0,
        tier: "C",
        subTier: "LOW",
        score: 0,
        attractionScore: 0,
        engagementScore: 0,
        isVip: false,
        isHighValue: false,
        joinedAt: createdAt,
        lastActiveAt: createdAt
      };

      const audit = createAuditLog(
        "PROFILE_COMPLETED",
        participant.id,
        "CUSTOMER",
        `${participant.nickname} ?섏씠 泥댄겕?몄쓣 ?꾨즺?덉뒿?덈떎.`,
        { reservationId: participant.reservationId, tableId },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: [...snapshot.participants, participant],
        reservations: (snapshot.reservations ?? []).map((reservation) => {
          if (!linkedReservation || reservation.reservationId !== linkedReservation.reservationId) {
            return reservation;
          }
          return {
            ...reservation,
            status: "CHECKED_IN",
            reservationStatus: "CHECKED_IN",
            checkinStatus: "CHECKED_IN",
            checkinParticipantId: participant.id
          };
        }),
        seatingAssignments: [
          {
            id: createId("seat"),
            sessionId: snapshot.session.id,
            rotationRound: 0,
            participantId: participant.id,
            tableId,
            assignedAt: createdAt,
            assignmentSource: "INITIAL"
          },
          ...snapshot.seatingAssignments
        ],
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: createdAt }
      });

      return { snapshot: nextSnapshot, participantId: participant.id };
    }

    case "customer.updateProfile": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "profile-update"
      );
      ensureProfileFields({ ...command.profile, energyType: command.profile.energyType });
      const nickname = validateNicknameAvailability(
        snapshot.participants,
        command.profile.nickname,
        participant.id
      );
      const updatedAt = new Date().toISOString();
      const audit = createAuditLog(
        "PROFILE_UPDATED",
        participant.id,
        "CUSTOMER",
        "?꾨줈?꾩씠 ?낅뜲?댄듃?섏뿀?듬땲??",
        { updatedFields: Object.keys(command.profile) },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: updateParticipant(snapshot, participant.id, (currentParticipant) => ({
          ...touchParticipant(currentParticipant, updatedAt),
          ...command.profile,
          photoUrl: resolveProfilePhotoUrl(snapshot, command.profile.photoUrl, currentParticipant.gender),
          nickname
        })),
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt }
      });

      return { snapshot: nextSnapshot };
    }

    case "customer.setRound2Attendance": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "round2-attendance"
      );
      const updatedAt = new Date().toISOString();
      const audit = createAuditLog(
        "PROFILE_UPDATED",
        participant.id,
        "CUSTOMER",
        `2李?李몄꽍 ?щ?瑜?${command.attendance}濡?蹂寃쏀뻽?듬땲??`,
        { attendance: command.attendance },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: updateParticipant(snapshot, participant.id, (currentParticipant) => ({
          ...touchParticipant(currentParticipant, updatedAt),
          round2Attendance: command.attendance
        })),
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt }
      });

      return { snapshot: nextSnapshot };
    }

    case "customer.sendHeart": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "send-heart"
      );
      requireSessionParticipant(snapshot, command.recipientId);
      const createdAt = new Date().toISOString();
      const { snapshot: heartSnapshot, sender, recipient } = applyHeartSend(
        snapshot,
        participant.id,
        command.recipientId,
        createdAt
      );
      const audit = createAuditLog(
        "HEART_SENT",
        sender.id,
        "CUSTOMER",
        `${recipient.nickname} ?섏뿉寃??섑듃瑜?蹂대깉?듬땲??`,
        { recipientId: recipient.id, heartsRemaining: Math.max(0, sender.heartsRemaining - 1) },
        snapshot.session.id
      );

      const shouldLogHighFrequency = countRecentAuditActions(
        snapshot,
        sender.id,
        "HEART_SENT"
      ) + 1 >= 3;
      const incidents = [...(snapshot.incidents ?? [])];
      if (shouldLogHighFrequency) {
        const incident = createIncident(snapshot, {
          type: "HIGH_FREQUENCY_ACTION",
          reporterId: sender.id,
          targetId: recipient.id,
          message: "High-frequency heart activity detected.",
          timestamp: createdAt
        });
        logHighFrequencyAction({
          participantId: sender.id,
          recipientId: recipient.id,
          sessionId: snapshot.session.id,
          action: "HEART_SENT"
        });
        if (!hasRecentMatchingIncident(snapshot, incident)) {
          incidents.unshift(incident);
        }
      }

      const nextSnapshot = await persistSnapshot({
        ...heartSnapshot,
        incidents,
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...heartSnapshot.session, updatedAt: createdAt }
      });

      return { snapshot: nextSnapshot };
    }

    case "customer.submitReport": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "submit-report"
      );
      const targetParticipant = requireSessionParticipant(snapshot, command.targetId);

      if (participant.id === targetParticipant.id) {
        throw new Error("본인에게는 신고를 제출할 수 없습니다.");
      }

      if (command.details.trim().length < 8) {
        throw new Error("?좉퀬 ?댁슜? 8???댁긽 ?낅젰?섏꽭??");
      }

      const audit = createAuditLog(
        "REPORT_SUBMITTED",
        participant.id,
        "CUSTOMER",
        "?댁쁺 ?좉퀬媛 ?묒닔?섏뿀?듬땲??",
        { targetId: targetParticipant.id, reason: command.reason },
        snapshot.session.id
      );
      const incident = createIncident(snapshot, {
        type: "REPORT_SUBMITTED",
        reporterId: participant.id,
        targetId: targetParticipant.id,
        message: `Report submitted: ${command.reason}`,
        timestamp: audit.createdAt
      });

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        reports: [
          {
            id: createId("report"),
            sessionId: snapshot.session.id,
            reporterId: participant.id,
            targetId: targetParticipant.id,
            reason: command.reason,
            details: command.details.trim(),
            createdAt: audit.createdAt,
            resolvedAt: null,
            status: "PENDING"
          },
          ...snapshot.reports
        ],
        incidents: [incident, ...(snapshot.incidents ?? [])],
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: audit.createdAt }
      });

      return { snapshot: nextSnapshot };
    }

    case "customer.respondContent": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "respond-content"
      );
      const liveContent = ensureContentVisibility(snapshot, participant);

      if (liveContent.id !== command.contentId) {
        throw new Error("?대? 援먯껜??肄섑뀗痢좎엯?덈떎.");
      }

      if (
        snapshot.contentResponses.some(
          (response) =>
            response.contentId === liveContent.id && response.participantId === participant.id
        )
      ) {
        throw new Error("?대? ?묐떟??肄섑뀗痢좎엯?덈떎.");
      }

      const createdAt = new Date().toISOString();
      const responses = [
        createContentResponse(
          snapshot,
          participant,
          liveContent.id,
          command.value.trim(),
          command.recipientId ?? null
        ),
        ...snapshot.contentResponses
      ];
      const anonymousMessages: AnonymousMessageRecord[] = [...snapshot.anonymousMessages];

      if (liveContent.kind === "anonymous") {
        throw new Error("익명 메시지는 전용 API를 사용하세요.");
      }

      const audit = createAuditLog(
        "CONTENT_RESPONDED",
        participant.id,
        "CUSTOMER",
        `${liveContent.title} ?묐떟????λ릺?덉뒿?덈떎.`,
        { contentId: liveContent.id, kind: liveContent.kind },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: updateParticipant(snapshot, participant.id, (current) =>
          touchParticipant(current, createdAt)
        ),
        contentResponses: responses,
        anonymousMessages,
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: createdAt }
      });

      return { snapshot: nextSnapshot };
    }

    case "customer.submitAnonymousMessage": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "submit-anonymous-message"
      );
      if (participant.sessionId !== command.sessionId) {
        throw new Error("세션 정보가 일치하지 않습니다.");
      }
      const liveContent = ensureContentVisibility(snapshot, participant);
      if (liveContent.kind !== "anonymous" || liveContent.id !== command.contentBlockId) {
        throw new Error("현재 메시지 작성이 가능한 콘텐츠가 아닙니다.");
      }
      const trimmedMessage = command.message.trim();
      if (!trimmedMessage) {
        throw new Error("메시지를 입력해 주세요.");
      }
      if (trimmedMessage.length > 120) {
        throw new Error("메시지는 120자 이하로 입력해 주세요.");
      }
      const trimmedHint = command.receiverHint?.trim() ?? "";
      if (trimmedHint.length > 40) {
        throw new Error("특징은 40자 이하로 입력해 주세요.");
      }
      const bannedWords = ["씨발", "병신", "좆", "fuck", "shit"];
      const normalized = trimmedMessage.toLowerCase();
      if (bannedWords.some((word) => normalized.includes(word))) {
        throw new Error("표현을 순화해 다시 입력해 주세요.");
      }
      const senderMessageCount = snapshot.anonymousMessages.filter(
        (message) =>
          message.sessionId === command.sessionId && message.senderParticipantId === participant.id
      ).length;
      if (senderMessageCount >= 2) {
        throw new Error("메시지는 최대 2개까지 작성할 수 있습니다.");
      }
      if (command.receiverParticipantId) {
        if (command.receiverParticipantId === participant.id) {
          throw new Error("본인에게는 보낼 수 없습니다.");
        }
        const receiver = requireSessionParticipant(snapshot, command.receiverParticipantId);
        if (receiver.sessionId !== command.sessionId || receiver.gender === participant.gender) {
          throw new Error("받는 사람 조건이 유효하지 않습니다.");
        }
        const receiverStatus = snapshot.participantStatusMap?.[receiver.id] ?? "ACTIVE";
        if (receiverStatus !== "ACTIVE") {
          throw new Error("현재 선택할 수 없는 참가자입니다.");
        }
      }
      const now = new Date().toISOString();
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        anonymousMessages: [
          {
            id: createId("anonymous"),
            sessionId: command.sessionId,
            contentBlockId: command.contentBlockId,
            senderParticipantId: participant.id,
            receiverParticipantId: command.receiverParticipantId ?? null,
            receiverHint: trimmedHint || null,
            message: trimmedMessage,
            revealSender: command.revealSender,
            isSelected: false,
            selectedAt: null,
            moderationStatus: "PENDING",
            createdAt: now,
            updatedAt: now
          },
          ...snapshot.anonymousMessages
        ],
        participants: updateParticipant(snapshot, participant.id, (current) => touchParticipant(current, now)),
        session: { ...snapshot.session, updatedAt: now }
      });
      return { snapshot: nextSnapshot };
    }

    case "customer.submitTablePick": {
      const picker = await requireCustomerParticipant(snapshot, command.participantId, "submit-table-pick");
      if (picker.sessionId !== command.sessionId) {
        throw new Error("세션 정보가 일치하지 않습니다.");
      }
      if (command.rotationIndex !== 0 && command.rotationIndex !== 1) {
        throw new Error("유효하지 않은 회차입니다.");
      }
      const window = getTablePickWindow(snapshot, command.rotationIndex);
      if (!window || window.status !== "OPEN") {
        throw new Error("마감되었습니다.");
      }
      if (command.wantToKnowParticipantId === command.funnyParticipantId) {
        throw new Error("같은 사람을 중복 선택할 수 없습니다.");
      }
      const targetIds = [command.wantToKnowParticipantId, command.funnyParticipantId];
      const statusMap = snapshot.participantStatusMap ?? {};
      for (const targetId of targetIds) {
        if (targetId === picker.id) {
          throw new Error("본인을 선택할 수 없습니다.");
        }
        const target = requireSessionParticipant(snapshot, targetId);
        if (target.sessionId !== command.sessionId || target.tableId !== picker.tableId) {
          throw new Error("같은 테이블 참가자만 선택할 수 있습니다.");
        }
        if (target.gender === picker.gender) {
          throw new Error("이성 참가자만 선택할 수 있습니다.");
        }
        const status = statusMap[target.id] ?? "ACTIVE";
        if (!["ACTIVE", "IDLE"].includes(status) || !isEligibleForInteraction(target)) {
          throw new Error("선택 가능한 참가자가 없습니다.");
        }
      }
      const now = new Date().toISOString();
      const remained = (snapshot.tableImpressionPicks ?? []).filter(
        (pick) =>
          !(
            pick.sessionId === command.sessionId &&
            pick.pickerParticipantId === picker.id &&
            pick.rotationIndex === command.rotationIndex
          )
      );
      const nextPicks = [
        {
          id: createId("table_pick"),
          sessionId: command.sessionId,
          contentBlockId: command.contentBlockId ?? snapshot.liveContent?.id ?? null,
          pickerParticipantId: picker.id,
          targetParticipantId: command.wantToKnowParticipantId,
          tableId: picker.tableId,
          rotationIndex: command.rotationIndex,
          pickType: "WANT_TO_KNOW" as const,
          createdAt: now,
          updatedAt: now
        },
        {
          id: createId("table_pick"),
          sessionId: command.sessionId,
          contentBlockId: command.contentBlockId ?? snapshot.liveContent?.id ?? null,
          pickerParticipantId: picker.id,
          targetParticipantId: command.funnyParticipantId,
          tableId: picker.tableId,
          rotationIndex: command.rotationIndex,
          pickType: "FUNNY" as const,
          createdAt: now,
          updatedAt: now
        },
        ...remained
      ];
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        tableImpressionPicks: nextPicks,
        session: { ...snapshot.session, updatedAt: now }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.updateAnonymousMessageSelection": {
      if (typeof command.expectedVersion === "number" && command.expectedVersion !== snapshot.version) {
        throw new Error("세션이 갱신되었습니다. 다시 시도해 주세요.");
      }
      const index = snapshot.anonymousMessages.findIndex((message) => message.id === command.messageId);
      if (index < 0) {
        throw new Error("메시지를 찾을 수 없습니다.");
      }
      const now = new Date().toISOString();
      const updated = [...snapshot.anonymousMessages];
      const current = updated[index];
      updated[index] = {
        ...current,
        isSelected: command.isSelected,
        selectedAt: command.isSelected ? now : null,
        updatedAt: now
      };
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        anonymousMessages: updated,
        session: { ...snapshot.session, updatedAt: now }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.openTablePickWindow": {
      const now = new Date().toISOString();
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        tablePickWindows: upsertTablePickWindow(snapshot, command.rotationIndex, "OPEN", now),
        session: { ...snapshot.session, updatedAt: now }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.closeTablePickWindow": {
      const now = new Date().toISOString();
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        tablePickWindows: upsertTablePickWindow(snapshot, command.rotationIndex, "CLOSED", now),
        session: { ...snapshot.session, updatedAt: now }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.regenerateTableQr": {
      if (command.tableId < 1 || command.tableId > snapshot.session.tableCount) {
        throw new Error("유효하지 않은 테이블입니다.");
      }
      const now = new Date().toISOString();
      const revoked = (snapshot.tableQrCodes ?? []).map((item) =>
        item.tableId === command.tableId &&
        item.sessionId === snapshot.session.id &&
        item.status === "ACTIVE"
          ? { ...item, status: "REVOKED" as const, revokedAt: now }
          : item
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        tableQrCodes: [
          {
            id: createId("table_qr"),
            branchId: snapshot.session.branchId,
            sessionId: snapshot.session.id,
            tableId: command.tableId,
            code: createCheckinCode(),
            status: "ACTIVE",
            createdAt: now,
            revokedAt: null
          },
          ...revoked
        ],
        session: { ...snapshot.session, updatedAt: now }
      });
      return { snapshot: nextSnapshot };
    }

    case "customer.ackRotation": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "ack-rotation"
      );
      if (!snapshot.rotationInstruction) {
        throw new Error("吏꾪뻾 以묒씤 ?대룞 吏?쒓? ?놁뒿?덈떎.");
      }

      if (
        !snapshot.rotationInstruction.assignments.some(
          (assignment) => assignment.participantId === participant.id
        )
      ) {
        throw new Error("현재 참가자에게 할당된 이동 지시가 없습니다.");
      }

      const acknowledgedAt = new Date().toISOString();
      const rotationInstruction = {
        ...snapshot.rotationInstruction,
        assignments: snapshot.rotationInstruction.assignments.map((assignment) =>
          assignment.participantId === participant.id
            ? { ...assignment, acknowledgedAt }
            : assignment
        )
      };
      const audit = createAuditLog(
        "ROTATION_ACKNOWLEDGED",
        participant.id,
        "CUSTOMER",
        "?뚯씠釉??대룞 吏?쒕? ?뺤씤?덉뒿?덈떎.",
        { rotationRound: rotationInstruction.rotationRound },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: updateParticipant(snapshot, participant.id, (currentParticipant) =>
          touchParticipant(currentParticipant, acknowledgedAt)
        ),
        rotationInstruction,
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: acknowledgedAt }
      });
      return { snapshot: nextSnapshot };
    }

    case "customer.submitContactExchangeConsent": {
      const participant = await requireCustomerParticipant(
        snapshot,
        command.participantId,
        "contact-exchange-consent"
      );
      const targetParticipant = requireSessionParticipant(snapshot, command.targetParticipantId);

      if (participant.id === targetParticipant.id) {
        throw new Error("본인과는 연락처 교환을 요청할 수 없습니다.");
      }

      if (!snapshot.session.revealSenders || snapshot.session.phase !== "ROUND_2") {
        throw new Error("하트 공개 이후에만 연락처 교환을 요청할 수 있습니다.");
      }

      if (!isMutualHeartMatch(snapshot, participant.id, targetParticipant.id)) {
        throw new Error("상호 하트가 성립된 참가자와만 연락처 교환이 가능합니다.");
      }

      const blockedIds = new Set((snapshot.blacklist ?? []).map((entry) => entry.participantId));
      if (blockedIds.has(participant.id) || blockedIds.has(targetParticipant.id)) {
        throw new Error("차단된 참가자와는 연락처 교환을 진행할 수 없습니다.");
      }

      const [participantAId, participantBId] = buildContactExchangePair(
        participant.id,
        targetParticipant.id
      );
      const existing = findContactExchange(snapshot, participantAId, participantBId);
      if (existing?.status === "COMPLETED" && command.consent === false) {
        throw new Error("이미 완료된 연락처 교환은 취소할 수 없습니다.");
      }

      const now = new Date().toISOString();
      const normalizedMethods = normalizeContactMethods(command.methods);

      if (command.consent && !hasAtLeastOneContactMethod(normalizedMethods)) {
        throw new Error("연락수단(전화/카카오/인스타) 중 최소 1개를 입력해야 합니다.");
      }

      const participantIsA = participant.id === participantAId;
      const base: ContactExchangeRecord =
        existing ?? {
          id: createId("contact_exchange"),
          sessionId: snapshot.session.id,
          participantAId,
          participantBId,
          participantAConsented: false,
          participantBConsented: false,
          participantAMethods: null,
          participantBMethods: null,
          status: "PENDING",
          requestedAt: now,
          completedAt: null
        };

      const updated: ContactExchangeRecord = {
        ...base,
        participantAConsented: participantIsA ? command.consent : base.participantAConsented,
        participantBConsented: participantIsA ? base.participantBConsented : command.consent,
        participantAMethods: participantIsA
          ? command.consent
            ? normalizedMethods
            : null
          : base.participantAMethods,
        participantBMethods: participantIsA
          ? base.participantBMethods
          : command.consent
          ? normalizedMethods
          : null
      };

      const bothConsented = updated.participantAConsented && updated.participantBConsented;
      const status = bothConsented ? "COMPLETED" : "PENDING";
      const finalized: ContactExchangeRecord = {
        ...updated,
        status,
        completedAt: bothConsented ? now : null
      };

      const nextExchanges = [
        finalized,
        ...(snapshot.contactExchanges ?? []).filter((item) => {
          if (item.id === finalized.id) {
            return false;
          }
          const samePair =
            (item.participantAId === participantAId && item.participantBId === participantBId) ||
            (item.participantAId === participantBId && item.participantBId === participantAId);
          return !samePair;
        })
      ];

      const audit = createAuditLog(
        "CONTACT_EXCHANGE_UPDATED",
        participant.id,
        "CUSTOMER",
        "연락처 교환 동의 상태를 변경했습니다.",
        {
          targetParticipantId: targetParticipant.id,
          consent: command.consent,
          status: finalized.status
        },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        contactExchanges: nextExchanges,
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: now }
      });

      return { snapshot: nextSnapshot };
    }

    case "admin.setSessionState": {
      const fromState = snapshot.session.phase;
      const toState = command.state;

      if (snapshot.session.lifecycleStatus === "DISABLED") {
        throw new Error("비활성 세션입니다.");
      }

      if (fromState === toState) {
        throw new Error("이미 같은 상태입니다.");
      }

      const allowedTargets = OPERATIONAL_STATE_TRANSITIONS[fromState] ?? [];
      if (!allowedTargets.includes(toState)) {
        throw new Error("허용되지 않은 상태 전환입니다.");
      }

      const transitionedAt = new Date().toISOString();
      const audit = createAuditLog(
        "SESSION_STATE_CHANGED",
        "admin",
        "ADMIN",
        `${fromState}에서 ${toState}로 세션 상태를 변경했습니다.`,
        {
          changed_by: "admin",
          from_state: fromState,
          to_state: toState,
          timestamp: transitionedAt
        },
        snapshot.session.id
      );

      const nextTablePickWindows =
        toState === "ROUND_1"
          ? upsertTablePickWindow(snapshot, 0, "OPEN", transitionedAt)
          : (snapshot.tablePickWindows ?? []);
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        tablePickWindows: nextTablePickWindows,
        session: { ...snapshot.session, phase: toState, updatedAt: transitionedAt },
        auditLogs: [audit, ...snapshot.auditLogs]
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.toggleReveal": {
      const audit = createAuditLog(
        "REVEAL_TOGGLED",
        "admin",
        "ADMIN",
        command.value ? "蹂대궦 ?щ엺 怨듦컻瑜??댁뿀?듬땲??" : "蹂대궦 ?щ엺 怨듦컻瑜??レ븯?듬땲??",
        { revealSenders: command.value },
        snapshot.session.id
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        session: {
          ...snapshot.session,
          revealSenders: command.value,
          revealTriggeredAt: command.value ? audit.createdAt : null,
          updatedAt: audit.createdAt
        },
        auditLogs: [audit, ...snapshot.auditLogs]
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.triggerReveal": {
      if (snapshot.session.phase !== "ROUND_2") {
        throw new Error("하트 공개는 ROUND_2에서만 가능합니다.");
      }
      if (snapshot.session.revealSenders) {
        throw new Error("이미 하트 공개가 완료되었습니다.");
      }

      const revealedAt = new Date().toISOString();
      const audit = createAuditLog(
        "REVEAL_TOGGLED",
        "admin",
        "ADMIN",
        "ROUND_2 하트 공개를 시작했습니다.",
        {
          changed_by: "admin",
          timestamp: revealedAt,
          phase: snapshot.session.phase
        },
        snapshot.session.id
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        session: {
          ...snapshot.session,
          revealSenders: true,
          revealTriggeredAt: revealedAt,
          updatedAt: revealedAt
        },
        auditLogs: [audit, ...snapshot.auditLogs]
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.generateRotationPreview": {
      return {
        snapshot,
        rotationPreview: generateRotationPreview(snapshot)
      };
    }

    case "admin.importReservations": {
      const importedAt = new Date().toISOString();
      const existingRows = snapshot.reservations ?? [];
      const existingKeys = new Set(existingRows.map(buildReservationImportKey));
      const mergedRows = [...existingRows];
      let accepted = 0;
      let duplicated = 0;

      for (const row of command.rows) {
        const normalizedPhone = normalizePhoneNumber(row.phone) ?? row.normalizedPhone ?? null;
        const normalizedRow: ReservationBridgeRecord = {
          ...row,
          source: row.source ?? "CSV",
          sessionId: snapshot.session.id,
          branchId: row.branchId || snapshot.session.branchId,
          eventId: row.eventId || snapshot.session.eventId,
          normalizedPhone,
          status: normalizeReservationStatus(row.status),
          checkinStatus: row.checkinStatus ?? "PENDING",
          importedAt: row.importedAt ?? importedAt
        };
        const key = buildReservationImportKey(normalizedRow);
        if (existingKeys.has(key)) {
          duplicated += 1;
          continue;
        }
        existingKeys.add(key);
        mergedRows.push(normalizedRow);
        accepted += 1;
      }

      const audit = createAuditLog(
        "RESERVATION_IMPORT_APPLIED",
        "admin",
        "ADMIN",
        "수동 예약 데이터를 세션에 적용했습니다.",
        { accepted, duplicated, total: command.rows.length },
        snapshot.session.id
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        reservations: mergedRows,
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: importedAt }
      });

      return { snapshot: nextSnapshot };
    }

    case "admin.updateSessionConfig": {
      const nextConfig = command.config;
      const updatedAt = new Date().toISOString();
      const nextTableCount = nextConfig.tableCount ?? snapshot.session.tableCount;
      const nextTableCapacity = nextConfig.tableCapacity ?? snapshot.session.tableCapacity;
      const currentOperationalConfig = snapshot.session.operationalConfig ?? {
        initialHearts: ADMIN_DEFAULT_CONFIG.initialHearts,
        rotationDeadlineMinutes: ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes,
        presenceGoneThresholdMinutes: ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes,
        defaultProfileImagePaths: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths
      };
      const nextInitialHearts = nextConfig.initialHearts ?? currentOperationalConfig.initialHearts;
      const nextRotationDeadlineMinutes =
        nextConfig.rotationDeadlineMinutes ?? currentOperationalConfig.rotationDeadlineMinutes;
      const nextPresenceGoneThresholdMinutes =
        nextConfig.presenceGoneThresholdMinutes ?? currentOperationalConfig.presenceGoneThresholdMinutes;

      if (!Number.isInteger(nextTableCount) || nextTableCount < 1) {
        throw new Error("테이블 수는 1 이상 정수여야 합니다.");
      }
      if (!Number.isInteger(nextTableCapacity) || nextTableCapacity < 1) {
        throw new Error("테이블 정원은 1 이상 정수여야 합니다.");
      }
      if (!Number.isInteger(nextInitialHearts) || nextInitialHearts < 0) {
        throw new Error("기본 하트 수는 0 이상 정수여야 합니다.");
      }
      if (!Number.isInteger(nextRotationDeadlineMinutes) || nextRotationDeadlineMinutes < 1) {
        throw new Error("회차 이동 제한 시간은 1분 이상 정수여야 합니다.");
      }
      if (!Number.isInteger(nextPresenceGoneThresholdMinutes) || nextPresenceGoneThresholdMinutes < 1) {
        throw new Error("장시간 미활동 기준은 1분 이상 정수여야 합니다.");
      }

      const maxUsedTableId = snapshot.participants.reduce(
        (max, participant) => Math.max(max, participant.tableId),
        1
      );
      if (nextTableCount < maxUsedTableId) {
        throw new Error("현재 참가자가 배치된 테이블보다 작게 설정할 수 없습니다.");
      }

      const tableOccupancy = new Map<number, number>();
      for (const participant of snapshot.participants) {
        tableOccupancy.set(participant.tableId, (tableOccupancy.get(participant.tableId) ?? 0) + 1);
      }
      const exceedsCapacity = Array.from(tableOccupancy.values()).some(
        (occupancy) => occupancy > nextTableCapacity
      );
      if (exceedsCapacity) {
        throw new Error("현재 테이블 인원보다 작은 정원으로 설정할 수 없습니다.");
      }

      const nextSession = {
        ...snapshot.session,
        branchName: nextConfig.branchName?.trim() || snapshot.session.branchName,
        venueName: nextConfig.venueName?.trim() || snapshot.session.venueName,
        venueAddress: nextConfig.venueAddress?.trim() || snapshot.session.venueAddress,
        sessionDateLabel: nextConfig.sessionDateLabel?.trim() || snapshot.session.sessionDateLabel,
        sessionTimeLabel: nextConfig.sessionTimeLabel?.trim() || snapshot.session.sessionTimeLabel,
        attendanceLabel: nextConfig.attendanceLabel?.trim() || snapshot.session.attendanceLabel,
        attendanceHint: nextConfig.attendanceHint?.trim() || snapshot.session.attendanceHint,
        tableCount: nextTableCount,
        tableCapacity: nextTableCapacity,
        operationalConfig: {
          initialHearts: nextInitialHearts,
          rotationDeadlineMinutes: nextRotationDeadlineMinutes,
          presenceGoneThresholdMinutes: nextPresenceGoneThresholdMinutes,
          defaultProfileImagePaths: {
            male:
              nextConfig.defaultProfileImageMale?.trim() ||
              currentOperationalConfig.defaultProfileImagePaths.male,
            female:
              nextConfig.defaultProfileImageFemale?.trim() ||
              currentOperationalConfig.defaultProfileImagePaths.female,
            unknown:
              nextConfig.defaultProfileImageUnknown?.trim() ||
              currentOperationalConfig.defaultProfileImagePaths.unknown
          }
        },
        updatedAt
      };

      const audit = createAuditLog(
        "SESSION_CONFIG_UPDATED",
        "admin",
        "ADMIN",
        "운영 세션 설정을 수정했습니다.",
        {
          tableCount: nextTableCount,
          tableCapacity: nextTableCapacity,
          initialHearts: nextInitialHearts,
          rotationDeadlineMinutes: nextRotationDeadlineMinutes,
          presenceGoneThresholdMinutes: nextPresenceGoneThresholdMinutes
        },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        session: nextSession,
        auditLogs: [audit, ...snapshot.auditLogs]
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.applyRotation": {
      if (command.preview.baseVersion !== snapshot.version) {
        throw new Error("미리보기가 오래되었습니다.");
      }

      const rotated = applyRotationPreview(snapshot, command.preview);
      const nextTablePickWindows = [...(snapshot.tablePickWindows ?? [])];
      const appliedRound = command.preview.rotationRound;
      const now = new Date().toISOString();
      if (appliedRound === 1) {
        const closed = upsertTablePickWindow(
          { ...snapshot, tablePickWindows: nextTablePickWindows },
          0,
          "CLOSED",
          now
        );
        const opened = upsertTablePickWindow(
          { ...snapshot, tablePickWindows: closed },
          1,
          "OPEN",
          now
        );
        nextTablePickWindows.splice(0, nextTablePickWindows.length, ...opened);
      } else if (appliedRound >= 2) {
        const closed = upsertTablePickWindow(
          { ...snapshot, tablePickWindows: nextTablePickWindows },
          1,
          "CLOSED",
          now
        );
        nextTablePickWindows.splice(0, nextTablePickWindows.length, ...closed);
      }

      const nextSnapshot = await persistSnapshot({
        ...rotated,
        liveContent: null,
        rotationInstruction: buildRotationInstruction(snapshot, rotated, command.preview),
        activeContentIds: snapshot.activeContentIds,
        contentResponses: snapshot.contentResponses,
        anonymousMessages: snapshot.anonymousMessages,
        tableImpressionPicks: snapshot.tableImpressionPicks ?? [],
        tablePickWindows: nextTablePickWindows,
        announcements: snapshot.announcements
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.activateContent": {
      const { liveContent, template } = createLiveContent(
        snapshot,
        command.templateId,
        command.targetTableId,
        command.message
      );
      const audit = createAuditLog(
        "CONTENT_ACTIVATED",
        "admin",
        "ADMIN",
        `${template.title} 肄섑뀗痢좊? ?쒖옉?덉뒿?덈떎.`,
        { templateId: template.id, targetTableId: command.targetTableId },
        snapshot.session.id
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        liveContent,
        activeContentIds: Array.from(new Set([template.id, ...snapshot.activeContentIds])),
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: audit.createdAt }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.clearContent": {
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        liveContent: snapshot.liveContent ? { ...snapshot.liveContent, status: "COMPLETED" } : null,
        session: { ...snapshot.session, updatedAt: new Date().toISOString() }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.publishAnnouncement": {
      const trimmedMessage = command.message.trim();
      if (!trimmedMessage) {
        throw new Error("怨듭? 硫붿떆吏瑜??낅젰?섏꽭??");
      }

      const { liveContent } = createLiveContent(
        snapshot,
        MINGLE_CONSTANTS.announcementTemplateId,
        null,
        trimmedMessage
      );
      const createdAt = new Date().toISOString();
      const audit = createAuditLog(
        "ANNOUNCEMENT_PUBLISHED",
        "admin",
        "ADMIN",
        "?댁쁺 怨듭?瑜?諛쒗뻾?덉뒿?덈떎.",
        { message: trimmedMessage },
        snapshot.session.id
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        liveContent,
        announcements: [
          {
            id: createId("announcement"),
            message: trimmedMessage,
            createdAt,
            authorRole: "ADMIN"
          },
          ...snapshot.announcements
        ],
        activeContentIds: Array.from(
          new Set([MINGLE_CONSTANTS.announcementTemplateId, ...snapshot.activeContentIds])
        ),
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: createdAt }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.setBlacklistStatus": {
      const participant = requireSessionParticipant(snapshot, command.participantId);
      const existingEntry = getBlacklistEntry(snapshot, participant.id);
      const updatedAt = new Date().toISOString();

      if (command.blocked) {
        if (existingEntry) {
          throw new Error("이미 차단된 참가자입니다.");
        }
        const reason = command.reason?.trim() || "운영 정책상 제한";
        const entry: BlacklistRecord =
          existingEntry ?? {
            id: createId("blacklist"),
            sessionId: snapshot.session.id,
            branchId: snapshot.session.branchId,
            participantId: participant.id,
            reason,
            createdAt: updatedAt
          };

        const audit = createAuditLog(
          "BLACKLIST_UPDATED",
          "admin",
          "ADMIN",
          `${participant.nickname} 참가자를 차단했습니다.`,
          {
            participantId: participant.id,
            reason
          },
          snapshot.session.id
        );

        const blockedContactExchanges = (snapshot.contactExchanges ?? []).map((exchange) => {
          if (
            exchange.participantAId !== participant.id &&
            exchange.participantBId !== participant.id
          ) {
            return exchange;
          }
          return {
            ...exchange,
            status: "BLOCKED" as const,
            completedAt: null
          };
        });
        const blockedCount = blockedContactExchanges.filter((exchange, index) => {
          const previous = (snapshot.contactExchanges ?? [])[index];
          return previous && previous.status !== exchange.status;
        }).length;

        const contactAudit =
          blockedCount > 0
            ? createAuditLog(
                "CONTACT_EXCHANGE_UPDATED",
                "admin",
                "ADMIN",
                `${participant.nickname} 관련 연락처 교환을 운영 제한으로 차단했습니다.`,
                { participantId: participant.id, blockedCount },
                snapshot.session.id
              )
            : null;

        const nextSnapshot = await persistSnapshot({
          ...snapshot,
          blacklist: [
            {
              ...entry,
              reason
            },
            ...(snapshot.blacklist ?? []).filter((item) => item.participantId !== participant.id)
          ],
          contactExchanges: blockedContactExchanges,
          auditLogs: contactAudit ? [contactAudit, audit, ...snapshot.auditLogs] : [audit, ...snapshot.auditLogs],
          session: { ...snapshot.session, updatedAt }
        });
        return { snapshot: nextSnapshot };
      }

      const audit = createAuditLog(
        "BLACKLIST_UPDATED",
        "admin",
        "ADMIN",
        `${participant.nickname} 참가자의 차단을 해제했습니다.`,
        {
          participantId: participant.id
        },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        blacklist: (snapshot.blacklist ?? []).filter((item) => item.participantId !== participant.id),
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.moveParticipant": {
      const participant = requireSessionParticipant(snapshot, command.participantId);

      if (command.toTableId < 1 || command.toTableId > snapshot.session.tableCount) {
        throw new Error("유효하지 않은 테이블입니다.");
      }

      if (participant.tableId === command.toTableId) {
        throw new Error("이미 해당 테이블에 있습니다.");
      }

      const targetOccupancy = snapshot.participants.filter(
        (p) => p.tableId === command.toTableId
      ).length;
      if (targetOccupancy >= snapshot.session.tableCapacity) {
        throw new Error(`대상 테이블이 최대 인원(${snapshot.session.tableCapacity}명)을 초과했습니다.`);
      }

      const fromTableId = participant.tableId;
      const movedAt = new Date().toISOString();

      const audit = createAuditLog(
        "PARTICIPANT_MOVED",
        "admin",
        "ADMIN",
        `${participant.nickname} 님을 테이블 ${fromTableId}에서 테이블 ${command.toTableId}으로 이동했습니다.`,
        { participantId: participant.id, fromTableId, toTableId: command.toTableId },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: snapshot.participants.map((p) =>
          p.id === command.participantId ? { ...p, tableId: command.toTableId } : p
        ),
        seatingAssignments: [
          {
            id: createId("seat"),
            sessionId: snapshot.session.id,
            rotationRound: 0,
            participantId: command.participantId,
            tableId: command.toTableId,
            assignedAt: movedAt,
            assignmentSource: "ADMIN_MOVE"
          },
          ...snapshot.seatingAssignments
        ],
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: movedAt }
      });
      return { snapshot: nextSnapshot };
    }

    case "admin.createManualParticipant": {
      const nickname = validateNicknameAvailability(snapshot.participants, command.nickname);
      if (command.gender !== "M" && command.gender !== "F") {
        throw new Error("성별은 필수입니다.");
      }

      if (command.tableId < 1 || command.tableId > snapshot.session.tableCount) {
        throw new Error("유효하지 않은 테이블입니다.");
      }

      const targetOccupancy = snapshot.participants.filter(
        (participant) => participant.tableId === command.tableId
      ).length;
      if (targetOccupancy >= snapshot.session.tableCapacity) {
        throw new Error(`대상 테이블이 최대 인원(${snapshot.session.tableCapacity}명)을 초과했습니다.`);
      }

      const createdAt = new Date().toISOString();
      const participant: ParticipantRecord = {
        id: createId("viewer"),
        sessionId: snapshot.session.id,
        branchId: snapshot.session.branchId,
        reservationId: null,
        reservationExternalId: null,
        phone: null,
        nickname,
        gender: command.gender,
        ...MANUAL_PARTICIPANT_DEFAULTS,
        photoUrl: null,
        tableId: command.tableId,
        round2Attendance: "UNDECIDED",
        participantSessionState: "ACTIVE",
        presenceState: "CHECKED_IN",
        receivedHearts: 0,
        sentHearts: 0,
        profileViews: 0,
        heartsRemaining:
          snapshot.session.operationalConfig?.initialHearts ?? ADMIN_DEFAULT_CONFIG.initialHearts,
        metParticipantIds: [],
        encounterHistory: [],
        likedParticipantIds: [],
        likedByParticipantIds: [],
        popularityScore: 0,
        tier: "C",
        subTier: "LOW",
        score: 0,
        attractionScore: 0,
        engagementScore: 0,
        isVip: false,
        isHighValue: false,
        joinedAt: createdAt,
        lastActiveAt: null
      };

      const audit = createAuditLog(
        "MANUAL_PARTICIPANT_CREATED",
        "admin",
        "ADMIN",
        `${participant.nickname} 참가자를 수동으로 등록했습니다.`,
        { participantId: participant.id, tableId: participant.tableId },
        snapshot.session.id
      );

      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        participants: [...snapshot.participants, participant],
        seatingAssignments: [
          {
            id: createId("seat"),
            sessionId: snapshot.session.id,
            rotationRound: 0,
            participantId: participant.id,
            tableId: participant.tableId,
            assignedAt: createdAt,
            assignmentSource: "INITIAL"
          },
          ...snapshot.seatingAssignments
        ],
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: createdAt }
      });
      return { snapshot: nextSnapshot, participantId: participant.id };
    }

    case "admin.resolveReport": {
      const report = snapshot.reports.find((item) => item.id === command.reportId);
      if (!report) {
        throw new Error("?좉퀬 ?댁뿭??李얠쓣 ???놁뒿?덈떎.");
      }

      const resolvedAt = new Date().toISOString();
      const audit = createAuditLog(
        "REPORT_RESOLVED",
        "admin",
        "ADMIN",
        "?좉퀬瑜?泥섎━ ?꾨즺?덉뒿?덈떎.",
        { reportId: report.id },
        snapshot.session.id
      );
      const nextSnapshot = await persistSnapshot({
        ...snapshot,
        reports: snapshot.reports.map((item) =>
          item.id === report.id ? { ...item, status: "RESOLVED", resolvedAt } : item
        ),
        auditLogs: [audit, ...snapshot.auditLogs],
        session: { ...snapshot.session, updatedAt: resolvedAt }
      });
      return { snapshot: nextSnapshot };
    }
  }
}

