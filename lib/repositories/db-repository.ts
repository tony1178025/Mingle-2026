import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createId,
  createSeedSnapshot,
  deepClone,
  mapBlacklistToRow,
  mapIncidentToRow,
  mapParticipantToRow,
  mapSessionToRow
} from "../mingle.ts";
import { normalizeAuthoritySnapshot } from "./snapshot-normalizer.ts";
import type {
  AuthorityReadOptions,
  SessionAuthorityRepository
} from "./authority-types.ts";
import type {
  BlacklistRow,
  BranchRecord,
  BranchRow,
  IncidentRow,
  ManagedSessionRecord,
  ManagedSessionRow,
  ManagedSessionUpsertInput,
  ParticipantRow,
  SessionSnapshot
} from "../../types/mingle.ts";

export type HqProjection = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type BranchProjection = {
  id: string;
  hq_id: string;
  name: string;
  venue_name: string;
  venue_address: string;
  created_at: string;
  updated_at: string;
};

export type EventProjection = {
  id: string;
  hq_id: string;
  branch_id: string;
  name: string;
  status: "ACTIVE";
  created_at: string;
  updated_at: string;
};

export type SessionProjection = ReturnType<typeof mapSessionToRow> & {
  snapshot_json: SessionSnapshot;
  authority_backend: "FILE" | "DB";
};

export type ReservationProjection = {
  id: string;
  session_id: string;
  branch_id: string;
  reservation_external_id: string | null;
  participant_id: string | null;
  phone: string | null;
  status: "ACTIVE";
  updated_at: string;
};

export type DbAuthorityProjection = {
  snapshot: SessionSnapshot;
  hq: HqProjection;
  branch: BranchProjection;
  event: EventProjection;
  session: SessionProjection;
  participants: ParticipantRow[];
  reservations: ReservationProjection[];
  blacklist: BlacklistRow[];
  incidents: IncidentRow[];
};

function mapBranchRow(row: BranchRow): BranchRecord {
  return {
    id: row.id,
    hqId: row.hq_id,
    name: row.name,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    defaultMaxCapacity: row.default_max_capacity,
    defaultTableCount: row.default_table_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

function mapManagedSessionRow(row: ManagedSessionRow): ManagedSessionRecord {
  return {
    id: row.id,
    name: row.name,
    hqId: row.hq_id,
    branchId: row.branch_id,
    branchName: row.branch_name,
    eventId: row.event_id,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    sessionDateLabel: row.session_date_label,
    sessionTimeLabel: row.session_time_label,
    attendanceLabel: row.attendance_label,
    attendanceHint: row.attendance_hint,
    code: row.code,
    phase: row.phase,
    startedAt: row.started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tableCount: row.table_count,
    tableCapacity: row.table_capacity,
    maxCapacity: row.max_capacity,
    status: row.status,
    updatedBy: row.updated_by
  };
}

export interface DbAuthorityAdapter {
  readSnapshot(): Promise<SessionSnapshot | null>;
  readProjection(sessionId: string): Promise<DbAuthorityProjection | null>;
  writeProjection(projection: DbAuthorityProjection): Promise<void>;
  listBranches(): Promise<BranchRow[]>;
  getBranch(branchId: string): Promise<BranchRow | null>;
  upsertBranch(branchRow: BranchRow): Promise<BranchRow>;
  getEvent(eventId: string): Promise<EventProjection | null>;
  listSessionRows(): Promise<ManagedSessionRow[]>;
  getSessionRow(sessionId: string): Promise<ManagedSessionRow | null>;
  upsertSessionRow(sessionRow: ManagedSessionRow): Promise<ManagedSessionRow>;
}

type DbAuthorityRepositoryOptions = {
  adapter?: DbAuthorityAdapter;
  createSnapshot?: () => SessionSnapshot;
};

export interface DbAuthorityRepository extends SessionAuthorityRepository {
  kind: "db";
  getProjection(
    sessionId: string,
    options?: AuthorityReadOptions
  ): Promise<DbAuthorityProjection | null>;
  upsertExistingSessionSnapshot(snapshot: SessionSnapshot): Promise<SessionSnapshot>;
  listBranches(): Promise<BranchRecord[]>;
  getBranch(branchId: string): Promise<BranchRow | null>;
  saveBranch(branch: {
    id?: string;
    name: string;
    venueName: string;
    venueAddress: string;
    defaultMaxCapacity: number;
    defaultTableCount: number;
    isActive: boolean;
    updatedBy: string | null;
  }): Promise<BranchRecord>;
  listManagedSessions(branchId?: string | null): Promise<ManagedSessionRecord[]>;
  getSessionRow(sessionId: string): Promise<ManagedSessionRow | null>;
  createManagedSession(
    input: ManagedSessionUpsertInput & { updatedBy: string | null }
  ): Promise<ManagedSessionRecord>;
  updateManagedSession(
    sessionId: string,
    input: Partial<ManagedSessionUpsertInput> & { updatedBy: string | null }
  ): Promise<ManagedSessionRecord>;
}

export function buildDbAuthorityProjection(snapshot: SessionSnapshot): DbAuthorityProjection {
  const normalizedSnapshot = normalizeAuthoritySnapshot(snapshot);
  const now = normalizedSnapshot.session.updatedAt;
  const reservations = new Map<string, ReservationProjection>();

  for (const participant of normalizedSnapshot.participants) {
    const reservationKey =
      participant.reservationExternalId ??
      participant.reservationId ??
      `${normalizedSnapshot.session.id}:${participant.id}`;

    if (!reservations.has(reservationKey)) {
      reservations.set(reservationKey, {
        id: reservationKey,
        session_id: normalizedSnapshot.session.id,
        branch_id: normalizedSnapshot.session.branchId,
        reservation_external_id: participant.reservationExternalId ?? null,
        participant_id: participant.id,
        phone: participant.phone ?? null,
        status: "ACTIVE",
        updated_at: now
      });
    }
  }

  return {
    snapshot: normalizedSnapshot,
    hq: {
      id: normalizedSnapshot.session.hqId,
      name: "Mingle HQ",
      created_at: normalizedSnapshot.session.startedAt,
      updated_at: now
    },
    branch: {
      id: normalizedSnapshot.session.branchId,
      hq_id: normalizedSnapshot.session.hqId,
      name: normalizedSnapshot.session.branchName,
      venue_name: normalizedSnapshot.session.venueName,
      venue_address: normalizedSnapshot.session.venueAddress,
      created_at: normalizedSnapshot.session.startedAt,
      updated_at: now
    },
    event: {
      id: normalizedSnapshot.session.eventId,
      hq_id: normalizedSnapshot.session.hqId,
      branch_id: normalizedSnapshot.session.branchId,
      name: normalizedSnapshot.session.name,
      status: "ACTIVE",
      created_at: normalizedSnapshot.session.startedAt,
      updated_at: now
    },
    session: {
      ...mapSessionToRow(normalizedSnapshot),
      snapshot_json: normalizedSnapshot,
      authority_backend: "DB"
    },
    participants: normalizedSnapshot.participants.map((participant) =>
      mapParticipantToRow(normalizedSnapshot.session.id, participant)
    ),
    reservations: [...reservations.values()],
    blacklist: (normalizedSnapshot.blacklist ?? []).map((entry) => mapBlacklistToRow(entry)),
    incidents: (normalizedSnapshot.incidents ?? []).map((entry) => mapIncidentToRow(entry))
  };
}

export function createMemoryDbAuthorityAdapter(): DbAuthorityAdapter & {
  getProjection(): DbAuthorityProjection | null;
} {
  const projections = new Map<string, DbAuthorityProjection>();
  const branchRows = new Map<string, BranchRow>();
  const eventRows = new Map<string, EventProjection>();
  const sessionRows = new Map<string, ManagedSessionRow>();

  function getCurrentProjection() {
    const activeSessionId = getActiveSessionSelector();
    if (activeSessionId && projections.has(activeSessionId)) {
      return deepClone(projections.get(activeSessionId)!);
    }

    const latest = [...projections.values()].sort((left, right) =>
      right.session.updated_at.localeCompare(left.session.updated_at)
    )[0];
    return latest ? deepClone(latest) : null;
  }

  function ensureBranchRow(projection: DbAuthorityProjection) {
    const existing = branchRows.get(projection.branch.id);
    const branchRow: BranchRow = {
      id: projection.branch.id,
      hq_id: projection.branch.hq_id,
      name: projection.branch.name,
      venue_name: projection.branch.venue_name,
      venue_address: projection.branch.venue_address,
      default_max_capacity:
        existing?.default_max_capacity ??
        projection.session.table_count * projection.session.table_capacity,
      default_table_count: existing?.default_table_count ?? projection.session.table_count,
      is_active: existing?.is_active ?? true,
      created_at: existing?.created_at ?? projection.branch.created_at,
      updated_at: projection.branch.updated_at,
      updated_by: existing?.updated_by ?? null
    };

    branchRows.set(branchRow.id, deepClone(branchRow));
  }

  function ensureManagedSessionRow(projection: DbAuthorityProjection) {
    const existing = sessionRows.get(projection.session.id);
    const sessionRow: ManagedSessionRow = {
      ...(existing ?? {
        status: "OPEN" as const,
        max_capacity: projection.session.table_count * projection.session.table_capacity,
        created_at: projection.session.started_at,
        updated_by: null
      }),
      ...projection.session
    };

    sessionRows.set(sessionRow.id, deepClone(sessionRow));
  }

  return {
    async readSnapshot() {
      const projection = getCurrentProjection();
      return projection ? deepClone(projection.snapshot) : null;
    },
    async readProjection(sessionId) {
      return projections.has(sessionId) ? deepClone(projections.get(sessionId)!) : null;
    },
    async writeProjection(nextProjection) {
      projections.set(nextProjection.session.id, deepClone(nextProjection));
      eventRows.set(nextProjection.event.id, deepClone(nextProjection.event));
      ensureBranchRow(nextProjection);
      ensureManagedSessionRow(nextProjection);
    },
    async listBranches() {
      return [...branchRows.values()].map((row) => deepClone(row));
    },
    async getBranch(branchId) {
      return branchRows.has(branchId) ? deepClone(branchRows.get(branchId)!) : null;
    },
    async upsertBranch(branchRow) {
      branchRows.set(branchRow.id, deepClone(branchRow));
      return deepClone(branchRow);
    },
    async getEvent(eventId) {
      return eventRows.has(eventId) ? deepClone(eventRows.get(eventId)!) : null;
    },
    async listSessionRows() {
      return [...sessionRows.values()].map((row) => deepClone(row));
    },
    async getSessionRow(sessionId) {
      return sessionRows.has(sessionId) ? deepClone(sessionRows.get(sessionId)!) : null;
    },
    async upsertSessionRow(sessionRow) {
      sessionRows.set(sessionRow.id, deepClone(sessionRow));
      const projection = projections.get(sessionRow.id);
      if (projection) {
        projections.set(sessionRow.id, {
          ...projection,
          session: {
            ...projection.session,
            updated_at: sessionRow.updated_at,
            snapshot_json: {
              ...projection.session.snapshot_json,
              session: {
                ...projection.session.snapshot_json.session,
                updatedAt: sessionRow.updated_at
              }
            }
          }
        });
      }
      return deepClone(sessionRow);
    },
    getProjection() {
      return getCurrentProjection();
    }
  };
}

function createSupabaseAuthorityClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("DB authority ?ъ슜?먮뒗 Supabase URL怨?service role key媛 ?꾩슂?⑸땲??");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function getActiveSessionSelector() {
  return process.env.MINGLE_ACTIVE_SESSION_ID?.trim() || null;
}

class SupabaseDbAuthorityAdapter implements DbAuthorityAdapter {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async readSnapshot() {
    const activeSessionId = getActiveSessionSelector();
    let query = this.client
      .from("sessions")
      .select("snapshot_json")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (activeSessionId) {
      query = this.client
        .from("sessions")
        .select("snapshot_json")
        .eq("id", activeSessionId)
        .limit(1);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`DB authority snapshot???쎌? 紐삵뻽?듬땲?? ${error.message}`);
    }

    if (!data?.snapshot_json) {
      return null;
    }

    return normalizeAuthoritySnapshot(data.snapshot_json as SessionSnapshot);
  }

  async writeProjection(projection: DbAuthorityProjection) {
    const { error } = await this.client.rpc("apply_db_authority_projection", {
      projection
    });
    if (error) {
      throw new Error(`DB authority atomic write failed: ${error.message}`);
    }
  }

  async readProjection(sessionId: string) {
    const { data: sessionRow, error: sessionError } = await this.client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) {
      throw new Error(`DB authority projection???쎌? 紐삵뻽?듬땲?? ${sessionError.message}`);
    }

    if (!sessionRow?.snapshot_json) {
      return null;
    }

    const [
      { data: hqRow, error: hqError },
      { data: branchRow, error: branchError },
      { data: eventRow, error: eventError },
      { data: participantRows, error: participantError },
      { data: reservationRows, error: reservationError },
      { data: blacklistRows, error: blacklistError },
      { data: incidentRows, error: incidentError }
    ] = await Promise.all([
      this.client.from("hqs").select("*").eq("id", sessionRow.hq_id).maybeSingle(),
      this.client.from("branches").select("*").eq("id", sessionRow.branch_id).maybeSingle(),
      this.client.from("events").select("*").eq("id", sessionRow.event_id).maybeSingle(),
      this.client.from("participants").select("*").eq("session_id", sessionId),
      this.client.from("reservations").select("*").eq("session_id", sessionId),
      this.client.from("blacklist").select("*").eq("session_id", sessionId),
      this.client.from("incidents").select("*").eq("session_id", sessionId)
    ]);

    if (hqError) throw new Error(`HQ projection???쎌? 紐삵뻽?듬땲?? ${hqError.message}`);
    if (branchError) throw new Error(`Branch projection???쎌? 紐삵뻽?듬땲?? ${branchError.message}`);
    if (eventError) throw new Error(`Event projection???쎌? 紐삵뻽?듬땲?? ${eventError.message}`);
    if (participantError) throw new Error(`Participant projection???쎌? 紐삵뻽?듬땲?? ${participantError.message}`);
    if (reservationError) throw new Error(`Reservation projection???쎌? 紐삵뻽?듬땲?? ${reservationError.message}`);
    if (blacklistError) throw new Error(`Blacklist projection???쎌? 紐삵뻽?듬땲?? ${blacklistError.message}`);
    if (incidentError) throw new Error(`Incident projection???쎌? 紐삵뻽?듬땲?? ${incidentError.message}`);
    if (!hqRow || !branchRow || !eventRow) {
      return null;
    }

    return {
      snapshot: normalizeAuthoritySnapshot(sessionRow.snapshot_json as SessionSnapshot),
      hq: hqRow as HqProjection,
      branch: branchRow as BranchProjection,
      event: eventRow as EventProjection,
      session: sessionRow as SessionProjection,
      participants: (participantRows ?? []) as ParticipantRow[],
      reservations: (reservationRows ?? []) as ReservationProjection[],
      blacklist: (blacklistRows ?? []) as BlacklistRow[],
      incidents: (incidentRows ?? []) as IncidentRow[]
    };
  }

  async listBranches() {
    const { data, error } = await this.client
      .from("branches")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Branch 목록을 조회하지 못했습니다. ${error.message}`);
    }

    return (data ?? []) as BranchRow[];
  }

  async getBranch(branchId: string) {
    const { data, error } = await this.client
      .from("branches")
      .select("*")
      .eq("id", branchId)
      .maybeSingle();

    if (error) {
      throw new Error(`Branch 정보를 조회하지 못했습니다. ${error.message}`);
    }

    return (data as BranchRow | null) ?? null;
  }

  async upsertBranch(branchRow: BranchRow) {
    const { data, error } = await this.client
      .from("branches")
      .upsert(branchRow)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Branch 정보를 저장하지 못했습니다. ${error.message}`);
    }

    return data as BranchRow;
  }

  async getEvent(eventId: string) {
    const { data, error } = await this.client
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`Event 정보를 조회하지 못했습니다. ${error.message}`);
    }

    return (data as EventProjection | null) ?? null;
  }

  async listSessionRows() {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Session 목록을 조회하지 못했습니다. ${error.message}`);
    }

    return (data ?? []) as ManagedSessionRow[];
  }

  async getSessionRow(sessionId: string) {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Session 정보를 조회하지 못했습니다. ${error.message}`);
    }

    return (data as ManagedSessionRow | null) ?? null;
  }

  async upsertSessionRow(sessionRow: ManagedSessionRow) {
    const { data, error } = await this.client
      .from("sessions")
      .upsert(sessionRow)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Session 정보를 저장하지 못했습니다. ${error.message}`);
    }

    return data as ManagedSessionRow;
  }
}

export function createDbAuthorityRepository(
  options: DbAuthorityRepositoryOptions = {}
): DbAuthorityRepository {
  const adapter =
    options.adapter ?? new SupabaseDbAuthorityAdapter(createSupabaseAuthorityClient());
  const createSnapshot = options.createSnapshot ?? createSeedSnapshot;
  let snapshotCache: SessionSnapshot | null = null;
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();

  async function writeSnapshot(
    nextSnapshot: SessionSnapshot,
    options: { incrementVersion: boolean }
  ) {
    const normalized = normalizeAuthoritySnapshot(nextSnapshot);
    const persisted = {
      ...normalized,
      version: options.incrementVersion ? normalized.version + 1 : normalized.version
    };
    await adapter.writeProjection(buildDbAuthorityProjection(persisted));
    snapshotCache = deepClone(persisted);

    for (const listener of listeners) {
      listener(deepClone(persisted));
    }

    return deepClone(persisted);
  }

  async function getExistingSessionSnapshot(options: AuthorityReadOptions = {}) {
    if (snapshotCache && !options.fresh) {
      return deepClone(snapshotCache);
    }

    const snapshot = await adapter.readSnapshot();
    if (!snapshot) {
      return null;
    }

    snapshotCache = normalizeAuthoritySnapshot(snapshot);
    return deepClone(snapshotCache);
  }

  async function persistSessionSnapshot(nextSnapshot: SessionSnapshot) {
    return writeSnapshot(nextSnapshot, { incrementVersion: true });
  }

  async function upsertExistingSessionSnapshot(snapshot: SessionSnapshot) {
    return writeSnapshot(snapshot, { incrementVersion: false });
  }

  async function getSessionSnapshot(options: AuthorityReadOptions = {}) {
    const existingSnapshot = await getExistingSessionSnapshot(options);
    if (existingSnapshot) {
      return existingSnapshot;
    }

    snapshotCache = normalizeAuthoritySnapshot(createSnapshot());
    await persistSessionSnapshot({ ...snapshotCache, version: 0 });
    return deepClone(snapshotCache);
  }

  function requireNonEmpty(value: string, label: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new Error(`${label}을(를) 입력해 주세요.`);
    }

    return normalized;
  }

  function requirePositiveInteger(value: number, label: string) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${label}은(는) 1 이상의 정수여야 합니다.`);
    }

    return value;
  }

  async function resolveDefaultHqId() {
    const sessionSnapshot = await getExistingSessionSnapshot();
    if (sessionSnapshot?.session.hqId) {
      return sessionSnapshot.session.hqId;
    }

    return createSnapshot().session.hqId;
  }

  async function saveBranch(branch: {
    id?: string;
    name: string;
    venueName: string;
    venueAddress: string;
    defaultMaxCapacity: number;
    defaultTableCount: number;
    isActive: boolean;
    updatedBy: string | null;
  }) {
    const existing = branch.id ? await adapter.getBranch(branch.id) : null;
    const now = new Date().toISOString();
    const saved = await adapter.upsertBranch({
      id: branch.id?.trim() || createId("branch"),
      hq_id: existing?.hq_id ?? (await resolveDefaultHqId()),
      name: requireNonEmpty(branch.name, "브랜치 이름"),
      venue_name: requireNonEmpty(branch.venueName, "브랜치 장소명"),
      venue_address: requireNonEmpty(branch.venueAddress, "브랜치 위치"),
      default_max_capacity: requirePositiveInteger(
        branch.defaultMaxCapacity,
        "기본 최대 수용 인원"
      ),
      default_table_count: requirePositiveInteger(branch.defaultTableCount, "기본 테이블 수"),
      is_active: branch.isActive,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      updated_by: branch.updatedBy
    });

    return mapBranchRow(saved);
  }

  async function buildManagedSessionSnapshot(
    input: ManagedSessionUpsertInput,
    existingSnapshot?: SessionSnapshot
  ) {
    const branch = await adapter.getBranch(input.branchId);
    if (!branch) {
      throw new Error("유효한 브랜치를 선택해 주세요.");
    }

    if (!branch.is_active) {
      throw new Error("비활성화된 브랜치에는 세션을 배정할 수 없습니다.");
    }

    const event = await adapter.getEvent(input.eventId);
    if (!event) {
      throw new Error("유효한 이벤트를 지정해 주세요.");
    }

    if (event.branch_id !== branch.id) {
      throw new Error("선택한 브랜치와 이벤트가 일치하지 않습니다.");
    }

    const base = normalizeAuthoritySnapshot(existingSnapshot ?? createSnapshot());
    const now = new Date().toISOString();
    const tableCount = requirePositiveInteger(input.tableCount, "테이블 수");
    const tableCapacity = requirePositiveInteger(input.tableCapacity, "테이블당 수용 인원");
    requirePositiveInteger(input.maxCapacity, "세션 최대 수용 인원");
    const sessionId = existingSnapshot?.session.id ?? (input.id?.trim() || createId("session"));

    return {
      ...base,
      version: existingSnapshot?.version ?? 0,
      participants: existingSnapshot?.participants ?? [],
      hearts: existingSnapshot?.hearts ?? [],
      reports: existingSnapshot?.reports ?? [],
      blacklist: existingSnapshot?.blacklist ?? [],
      incidents: existingSnapshot?.incidents ?? [],
      auditLogs: existingSnapshot?.auditLogs ?? [],
      seatingAssignments: existingSnapshot?.seatingAssignments ?? [],
      activeContentIds: existingSnapshot?.activeContentIds ?? [],
      liveContent: existingSnapshot?.liveContent ?? null,
      contentResponses: existingSnapshot?.contentResponses ?? [],
      anonymousMessages: existingSnapshot?.anonymousMessages ?? [],
      tableImpressionPicks: existingSnapshot?.tableImpressionPicks ?? [],
      tablePickWindows: existingSnapshot?.tablePickWindows ?? [],
      tableQrCodes: existingSnapshot?.tableQrCodes ?? [],
      contactExchanges: existingSnapshot?.contactExchanges ?? [],
      announcements: existingSnapshot?.announcements ?? [],
      rotationInstruction: existingSnapshot?.rotationInstruction ?? null,
      session: {
        ...base.session,
        id: sessionId,
        name: requireNonEmpty(input.name, "세션 이름"),
        hqId: branch.hq_id,
        branchId: branch.id,
        branchName: branch.name,
        eventId: event.id,
        venueName: requireNonEmpty(input.venueName, "세션 장소명"),
        venueAddress: requireNonEmpty(input.venueAddress, "세션 위치"),
        sessionDateLabel: requireNonEmpty(input.sessionDateLabel, "세션 날짜 라벨"),
        sessionTimeLabel: requireNonEmpty(input.sessionTimeLabel, "세션 시간 라벨"),
        attendanceLabel: requireNonEmpty(input.attendanceLabel, "세션 안내 라벨"),
        attendanceHint: requireNonEmpty(input.attendanceHint, "세션 안내 문구"),
        code: requireNonEmpty(input.code, "세션 코드"),
        phase: existingSnapshot?.session.phase ?? "CHECKIN",
        revealSenders: existingSnapshot?.session.revealSenders ?? false,
        revealTriggeredAt: existingSnapshot?.session.revealTriggeredAt ?? null,
        startedAt:
          input.status === "OPEN"
            ? existingSnapshot?.session.startedAt ?? now
            : existingSnapshot?.session.startedAt ?? now,
        updatedAt: now,
        tableCount,
        tableCapacity,
        customerSessionVersion: existingSnapshot?.session.customerSessionVersion ?? 1
      }
    } satisfies SessionSnapshot;
  }

  async function listBranches() {
    const rows = await adapter.listBranches();
    return rows.map(mapBranchRow);
  }

  async function listManagedSessions(branchId?: string | null) {
    const rows = await adapter.listSessionRows();
    return rows
      .filter((row) => !branchId || row.branch_id === branchId)
      .map(mapManagedSessionRow)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async function syncManagedSessionRow(
    snapshot: SessionSnapshot,
    options: { status: ManagedSessionUpsertInput["status"]; maxCapacity: number; updatedBy: string | null }
  ) {
    const existingRow = await adapter.getSessionRow(snapshot.session.id);
    const now = snapshot.session.updatedAt;
    const nextRow: ManagedSessionRow = {
      ...(existingRow ?? {
        created_at: snapshot.session.startedAt,
        authority_backend: "DB" as const,
        snapshot_json: snapshot,
        active_content_ids: snapshot.activeContentIds,
        snapshot_version: snapshot.version,
        customer_session_version: snapshot.session.customerSessionVersion,
        reveal_senders: snapshot.session.revealSenders,
        reveal_triggered_at: snapshot.session.revealTriggeredAt,
        status: "DRAFT" as const,
        max_capacity: snapshot.session.tableCount * snapshot.session.tableCapacity,
        updated_by: null
      }),
      ...mapSessionToRow(snapshot),
      hq_id: snapshot.session.hqId,
      branch_id: snapshot.session.branchId,
      branch_name: snapshot.session.branchName,
      event_id: snapshot.session.eventId,
      venue_name: snapshot.session.venueName,
      venue_address: snapshot.session.venueAddress,
      created_at: existingRow?.created_at ?? now,
      authority_backend: "DB",
      snapshot_json: snapshot,
      status: options.status,
      max_capacity: options.maxCapacity,
      updated_at: now,
      updated_by: options.updatedBy
    };

    return mapManagedSessionRow(await adapter.upsertSessionRow(nextRow));
  }

  async function createManagedSession(
    input: ManagedSessionUpsertInput & { updatedBy: string | null }
  ) {
    if (input.status === "OPEN") {
      const rows = await adapter.listSessionRows();
      const hasOpenSession = rows.some(
        (row) => row.branch_id === input.branchId && row.status === "OPEN"
      );
      if (hasOpenSession) {
        throw new Error("브랜치당 OPEN 세션은 1개만 허용됩니다.");
      }
    }
    const snapshot = await buildManagedSessionSnapshot(input);
    const persisted = await upsertExistingSessionSnapshot(snapshot);
    return syncManagedSessionRow(persisted, {
      status: input.status,
      maxCapacity: input.maxCapacity,
      updatedBy: input.updatedBy
    });
  }

  async function updateManagedSession(
    sessionId: string,
    input: Partial<ManagedSessionUpsertInput> & { updatedBy: string | null }
  ) {
    const projection = await adapter.readProjection(sessionId);
    if (!projection) {
      throw new Error("수정할 세션을 찾을 수 없습니다.");
    }

    const current = mapManagedSessionRow((await adapter.getSessionRow(sessionId)) ?? {
      ...(projection.session as unknown as ManagedSessionRow),
      created_at: projection.session.started_at,
      status: "OPEN",
      max_capacity: projection.session.table_count * projection.session.table_capacity,
      updated_by: null
    });

    const nextInput: ManagedSessionUpsertInput = {
      id: sessionId,
      name: input.name ?? current.name,
      branchId: input.branchId ?? current.branchId,
      eventId: input.eventId ?? current.eventId,
      venueName: input.venueName ?? current.venueName,
      venueAddress: input.venueAddress ?? current.venueAddress,
      sessionDateLabel: input.sessionDateLabel ?? current.sessionDateLabel,
      sessionTimeLabel: input.sessionTimeLabel ?? current.sessionTimeLabel,
      attendanceLabel: input.attendanceLabel ?? current.attendanceLabel,
      attendanceHint: input.attendanceHint ?? current.attendanceHint,
      code: input.code ?? current.code,
      tableCount: input.tableCount ?? current.tableCount,
      tableCapacity: input.tableCapacity ?? current.tableCapacity,
      maxCapacity: input.maxCapacity ?? current.maxCapacity,
      status: input.status ?? current.status
    };

    if (nextInput.status === "OPEN") {
      const rows = await adapter.listSessionRows();
      const hasOtherOpenSession = rows.some(
        (row) =>
          row.id !== sessionId &&
          row.branch_id === nextInput.branchId &&
          row.status === "OPEN"
      );
      if (hasOtherOpenSession) {
        throw new Error("브랜치당 OPEN 세션은 1개만 허용됩니다.");
      }
    }

    const snapshot = await buildManagedSessionSnapshot(nextInput, projection.snapshot);
    const persisted = await upsertExistingSessionSnapshot(snapshot);
    return syncManagedSessionRow(persisted, {
      status: nextInput.status,
      maxCapacity: nextInput.maxCapacity,
      updatedBy: input.updatedBy
    });
  }

  return {
    kind: "db",
    getSessionSnapshot,
    getExistingSessionSnapshot,
    persistSessionSnapshot,
    async getProjection(sessionId: string, _options: AuthorityReadOptions = {}) {
      return adapter.readProjection(sessionId);
    },
    upsertExistingSessionSnapshot,
    listBranches,
    getBranch(branchId: string) {
      return adapter.getBranch(branchId);
    },
    saveBranch,
    listManagedSessions,
    getSessionRow(sessionId: string) {
      return adapter.getSessionRow(sessionId);
    },
    createManagedSession,
    updateManagedSession,
    subscribeToSessionSnapshots(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
