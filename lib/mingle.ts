import type {
  AuditAction,
  AuditActorRole,
  AuditLogRecord,
  CheckinDraft,
  CheckinMode,
  CheckinResolution,
  HeartRecord,
  HeartRow,
  ParticipantGender,
  ParticipantRecord,
  ParticipantRow,
  ProfileDraft,
  ReportRecord,
  ReportRow,
  SeatingAssignmentRecord,
  SeatingAssignmentRow,
  SessionRecord,
  SessionRow,
  SessionSnapshot,
  TableSummary,
  ToastState
} from "@/types/mingle";

export const STORAGE_KEYS = {
  snapshot: "mingle:session:v3",
  viewer: "mingle:viewer:v3"
} as const;

export const MINGLE_CONSTANTS = {
  brandName: "Mingle",
  sessionName: "Mingle Saturday Signature",
  branchName: "성수",
  defaultSessionCode: "2026",
  pollingIntervalMs: 5000,
  tableCount: 5,
  tableCapacity: 6,
  freeHeartLimit: 3,
  heartBundleSize: 3,
  heartBundlePriceKrw: 5000
} as const;

export const JOB_OPTIONS: Record<string, string[]> = {
  "사업개발/기획": ["사업개발", "서비스 기획", "프로젝트 매니저", "운영 기획"],
  "IT/프로덕트": ["프론트엔드", "백엔드", "프로덕트 디자이너", "데이터 분석가"],
  "브랜드/마케팅": ["브랜드 마케터", "퍼포먼스 마케터", "콘텐츠 에디터", "PR"],
  "금융/전문직": ["변호사", "회계사", "컨설턴트", "애널리스트"],
  "커뮤니티/교육": ["교사", "강사", "HR", "커뮤니티 매니저"],
  "크리에이티브": ["사진가", "영상 제작", "작가", "아트 디렉터"]
};

export const ANIMAL_TYPES = ["강아지상", "고양이상", "여우상", "곰상", "사슴상", "토끼상"] as const;
export const REPORT_REASONS = [
  "불쾌한 언행",
  "과도한 음주 권유",
  "원치 않는 신체 접촉",
  "반복적인 압박",
  "기타 운영 신고"
] as const;

export const PROFILE_RULES = {
  minAge: 20,
  maxAge: 40,
  minHeightCm: 140,
  maxHeightCm: 210
} as const;

const FEMALE_NAMES = [
  "지민",
  "서현",
  "민서",
  "채원",
  "은서",
  "하윤",
  "수아",
  "유진",
  "서윤",
  "하린",
  "가은",
  "예진",
  "나연"
];

const MALE_NAMES = [
  "민재",
  "현우",
  "준호",
  "시윤",
  "태오",
  "지환",
  "성민",
  "도윤",
  "우진",
  "건우",
  "승현",
  "동현"
];

const PHOTO_IDS = [
  "photo-1494790108377-be9c29b29330",
  "photo-1488426862026-3ee34a7d66df",
  "photo-1534528741775-53994a69daeb",
  "photo-1517841905240-472988babdf9",
  "photo-1500648767791-00dcc994a43e",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1472099645785-5658abf4ff4e"
];

const NOW = "2026-04-12T19:30:00.000+09:00";
const ACTIVE_CONTENT_IDS = ["question-cards", "table-pairing", "balance-pick"] as const;

type SeedStat = {
  receivedHearts: number;
  sentHearts: number;
  profileViews: number;
  usedFreeHearts: number;
  paidHeartBalance?: number;
  isVip?: boolean;
  isHighValue?: boolean;
};

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function createId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

export function formatTableName(tableId: number) {
  return `테이블 ${tableId}`;
}

export function sortByPriority<T extends { priority: "HIGH" | "MEDIUM" | "LOW" }>(items: T[]) {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...items].sort((left, right) => order[left.priority] - order[right.priority]);
}

export function mapRecommendationsByPriority<T extends { priority: "HIGH" | "MEDIUM" | "LOW" }>(
  items: T[]
) {
  return sortByPriority(items);
}

export function buildPhoto(index: number) {
  return `https://images.unsplash.com/${PHOTO_IDS[index % PHOTO_IDS.length]}?w=640&q=80&auto=format&fit=crop`;
}

function checksum(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function resolveCheckinReservation(mode: CheckinMode, rawValue: string): CheckinResolution {
  const key = `${mode}:${rawValue}`;
  const code = checksum(key);
  const gender: ParticipantGender = code % 2 === 0 ? "F" : "M";
  const reservationIndex = code % 997;

  return {
    reservationId: `reservation_${reservationIndex.toString().padStart(3, "0")}`,
    gender,
    reservationLabel:
      gender === "F"
        ? `${FEMALE_NAMES[reservationIndex % FEMALE_NAMES.length]} 예약`
        : `${MALE_NAMES[reservationIndex % MALE_NAMES.length]} 예약`
  };
}

function participantSeed(
  id: string,
  nickname: string,
  gender: ParticipantGender,
  jobCategory: string,
  job: string,
  tableId: number,
  age: number,
  heightCm: number,
  animalType: string,
  energyType: "E" | "I",
  stats: SeedStat,
  joinedOffsetMinutes: number
): ParticipantRecord {
  return {
    id,
    reservationId: `reservation_${id}`,
    nickname,
    gender,
    age,
    jobCategory,
    job,
    photoUrl: buildPhoto(tableId + age),
    heightCm,
    animalType,
    energyType,
    checkinMode: tableId % 3 === 0 ? "staff" : tableId % 2 === 0 ? "code" : "qr",
    tableId,
    receivedHearts: stats.receivedHearts,
    sentHearts: stats.sentHearts,
    profileViews: stats.profileViews,
    usedFreeHearts: stats.usedFreeHearts,
    paidHeartBalance: stats.paidHeartBalance ?? 0,
    purchasedBundles: stats.paidHeartBalance
      ? Math.ceil(stats.paidHeartBalance / MINGLE_CONSTANTS.heartBundleSize)
      : 0,
    metParticipantIds: [],
    tier: "C",
    subTier: "LOW",
    score: 0,
    attractionScore: 0,
    engagementScore: 0,
    isVip: stats.isVip ?? false,
    isHighValue: stats.isHighValue ?? false,
    joinedAt: `2026-04-12T18:${String(joinedOffsetMinutes).padStart(2, "0")}:00.000+09:00`
  };
}

function buildSeedParticipants() {
  const participants: ParticipantRecord[] = [
    participantSeed("f_01", FEMALE_NAMES[0], "F", "사업개발/기획", "사업개발", 1, 28, 166, "고양이상", "E", { receivedHearts: 6, sentHearts: 2, profileViews: 11, usedFreeHearts: 2, isHighValue: true }, 1),
    participantSeed("m_01", MALE_NAMES[0], "M", "IT/프로덕트", "백엔드", 1, 30, 181, "강아지상", "I", { receivedHearts: 3, sentHearts: 4, profileViews: 8, usedFreeHearts: 3 }, 2),
    participantSeed("f_02", FEMALE_NAMES[1], "F", "브랜드/마케팅", "브랜드 마케터", 1, 27, 163, "여우상", "I", { receivedHearts: 5, sentHearts: 3, profileViews: 9, usedFreeHearts: 1 }, 3),
    participantSeed("m_02", MALE_NAMES[1], "M", "금융/전문직", "컨설턴트", 1, 31, 178, "곰상", "E", { receivedHearts: 1, sentHearts: 1, profileViews: 4, usedFreeHearts: 1 }, 4),
    participantSeed("f_03", FEMALE_NAMES[2], "F", "IT/프로덕트", "프로덕트 디자이너", 1, 26, 165, "토끼상", "E", { receivedHearts: 4, sentHearts: 4, profileViews: 10, usedFreeHearts: 3 }, 5),
    participantSeed("m_03", MALE_NAMES[2], "M", "사업개발/기획", "서비스 기획", 2, 29, 182, "사슴상", "E", { receivedHearts: 5, sentHearts: 2, profileViews: 10, usedFreeHearts: 2 }, 6),
    participantSeed("f_04", FEMALE_NAMES[3], "F", "커뮤니티/교육", "커뮤니티 매니저", 2, 29, 167, "강아지상", "I", { receivedHearts: 2, sentHearts: 2, profileViews: 6, usedFreeHearts: 1 }, 7),
    participantSeed("m_04", MALE_NAMES[3], "M", "브랜드/마케팅", "콘텐츠 에디터", 2, 27, 176, "고양이상", "I", { receivedHearts: 0, sentHearts: 1, profileViews: 2, usedFreeHearts: 1 }, 8),
    participantSeed("f_05", FEMALE_NAMES[4], "F", "금융/전문직", "애널리스트", 2, 30, 168, "사슴상", "E", { receivedHearts: 7, sentHearts: 3, profileViews: 12, usedFreeHearts: 3, paidHeartBalance: 1, isHighValue: true }, 9),
    participantSeed("m_05", MALE_NAMES[4], "M", "IT/프로덕트", "프론트엔드", 2, 26, 179, "여우상", "E", { receivedHearts: 2, sentHearts: 3, profileViews: 6, usedFreeHearts: 3 }, 10),
    participantSeed("f_06", FEMALE_NAMES[5], "F", "크리에이티브", "아트 디렉터", 3, 27, 164, "고양이상", "I", { receivedHearts: 3, sentHearts: 1, profileViews: 5, usedFreeHearts: 1 }, 11),
    participantSeed("m_06", MALE_NAMES[5], "M", "사업개발/기획", "운영 기획", 3, 28, 180, "곰상", "I", { receivedHearts: 0, sentHearts: 0, profileViews: 1, usedFreeHearts: 0 }, 12),
    participantSeed("f_07", FEMALE_NAMES[6], "F", "브랜드/마케팅", "PR", 3, 25, 162, "강아지상", "E", { receivedHearts: 4, sentHearts: 4, profileViews: 8, usedFreeHearts: 3 }, 13),
    participantSeed("m_07", MALE_NAMES[6], "M", "커뮤니티/교육", "HR", 3, 29, 177, "토끼상", "E", { receivedHearts: 1, sentHearts: 1, profileViews: 3, usedFreeHearts: 1 }, 14),
    participantSeed("f_08", FEMALE_NAMES[7], "F", "IT/프로덕트", "데이터 분석가", 3, 28, 169, "사슴상", "E", { receivedHearts: 6, sentHearts: 2, profileViews: 11, usedFreeHearts: 2, isVip: true, isHighValue: true }, 15),
    participantSeed("m_08", MALE_NAMES[7], "M", "금융/전문직", "변호사", 4, 32, 183, "강아지상", "I", { receivedHearts: 5, sentHearts: 3, profileViews: 9, usedFreeHearts: 2, isHighValue: true }, 16),
    participantSeed("f_09", FEMALE_NAMES[8], "F", "사업개발/기획", "프로젝트 매니저", 4, 29, 166, "곰상", "E", { receivedHearts: 2, sentHearts: 3, profileViews: 7, usedFreeHearts: 2 }, 17),
    participantSeed("m_09", MALE_NAMES[8], "M", "브랜드/마케팅", "퍼포먼스 마케터", 4, 28, 178, "여우상", "E", { receivedHearts: 1, sentHearts: 0, profileViews: 3, usedFreeHearts: 0 }, 18),
    participantSeed("f_10", FEMALE_NAMES[9], "F", "크리에이티브", "사진가", 4, 27, 165, "토끼상", "I", { receivedHearts: 3, sentHearts: 2, profileViews: 6, usedFreeHearts: 2 }, 19),
    participantSeed("m_10", MALE_NAMES[9], "M", "IT/프로덕트", "프론트엔드", 4, 30, 181, "고양이상", "E", { receivedHearts: 4, sentHearts: 2, profileViews: 7, usedFreeHearts: 2 }, 20),
    participantSeed("f_11", FEMALE_NAMES[10], "F", "커뮤니티/교육", "교사", 5, 26, 161, "여우상", "E", { receivedHearts: 1, sentHearts: 1, profileViews: 4, usedFreeHearts: 1 }, 21),
    participantSeed("m_11", MALE_NAMES[10], "M", "사업개발/기획", "사업개발", 5, 31, 184, "강아지상", "I", { receivedHearts: 6, sentHearts: 4, profileViews: 12, usedFreeHearts: 3, isHighValue: true }, 22),
    participantSeed("f_12", FEMALE_NAMES[11], "F", "브랜드/마케팅", "콘텐츠 에디터", 5, 24, 163, "사슴상", "E", { receivedHearts: 2, sentHearts: 1, profileViews: 5, usedFreeHearts: 1 }, 23),
    participantSeed("m_12", MALE_NAMES[11], "M", "금융/전문직", "회계사", 5, 29, 179, "곰상", "E", { receivedHearts: 2, sentHearts: 2, profileViews: 5, usedFreeHearts: 2 }, 24),
    participantSeed("f_13", FEMALE_NAMES[12], "F", "크리에이티브", "영상 제작", 5, 28, 167, "고양이상", "I", { receivedHearts: 7, sentHearts: 4, profileViews: 14, usedFreeHearts: 3, paidHeartBalance: 2, isHighValue: true }, 25)
  ];

  const groupedByTable = new Map<number, string[]>();
  for (const participant of participants) {
    const existing = groupedByTable.get(participant.tableId) ?? [];
    existing.push(participant.id);
    groupedByTable.set(participant.tableId, existing);
  }

  for (const participant of participants) {
    participant.metParticipantIds = (groupedByTable.get(participant.tableId) ?? []).filter(
      (id) => id !== participant.id
    );
  }

  return participants;
}

export function createSeedSnapshot(): SessionSnapshot {
  const participants = buildSeedParticipants();
  const seatingAssignments = participants.map<SeatingAssignmentRecord>((participant) => ({
    id: `seat_${participant.id}_0`,
    sessionId: "session_signature_20260412",
    rotationRound: 0,
    participantId: participant.id,
    tableId: participant.tableId,
    assignedAt: NOW,
    assignmentSource: "INITIAL"
  }));

  return {
    version: 3,
    session: {
      id: "session_signature_20260412",
      name: MINGLE_CONSTANTS.sessionName,
      branchName: MINGLE_CONSTANTS.branchName,
      code: MINGLE_CONSTANTS.defaultSessionCode,
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: NOW,
      updatedAt: NOW,
      freeHeartLimit: MINGLE_CONSTANTS.freeHeartLimit,
      paidHeartBundlePriceKrw: MINGLE_CONSTANTS.heartBundlePriceKrw,
      tableCount: MINGLE_CONSTANTS.tableCount,
      tableCapacity: MINGLE_CONSTANTS.tableCapacity
    },
    participants,
    hearts: [
      { id: "heart_01", sessionId: "session_signature_20260412", senderId: "m_03", recipientId: "f_01", source: "FREE", createdAt: NOW },
      { id: "heart_02", sessionId: "session_signature_20260412", senderId: "f_05", recipientId: "m_11", source: "PAID", createdAt: NOW },
      { id: "heart_03", sessionId: "session_signature_20260412", senderId: "m_11", recipientId: "f_13", source: "FREE", createdAt: NOW }
    ],
    reports: [],
    auditLogs: [
      {
        id: "audit_bootstrap",
        sessionId: "session_signature_20260412",
        action: "SESSION_BOOTSTRAP",
        actorId: "system",
        actorRole: "SYSTEM",
        message: "데모 운영 세션을 초기화했습니다.",
        createdAt: NOW,
        metadata: { tableCount: MINGLE_CONSTANTS.tableCount }
      }
    ],
    seatingAssignments,
    activeContentIds: [...ACTIVE_CONTENT_IDS]
  };
}

export function createEmptyProfileDraft(): ProfileDraft {
  return {
    nickname: "",
    age: "",
    jobCategory: "",
    job: "",
    photoUrl: "",
    heightCm: "",
    animalType: "",
    energyType: ""
  };
}

export function createEmptyCheckinDraft(): CheckinDraft {
  return {
    mode: "qr",
    value: "",
    staffNote: "",
    isVerified: false,
    error: null,
    resolution: null
  };
}

export function getViewerState() {
  if (typeof window === "undefined") {
    return { viewerParticipantId: null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.viewer);
  if (!raw) {
    return { viewerParticipantId: null };
  }

  try {
    return JSON.parse(raw) as { viewerParticipantId: string | null };
  } catch {
    return { viewerParticipantId: null };
  }
}

export function setViewerParticipantId(viewerParticipantId: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.viewer, JSON.stringify({ viewerParticipantId }));
}

export function appendAuditLog(snapshot: SessionSnapshot, entry: AuditLogRecord): SessionSnapshot {
  return {
    ...snapshot,
    auditLogs: [entry, ...snapshot.auditLogs],
    session: {
      ...snapshot.session,
      updatedAt: entry.createdAt
    }
  };
}

export function createAuditLog(
  action: AuditAction,
  actorId: string,
  actorRole: AuditActorRole,
  message: string,
  metadata?: Record<string, unknown>,
  sessionId = "session_signature_20260412"
): AuditLogRecord {
  return {
    id: createId("audit"),
    sessionId,
    action,
    actorId,
    actorRole,
    message,
    createdAt: new Date().toISOString(),
    metadata
  };
}

export function createToast(tone: ToastState["tone"], message: string): ToastState {
  return { tone, message };
}

export function selectLeastCrowdedTable(participants: ParticipantRecord[]) {
  const occupancy = new Map<number, number>();
  for (let tableId = 1; tableId <= MINGLE_CONSTANTS.tableCount; tableId += 1) {
    occupancy.set(tableId, 0);
  }

  for (const participant of participants) {
    occupancy.set(participant.tableId, (occupancy.get(participant.tableId) ?? 0) + 1);
  }

  return [...occupancy.entries()].sort((left, right) => {
    if (left[1] !== right[1]) return left[1] - right[1];
    return left[0] - right[0];
  })[0]?.[0] ?? 1;
}

export function summarizeCheckinModes(participants: ParticipantRecord[]) {
  return participants.reduce(
    (acc, participant) => {
      acc[participant.checkinMode] += 1;
      return acc;
    },
    { qr: 0, code: 0, staff: 0 }
  );
}

export function computeAdminKpis(tableSummaries: TableSummary[], participants: ParticipantRecord[]) {
  return {
    participantCount: participants.length,
    hotTables: tableSummaries.filter((table) => table.heat >= 16).length,
    coldTables: tableSummaries.filter((table) => table.heat <= 8).length,
    highValueParticipants: participants.filter((participant) => participant.isHighValue).length
  };
}

export function findParticipant(
  participants: ParticipantRecord[],
  participantId: string | null | undefined
) {
  if (!participantId) return null;
  return participants.find((participant) => participant.id === participantId) ?? null;
}

export function mapSessionToRow(snapshot: SessionSnapshot): SessionRow {
  return {
    id: snapshot.session.id,
    name: snapshot.session.name,
    branch_name: snapshot.session.branchName,
    code: snapshot.session.code,
    phase: snapshot.session.phase,
    reveal_senders: snapshot.session.revealSenders,
    reveal_triggered_at: snapshot.session.revealTriggeredAt,
    started_at: snapshot.session.startedAt,
    updated_at: snapshot.session.updatedAt,
    free_heart_limit: snapshot.session.freeHeartLimit,
    paid_heart_bundle_price_krw: snapshot.session.paidHeartBundlePriceKrw,
    table_count: snapshot.session.tableCount,
    table_capacity: snapshot.session.tableCapacity,
    active_content_ids: snapshot.activeContentIds,
    snapshot_version: snapshot.version
  };
}

export function mapSessionRow(row: SessionRow) {
  return {
    session: {
      id: row.id,
      name: row.name,
      branchName: row.branch_name,
      code: row.code,
      phase: row.phase,
      revealSenders: row.reveal_senders,
      revealTriggeredAt: row.reveal_triggered_at,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      freeHeartLimit: row.free_heart_limit,
      paidHeartBundlePriceKrw: row.paid_heart_bundle_price_krw,
      tableCount: row.table_count,
      tableCapacity: row.table_capacity
    } satisfies SessionRecord,
    activeContentIds: row.active_content_ids,
    version: row.snapshot_version
  };
}

export function mapParticipantToRow(sessionId: string, participant: ParticipantRecord): ParticipantRow {
  return {
    id: participant.id,
    session_id: sessionId,
    reservation_id: participant.reservationId,
    nickname: participant.nickname,
    gender: participant.gender,
    age: participant.age,
    job_category: participant.jobCategory,
    job: participant.job,
    photo_url: participant.photoUrl,
    height_cm: participant.heightCm,
    animal_type: participant.animalType,
    energy_type: participant.energyType,
    checkin_mode: participant.checkinMode,
    table_id: participant.tableId,
    received_hearts: participant.receivedHearts,
    sent_hearts: participant.sentHearts,
    profile_views: participant.profileViews,
    used_free_hearts: participant.usedFreeHearts,
    paid_heart_balance: participant.paidHeartBalance,
    purchased_bundles: participant.purchasedBundles,
    met_participant_ids: participant.metParticipantIds,
    tier: participant.tier,
    sub_tier: participant.subTier,
    score: participant.score,
    attraction_score: participant.attractionScore,
    engagement_score: participant.engagementScore,
    is_vip: participant.isVip,
    is_high_value: participant.isHighValue,
    joined_at: participant.joinedAt
  };
}

export function mapParticipantRow(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    nickname: row.nickname,
    gender: row.gender,
    age: row.age,
    jobCategory: row.job_category,
    job: row.job,
    photoUrl: row.photo_url,
    heightCm: row.height_cm,
    animalType: row.animal_type,
    energyType: row.energy_type,
    checkinMode: row.checkin_mode,
    tableId: row.table_id,
    receivedHearts: row.received_hearts,
    sentHearts: row.sent_hearts,
    profileViews: row.profile_views,
    usedFreeHearts: row.used_free_hearts,
    paidHeartBalance: row.paid_heart_balance,
    purchasedBundles: row.purchased_bundles,
    metParticipantIds: row.met_participant_ids,
    tier: row.tier,
    subTier: row.sub_tier,
    score: row.score,
    attractionScore: row.attraction_score,
    engagementScore: row.engagement_score,
    isVip: row.is_vip,
    isHighValue: row.is_high_value,
    joinedAt: row.joined_at
  };
}

export function mapHeartToRow(heart: HeartRecord): HeartRow {
  return {
    id: heart.id,
    session_id: heart.sessionId,
    sender_id: heart.senderId,
    recipient_id: heart.recipientId,
    source: heart.source,
    created_at: heart.createdAt
  };
}

export function mapHeartRow(row: HeartRow): HeartRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    source: row.source,
    createdAt: row.created_at
  };
}

export function mapReportToRow(report: ReportRecord): ReportRow {
  return {
    id: report.id,
    session_id: report.sessionId,
    reporter_id: report.reporterId,
    target_id: report.targetId,
    reason: report.reason,
    details: report.details,
    created_at: report.createdAt,
    resolved_at: report.resolvedAt,
    status: report.status
  };
}

export function mapReportRow(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    reporterId: row.reporter_id,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    status: row.status
  };
}

export function mapAuditToRow(entry: AuditLogRecord) {
  return {
    id: entry.id,
    session_id: entry.sessionId,
    action: entry.action,
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    message: entry.message,
    created_at: entry.createdAt,
    metadata: entry.metadata ?? null
  };
}

export function mapAuditRow(row: {
  id: string;
  session_id: string;
  action: AuditAction;
  actor_id: string;
  actor_role: AuditActorRole;
  message: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}): AuditLogRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    action: row.action,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    message: row.message,
    createdAt: row.created_at,
    metadata: row.metadata ?? undefined
  };
}

export function mapSeatingAssignmentToRow(
  assignment: SeatingAssignmentRecord
): SeatingAssignmentRow {
  return {
    id: assignment.id,
    session_id: assignment.sessionId,
    rotation_round: assignment.rotationRound,
    participant_id: assignment.participantId,
    table_id: assignment.tableId,
    assigned_at: assignment.assignedAt,
    assignment_source: assignment.assignmentSource
  };
}

export function mapSeatingAssignmentRow(
  row: SeatingAssignmentRow
): SeatingAssignmentRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    rotationRound: row.rotation_round,
    participantId: row.participant_id,
    tableId: row.table_id,
    assignedAt: row.assigned_at,
    assignmentSource: row.assignment_source
  };
}
