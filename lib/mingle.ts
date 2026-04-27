import type {
  AuditAction,
  AuditActorRole,
  AuditLogRecord,
  BlacklistRecord,
  BlacklistRow,
  CheckinDraft,
  HeartRecord,
  HeartRow,
  IncidentRecord,
  IncidentRow,
  ParticipantEncounterRecord,
  ParticipantGender,
  ParticipantRecord,
  ParticipantRow,
  ParticipantStatus,
  ProfileDraft,
  CustomerProfileSummary,
  BranchCustomerProfileSummary,
  StaffRecommendationSummary,
  ReportRecord,
  ReportRow,
  ContactExchangeRecord,
  SeatingAssignmentRecord,
  SeatingAssignmentRow,
  SessionRecord,
  SessionRow,
  SessionSnapshot,
  TableSummary,
  ToastState
} from "../types/mingle.ts";

export const STORAGE_KEYS = {
  viewer: "mingle:viewer:v3"
} as const;

export const MINGLE_CONSTANTS = {
  brandName: "Mingle",
  hqId: "hq_mingle",
  branchId: "branch_seongsu",
  eventId: "event_signature_20260412",
  sessionName: "Mingle Saturday Signature",
  branchName: "성수",
  venueName: "성수 루프하우스",
  venueAddress: "서울 성동구 성수이로 97, 3F",
  sessionDateLabel: "4월 12일 토요일",
  sessionTimeLabel: "19:30 입장 · 20:00 시작",
  attendanceLabel: "남녀 36명 · 시범 베타 세션",
  attendanceHint: "파일럿 운영 기준으로 테이블 밸런스와 흐름을 검증하는 베타 세션",
  defaultSessionCode: "2026",
  sessionExpiryHours: 12,
  pollingIntervalMs: 2000,
  rotationInstructionDeadlineMs: 3 * 60 * 1000,
  announcementTemplateId: "operator-announcement",
  tableCount: 6,
  tableCapacity: 6,
  initialHearts: 3
} as const;

export const STAFF_RECOMMENDATION_TAGS = [
  "추천 고객",
  "재초대 후보",
  "분위기 메이커",
  "대화 리드형",
  "외모 반응 좋음",
  "매너 좋음",
  "밸런스 카드",
  "주의 필요"
] as const;

// Presence threshold: if lastActiveAt is older than this, participant is considered physically gone.
// Offline events run 2–3 hours; 60 min without any app interaction is a reliable gone signal.
// IDLE is reserved for participants whose lastActiveAt is null (never used the app — display-only,
// no operational weight). The 8–30 min "IDLE band" was wrong for offline presence.
export const PARTICIPANT_GONE_THRESHOLD_MS = 60 * 60 * 1000;

export const ADMIN_DEFAULT_CONFIG = {
  tableCapacity: MINGLE_CONSTANTS.tableCapacity,
  initialHearts: MINGLE_CONSTANTS.initialHearts,
  rotationDeadlineMinutes: Math.round(MINGLE_CONSTANTS.rotationInstructionDeadlineMs / 60000),
  presenceGoneThresholdMinutes: Math.round(PARTICIPANT_GONE_THRESHOLD_MS / 60000),
  announcementTemplateId: MINGLE_CONSTANTS.announcementTemplateId,
  defaultProfileImagePaths: {
    male: "/avatars/male-default.png",
    female: "/avatars/female-default.png",
    unknown: "/avatars/default.png"
  }
} as const;

export function computeParticipantStatusMap(
  snapshot: SessionSnapshot,
  referenceMs = Date.now()
): Record<string, ParticipantStatus> {
  const goneThresholdMs =
    Math.max(1, snapshot.session.operationalConfig?.presenceGoneThresholdMinutes ?? 60) * 60 * 1000;
  const blockedIds = new Set((snapshot.blacklist ?? []).map((entry) => entry.participantId));
  const result: Record<string, ParticipantStatus> = {};

  for (const participant of snapshot.participants) {
    if (blockedIds.has(participant.id)) {
      result[participant.id] = "BLOCKED";
      continue;
    }
    const lastActiveMs = participant.lastActiveAt
      ? new Date(participant.lastActiveAt).getTime()
      : null;
    // null = participant has never opened the app (manual check-in, just arrived).
    // Display as IDLE — not operationally gone, just no app signal yet.
    if (lastActiveMs === null) {
      result[participant.id] = "IDLE";
      continue;
    }
    const elapsed = referenceMs - lastActiveMs;
    result[participant.id] = elapsed < goneThresholdMs ? "ACTIVE" : "GONE";
  }
  return result;
}

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
  "나연",
  "다은",
  "혜린",
  "소연",
  "아영",
  "유나"
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
  "동현",
  "재윤",
  "시후",
  "민혁",
  "태윤",
  "주원"
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

type SeedStat = {
  receivedHearts: number;
  sentHearts: number;
  profileViews: number;
  heartsRemaining: number;
  isVip?: boolean;
  isHighValue?: boolean;
};

type LegacyHeartBalance = {
  heartsRemaining?: number;
  legacySpentHearts?: number;
  legacyGrantedHearts?: number;
};

export function deriveHeartsRemaining(balance: LegacyHeartBalance) {
  if (typeof balance.heartsRemaining === "number") {
    return Math.max(0, balance.heartsRemaining);
  }

  return Math.max(
    0,
    MINGLE_CONSTANTS.initialHearts -
      (balance.legacySpentHearts ?? 0) +
      (balance.legacyGrantedHearts ?? 0)
  );
}

function remainingHearts(spent: number, granted = 0) {
  return Math.max(0, MINGLE_CONSTANTS.initialHearts - spent + granted);
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizePhoneNumber(phone: string | null | undefined) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("82")) {
    digits = `0${digits.slice(2)}`;
  }

  return digits.length >= 9 ? digits : null;
}

export function maskPhoneNumber(phone: string | null | undefined) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return null;
  }

  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}**-${normalized.slice(7)}`;
  }

  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 4)}**-${normalized.slice(6)}`;
  }

  return normalized;
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeEncounterHistory(
  encounterHistory: ParticipantEncounterRecord[] | undefined,
  metParticipantIds: string[] = []
) {
  const encounterMap = new Map<string, ParticipantEncounterRecord>();

  for (const encounter of encounterHistory ?? []) {
    encounterMap.set(encounter.participantId, {
      participantId: encounter.participantId,
      count: Math.max(1, encounter.count),
      lastRoundSeen: encounter.lastRoundSeen ?? 0,
      interactionStrength: encounter.interactionStrength ?? 0
    });
  }

  for (const participantId of metParticipantIds) {
    if (!encounterMap.has(participantId)) {
      encounterMap.set(participantId, {
        participantId,
        count: 1,
        lastRoundSeen: 0,
        interactionStrength: 0
      });
    }
  }

  return [...encounterMap.values()].sort(
    (left, right) => right.count - left.count || left.participantId.localeCompare(right.participantId, "ko")
  );
}

export function calculatePopularitySignal(participant: ParticipantRecord) {
  return Number(
    (
      participant.receivedHearts * 1.6 +
      participant.likedByParticipantIds.length * 1.8 +
      participant.profileViews * 0.18 +
      participant.sentHearts * 0.25
    ).toFixed(2)
  );
}

export function applyDerivedParticipantSignals(
  participants: ParticipantRecord[],
  hearts: HeartRecord[]
) {
  const likedMap = new Map<string, Set<string>>();
  const likedByMap = new Map<string, Set<string>>();

  for (const heart of hearts) {
    const liked = likedMap.get(heart.senderId) ?? new Set<string>();
    liked.add(heart.recipientId);
    likedMap.set(heart.senderId, liked);

    const likedBy = likedByMap.get(heart.recipientId) ?? new Set<string>();
    likedBy.add(heart.senderId);
    likedByMap.set(heart.recipientId, likedBy);
  }

  return participants.map((participant) => {
    const encounterHistory = normalizeEncounterHistory(
      participant.encounterHistory,
      participant.metParticipantIds
    );
    const likedParticipantIds = [...(likedMap.get(participant.id) ?? new Set<string>())];
    const likedByParticipantIds = [...(likedByMap.get(participant.id) ?? new Set<string>())];
    const enriched = {
      ...participant,
      encounterHistory,
      metParticipantIds: encounterHistory.map((item) => item.participantId),
      likedParticipantIds,
      likedByParticipantIds,
      lastActiveAt: participant.lastActiveAt ?? participant.joinedAt
    };

    return {
      ...enriched,
      popularityScore: calculatePopularitySignal(enriched)
    };
  });
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

export function generateSessionCode(seed = Date.now()) {
  const numeric = Math.abs(seed % 10000);
  return numeric.toString().padStart(4, "0");
}

export function isSessionExpired(startedAt: string, now = new Date()) {
  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) return false;
  const elapsed = now.getTime() - startedMs;
  return elapsed >= MINGLE_CONSTANTS.sessionExpiryHours * 60 * 60 * 1000;
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
  joinedOffsetMinutes: number,
  baseTime: Date
): ParticipantRecord {
  const joinedAt = new Date(baseTime.getTime() - joinedOffsetMinutes * 60 * 1000).toISOString();
  return {
    id,
    sessionId: "session_signature_20260412",
    branchId: MINGLE_CONSTANTS.branchId,
    reservationId: `reservation_${id}`,
    reservationExternalId: null,
    phone: null,
    nickname,
    gender,
    age,
    jobCategory,
    job,
    photoUrl: buildPhoto(tableId + age),
    heightCm,
    animalType,
    energyType,
    checkinMode: "qr",
    tableId,
    round2Attendance: "UNDECIDED",
    receivedHearts: stats.receivedHearts,
    sentHearts: stats.sentHearts,
    profileViews: stats.profileViews,
    heartsRemaining: stats.heartsRemaining,
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
    isVip: stats.isVip ?? false,
    isHighValue: stats.isHighValue ?? false,
    joinedAt,
    lastActiveAt: joinedAt
  };
}

function buildSeedParticipants(baseTime: Date) {
  const participants: ParticipantRecord[] = [
    participantSeed("f_01", FEMALE_NAMES[0], "F", "사업개발/기획", "사업개발", 1, 28, 166, "고양이상", "E", { receivedHearts: 6, sentHearts: 2, profileViews: 11, heartsRemaining: remainingHearts(2), isHighValue: true }, 1, baseTime),
    participantSeed("m_01", MALE_NAMES[0], "M", "IT/프로덕트", "백엔드", 1, 30, 181, "강아지상", "I", { receivedHearts: 3, sentHearts: 4, profileViews: 8, heartsRemaining: remainingHearts(3) }, 2, baseTime),
    participantSeed("f_02", FEMALE_NAMES[1], "F", "브랜드/마케팅", "브랜드 마케터", 1, 27, 163, "여우상", "I", { receivedHearts: 5, sentHearts: 3, profileViews: 9, heartsRemaining: remainingHearts(1) }, 3, baseTime),
    participantSeed("m_02", MALE_NAMES[1], "M", "금융/전문직", "컨설턴트", 1, 31, 178, "곰상", "E", { receivedHearts: 1, sentHearts: 1, profileViews: 4, heartsRemaining: remainingHearts(1) }, 4, baseTime),
    participantSeed("f_03", FEMALE_NAMES[2], "F", "IT/프로덕트", "프로덕트 디자이너", 1, 26, 165, "토끼상", "E", { receivedHearts: 4, sentHearts: 4, profileViews: 10, heartsRemaining: remainingHearts(3) }, 5, baseTime),
    participantSeed("m_03", MALE_NAMES[2], "M", "사업개발/기획", "서비스 기획", 2, 29, 182, "사슴상", "E", { receivedHearts: 5, sentHearts: 2, profileViews: 10, heartsRemaining: remainingHearts(2) }, 6, baseTime),
    participantSeed("f_04", FEMALE_NAMES[3], "F", "커뮤니티/교육", "커뮤니티 매니저", 2, 29, 167, "강아지상", "I", { receivedHearts: 2, sentHearts: 2, profileViews: 6, heartsRemaining: remainingHearts(1) }, 7, baseTime),
    participantSeed("m_04", MALE_NAMES[3], "M", "브랜드/마케팅", "콘텐츠 에디터", 2, 27, 176, "고양이상", "I", { receivedHearts: 0, sentHearts: 1, profileViews: 2, heartsRemaining: remainingHearts(1) }, 8, baseTime),
    participantSeed("f_05", FEMALE_NAMES[4], "F", "금융/전문직", "애널리스트", 2, 30, 168, "사슴상", "E", { receivedHearts: 7, sentHearts: 3, profileViews: 12, heartsRemaining: remainingHearts(3, 1), isHighValue: true }, 9, baseTime),
    participantSeed("m_05", MALE_NAMES[4], "M", "IT/프로덕트", "프론트엔드", 2, 26, 179, "여우상", "E", { receivedHearts: 2, sentHearts: 3, profileViews: 6, heartsRemaining: remainingHearts(3) }, 10, baseTime),
    participantSeed("f_06", FEMALE_NAMES[5], "F", "크리에이티브", "아트 디렉터", 3, 27, 164, "고양이상", "I", { receivedHearts: 3, sentHearts: 1, profileViews: 5, heartsRemaining: remainingHearts(1) }, 11, baseTime),
    participantSeed("m_06", MALE_NAMES[5], "M", "사업개발/기획", "운영 기획", 3, 28, 180, "곰상", "I", { receivedHearts: 0, sentHearts: 0, profileViews: 1, heartsRemaining: remainingHearts(0) }, 12, baseTime),
    participantSeed("f_07", FEMALE_NAMES[6], "F", "브랜드/마케팅", "PR", 3, 25, 162, "강아지상", "E", { receivedHearts: 4, sentHearts: 4, profileViews: 8, heartsRemaining: remainingHearts(3) }, 13, baseTime),
    participantSeed("m_07", MALE_NAMES[6], "M", "커뮤니티/교육", "HR", 3, 29, 177, "토끼상", "E", { receivedHearts: 1, sentHearts: 1, profileViews: 3, heartsRemaining: remainingHearts(1) }, 14, baseTime),
    participantSeed("f_08", FEMALE_NAMES[7], "F", "IT/프로덕트", "데이터 분석가", 3, 28, 169, "사슴상", "E", { receivedHearts: 6, sentHearts: 2, profileViews: 11, heartsRemaining: remainingHearts(2), isVip: true, isHighValue: true }, 15, baseTime),
    participantSeed("m_08", MALE_NAMES[7], "M", "금융/전문직", "변호사", 4, 32, 183, "강아지상", "I", { receivedHearts: 5, sentHearts: 3, profileViews: 9, heartsRemaining: remainingHearts(2), isHighValue: true }, 16, baseTime),
    participantSeed("f_09", FEMALE_NAMES[8], "F", "사업개발/기획", "프로젝트 매니저", 4, 29, 166, "곰상", "E", { receivedHearts: 2, sentHearts: 3, profileViews: 7, heartsRemaining: remainingHearts(2) }, 17, baseTime),
    participantSeed("m_09", MALE_NAMES[8], "M", "브랜드/마케팅", "퍼포먼스 마케터", 4, 28, 178, "여우상", "E", { receivedHearts: 1, sentHearts: 0, profileViews: 3, heartsRemaining: remainingHearts(0) }, 18, baseTime),
    participantSeed("f_10", FEMALE_NAMES[9], "F", "크리에이티브", "사진가", 4, 27, 165, "토끼상", "I", { receivedHearts: 3, sentHearts: 2, profileViews: 6, heartsRemaining: remainingHearts(2) }, 19, baseTime),
    participantSeed("m_10", MALE_NAMES[9], "M", "IT/프로덕트", "프론트엔드", 4, 30, 181, "고양이상", "E", { receivedHearts: 4, sentHearts: 2, profileViews: 7, heartsRemaining: remainingHearts(2) }, 20, baseTime),
    participantSeed("f_11", FEMALE_NAMES[10], "F", "커뮤니티/교육", "교사", 5, 26, 161, "여우상", "E", { receivedHearts: 1, sentHearts: 1, profileViews: 4, heartsRemaining: remainingHearts(1) }, 21, baseTime),
    participantSeed("m_11", MALE_NAMES[10], "M", "사업개발/기획", "사업개발", 5, 31, 184, "강아지상", "I", { receivedHearts: 6, sentHearts: 4, profileViews: 12, heartsRemaining: remainingHearts(3), isHighValue: true }, 22, baseTime),
    participantSeed("f_12", FEMALE_NAMES[11], "F", "브랜드/마케팅", "콘텐츠 에디터", 5, 24, 163, "사슴상", "E", { receivedHearts: 2, sentHearts: 1, profileViews: 5, heartsRemaining: remainingHearts(1) }, 23, baseTime),
    participantSeed("m_12", MALE_NAMES[11], "M", "금융/전문직", "회계사", 5, 29, 179, "곰상", "E", { receivedHearts: 2, sentHearts: 2, profileViews: 5, heartsRemaining: remainingHearts(2) }, 24, baseTime),
    participantSeed("f_13", FEMALE_NAMES[12], "F", "크리에이티브", "영상 제작", 5, 28, 167, "고양이상", "I", { receivedHearts: 7, sentHearts: 4, profileViews: 14, heartsRemaining: remainingHearts(3, 2), isHighValue: true }, 25, baseTime),
    participantSeed("m_13", MALE_NAMES[12], "M", "IT/프로덕트", "백엔드", 6, 29, 180, "강아지상", "E", { receivedHearts: 3, sentHearts: 2, profileViews: 6, heartsRemaining: remainingHearts(2) }, 26, baseTime),
    participantSeed("f_14", FEMALE_NAMES[13], "F", "브랜드/마케팅", "브랜드 마케터", 6, 27, 165, "여우상", "I", { receivedHearts: 4, sentHearts: 3, profileViews: 8, heartsRemaining: remainingHearts(3) }, 27, baseTime),
    participantSeed("m_14", MALE_NAMES[13], "M", "금융/전문직", "애널리스트", 6, 30, 182, "곰상", "I", { receivedHearts: 2, sentHearts: 1, profileViews: 5, heartsRemaining: remainingHearts(1) }, 28, baseTime),
    participantSeed("f_15", FEMALE_NAMES[14], "F", "커뮤니티/교육", "커뮤니티 매니저", 6, 26, 162, "토끼상", "E", { receivedHearts: 1, sentHearts: 2, profileViews: 4, heartsRemaining: remainingHearts(2) }, 29, baseTime),
    participantSeed("m_15", MALE_NAMES[14], "M", "사업개발/기획", "서비스 기획", 6, 28, 178, "사슴상", "E", { receivedHearts: 4, sentHearts: 4, profileViews: 9, heartsRemaining: remainingHearts(3) }, 30, baseTime),
    participantSeed("f_16", FEMALE_NAMES[15], "F", "크리에이티브", "작가", 4, 29, 166, "고양이상", "I", { receivedHearts: 3, sentHearts: 2, profileViews: 7, heartsRemaining: remainingHearts(2) }, 31, baseTime),
    participantSeed("m_16", MALE_NAMES[15], "M", "IT/프로덕트", "프론트엔드", 4, 27, 177, "강아지상", "E", { receivedHearts: 2, sentHearts: 3, profileViews: 6, heartsRemaining: remainingHearts(3) }, 32, baseTime),
    participantSeed("f_17", FEMALE_NAMES[16], "F", "금융/전문직", "회계사", 3, 30, 168, "사슴상", "E", { receivedHearts: 5, sentHearts: 1, profileViews: 8, heartsRemaining: remainingHearts(1) }, 33, baseTime),
    participantSeed("m_17", MALE_NAMES[16], "M", "브랜드/마케팅", "퍼포먼스 마케터", 3, 28, 179, "여우상", "I", { receivedHearts: 1, sentHearts: 2, profileViews: 4, heartsRemaining: remainingHearts(2) }, 34, baseTime),
    participantSeed("f_18", FEMALE_NAMES[17], "F", "사업개발/기획", "프로젝트 매니저", 2, 27, 164, "토끼상", "E", { receivedHearts: 3, sentHearts: 3, profileViews: 7, heartsRemaining: remainingHearts(3) }, 35, baseTime),
    participantSeed("m_18", MALE_NAMES[17], "M", "커뮤니티/교육", "HR", 2, 31, 183, "곰상", "E", { receivedHearts: 2, sentHearts: 1, profileViews: 5, heartsRemaining: remainingHearts(1) }, 36, baseTime)
  ];

  const groupedByTable = new Map<number, string[]>();
  for (const participant of participants) {
    const existing = groupedByTable.get(participant.tableId) ?? [];
    existing.push(participant.id);
    groupedByTable.set(participant.tableId, existing);
  }

  for (const participant of participants) {
    const metParticipantIds = (groupedByTable.get(participant.tableId) ?? []).filter(
      (id) => id !== participant.id
    );
    participant.metParticipantIds = metParticipantIds;
    participant.encounterHistory = metParticipantIds.map((participantId) => ({
      participantId,
      count: 1,
      lastRoundSeen: 0,
      interactionStrength: 0
    }));
  }

  return participants;
}

export function createSeedSnapshot(): SessionSnapshot {
  const now = new Date("2026-04-25T19:30:00.000Z");
  const nowIso = now.toISOString();
  const sessionCode = MINGLE_CONSTANTS.defaultSessionCode;
  const participants = buildSeedParticipants(now);
  const hearts: HeartRecord[] = [
    { id: "heart_01", sessionId: "session_signature_20260412", senderId: "m_03", recipientId: "f_01", createdAt: nowIso },
    { id: "heart_02", sessionId: "session_signature_20260412", senderId: "f_01", recipientId: "m_03", createdAt: nowIso },
    { id: "heart_03", sessionId: "session_signature_20260412", senderId: "f_05", recipientId: "m_11", createdAt: nowIso },
    { id: "heart_04", sessionId: "session_signature_20260412", senderId: "m_11", recipientId: "f_05", createdAt: nowIso },
    { id: "heart_05", sessionId: "session_signature_20260412", senderId: "m_15", recipientId: "f_14", createdAt: nowIso },
    { id: "heart_06", sessionId: "session_signature_20260412", senderId: "f_14", recipientId: "m_15", createdAt: nowIso },
    { id: "heart_07", sessionId: "session_signature_20260412", senderId: "m_16", recipientId: "f_16", createdAt: nowIso },
    { id: "heart_08", sessionId: "session_signature_20260412", senderId: "f_18", recipientId: "m_02", createdAt: nowIso }
  ];
  const contactExchanges: ContactExchangeRecord[] = [
    {
      id: "contact_exchange_pending_01",
      sessionId: "session_signature_20260412",
      participantAId: "f_01",
      participantBId: "m_03",
      participantAConsented: true,
      participantBConsented: false,
      participantAMethods: { realName: "김지민", phone: "01012345678" },
      participantBMethods: null,
      status: "PENDING",
      requestedAt: nowIso,
      completedAt: null
    },
    {
      id: "contact_exchange_completed_01",
      sessionId: "session_signature_20260412",
      participantAId: "f_05",
      participantBId: "m_11",
      participantAConsented: true,
      participantBConsented: true,
      participantAMethods: { realName: "이은서", kakaoId: "eunseo_beta" },
      participantBMethods: { realName: "박승현", phone: "01087654321" },
      status: "COMPLETED",
      requestedAt: nowIso,
      completedAt: nowIso
    }
  ];
  const seatingAssignments = participants.map<SeatingAssignmentRecord>((participant) => ({
    id: `seat_${participant.id}_0`,
    sessionId: "session_signature_20260412",
    rotationRound: 0,
    participantId: participant.id,
    tableId: participant.tableId,
    assignedAt: nowIso,
    assignmentSource: "INITIAL"
  }));

  return {
    version: 1,
    session: {
      id: "session_signature_20260412",
      name: MINGLE_CONSTANTS.sessionName,
      hqId: MINGLE_CONSTANTS.hqId,
      branchId: MINGLE_CONSTANTS.branchId,
      branchName: MINGLE_CONSTANTS.branchName,
      eventId: MINGLE_CONSTANTS.eventId,
      venueName: MINGLE_CONSTANTS.venueName,
      venueAddress: MINGLE_CONSTANTS.venueAddress,
      sessionDateLabel: MINGLE_CONSTANTS.sessionDateLabel,
      sessionTimeLabel: MINGLE_CONSTANTS.sessionTimeLabel,
      attendanceLabel: MINGLE_CONSTANTS.attendanceLabel,
      attendanceHint: MINGLE_CONSTANTS.attendanceHint,
      code: sessionCode,
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: nowIso,
      updatedAt: nowIso,
      tableCount: MINGLE_CONSTANTS.tableCount,
      tableCapacity: MINGLE_CONSTANTS.tableCapacity,
      operationalConfig: {
        initialHearts: ADMIN_DEFAULT_CONFIG.initialHearts,
        rotationDeadlineMinutes: ADMIN_DEFAULT_CONFIG.rotationDeadlineMinutes,
        presenceGoneThresholdMinutes: ADMIN_DEFAULT_CONFIG.presenceGoneThresholdMinutes,
        defaultProfileImagePaths: {
          male: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.male,
          female: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.female,
          unknown: ADMIN_DEFAULT_CONFIG.defaultProfileImagePaths.unknown
        }
      },
      customerSessionVersion: 1
    },
    participants: applyDerivedParticipantSignals(participants, hearts),
    hearts,
    reports: [],
    blacklist: [
      {
        id: "blacklist_seed_01",
        sessionId: "session_signature_20260412",
        branchId: MINGLE_CONSTANTS.branchId,
        participantId: "m_06",
        reason: "운영 제한 샘플",
        createdAt: nowIso
      }
    ],
    incidents: [],
    auditLogs: [
      {
        id: "audit_bootstrap",
        sessionId: "session_signature_20260412",
        action: "SESSION_BOOTSTRAP",
        actorId: "system",
        actorRole: "SYSTEM",
        message: "데모 운영 세션을 초기화했습니다.",
        createdAt: nowIso,
        metadata: { tableCount: MINGLE_CONSTANTS.tableCount }
      }
    ],
    seatingAssignments,
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    tableImpressionPicks: [],
    tablePickWindows: [],
    tableQrCodes: [],
    contactExchanges,
    outboxEvents: [],
    announcements: [],
    rotationInstruction: null
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
    energyType: "",
    fullName: "",
    contact: "",
    birthYear: "",
    onboardingGoal: "",
    idealType1: "",
    idealType2: "",
    idealType3: "",
    consentPrivacy: false,
    consentPortrait: false,
    customJobInput: ""
  };
}

export function createEmptyCheckinDraft(): CheckinDraft {
  return {
    value: "",
    flowState: "IDLE",
    customerMessage: null,
    customerSecondaryMessage: null,
    isSubmitting: false,
    isVerified: false,
    error: null,
    resolution: null
  };
}

// Cached for client convenience only. Session hydrate revalidates this against the current snapshot.
export function getCachedViewerState() {
  if (typeof window === "undefined") {
    return { cachedParticipantId: null };
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.viewer);
  if (!raw) {
    return { cachedParticipantId: null };
  }

  try {
    const parsed = JSON.parse(raw) as {
      cachedParticipantId?: string | null;
      viewerParticipantId?: string | null;
    };
    return {
      cachedParticipantId: parsed.cachedParticipantId ?? parsed.viewerParticipantId ?? null
    };
  } catch {
    return { cachedParticipantId: null };
  }
}

export function setCachedParticipantId(cachedParticipantId: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.viewer, JSON.stringify({ cachedParticipantId }));
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
  metadata: Record<string, unknown> | undefined,
  sessionId: string
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

export function selectLeastCrowdedTable(participants: ParticipantRecord[], tableCount: number) {
  const occupancy = new Map<number, number>();
  for (let tableId = 1; tableId <= tableCount; tableId += 1) {
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

export function buildCustomerProfileSummaries(snapshot: SessionSnapshot): CustomerProfileSummary[] {
  const blacklistIds = new Set((snapshot.blacklist ?? []).map((entry) => entry.participantId));
  const reportTargetIds = new Set(snapshot.reports.map((report) => report.targetId));
  const pairKeys = new Set<string>();
  for (const heart of snapshot.hearts) {
    const reverse = snapshot.hearts.some(
      (next) => next.senderId === heart.recipientId && next.recipientId === heart.senderId
    );
    if (reverse) {
      pairKeys.add([heart.senderId, heart.recipientId].sort().join(":"));
    }
  }

  return snapshot.participants.map((participant) => {
    const mutualMatches = Array.from(pairKeys).filter((pairKey) =>
      pairKey.split(":").includes(participant.id)
    ).length;
    const branchProfile: BranchCustomerProfileSummary = {
      customerId: participant.id,
      branchId: participant.branchId,
      branchVisitCount: 1,
      branchReceivedHearts: participant.receivedHearts,
      branchMutualMatches: mutualMatches,
      staffRecommendation: {
        recommended: false,
        grade: null,
        tags: [],
        memo: null
      } satisfies StaffRecommendationSummary
    };

    return {
      customerId: participant.id,
      name: participant.nickname,
      phone: normalizePhoneNumber(participant.phone),
      gender: participant.gender,
      age: participant.age,
      heightCm: participant.heightCm,
      job: participant.job,
      totalVisitCount: 1,
      totalReceivedHearts: participant.receivedHearts,
      totalMutualMatches: mutualMatches,
      totalContactExchanges: (snapshot.contactExchanges ?? []).filter(
        (exchange) =>
          exchange.status === "COMPLETED" &&
          (exchange.participantAId === participant.id || exchange.participantBId === participant.id)
      ).length,
      globalPopularityScore: Number.isFinite(participant.popularityScore)
        ? participant.popularityScore
        : null,
      isBlacklisted: blacklistIds.has(participant.id),
      hasReportHistory: reportTargetIds.has(participant.id),
      branchProfiles: [branchProfile]
    } satisfies CustomerProfileSummary;
  });
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
    hq_id: snapshot.session.hqId,
    branch_id: snapshot.session.branchId,
    branch_name: snapshot.session.branchName,
    event_id: snapshot.session.eventId,
    venue_name: snapshot.session.venueName,
    venue_address: snapshot.session.venueAddress,
    session_date_label: snapshot.session.sessionDateLabel,
    session_time_label: snapshot.session.sessionTimeLabel,
    attendance_label: snapshot.session.attendanceLabel,
    attendance_hint: snapshot.session.attendanceHint,
    code: snapshot.session.code,
    phase: snapshot.session.phase,
    reveal_senders: snapshot.session.revealSenders,
    reveal_triggered_at: snapshot.session.revealTriggeredAt,
    started_at: snapshot.session.startedAt,
    updated_at: snapshot.session.updatedAt,
    table_count: snapshot.session.tableCount,
    table_capacity: snapshot.session.tableCapacity,
    customer_session_version: snapshot.session.customerSessionVersion,
    active_content_ids: snapshot.activeContentIds,
    snapshot_version: snapshot.version
  };
}

export function mapSessionRow(row: SessionRow) {
  return {
    session: {
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
      revealSenders: row.reveal_senders,
      revealTriggeredAt: row.reveal_triggered_at,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      tableCount: row.table_count,
      tableCapacity: row.table_capacity,
      customerSessionVersion: row.customer_session_version
    } satisfies SessionRecord,
    activeContentIds: row.active_content_ids,
    version: row.snapshot_version
  };
}

export function mapParticipantToRow(sessionId: string, participant: ParticipantRecord): ParticipantRow {
  return {
    id: participant.id,
    session_id: participant.sessionId || sessionId,
    branch_id: participant.branchId,
    reservation_id: participant.reservationId,
    reservation_external_id: participant.reservationExternalId ?? null,
    phone: normalizePhoneNumber(participant.phone),
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
    round2_attendance: participant.round2Attendance,
    received_hearts: participant.receivedHearts,
    sent_hearts: participant.sentHearts,
    profile_views: participant.profileViews,
    hearts_remaining: participant.heartsRemaining,
    met_participant_ids: participant.metParticipantIds,
    encounter_history: participant.encounterHistory.map((encounter) => ({
      participant_id: encounter.participantId,
      count: encounter.count,
      last_round_seen: encounter.lastRoundSeen,
      interaction_strength: encounter.interactionStrength
    })),
    liked_participant_ids: participant.likedParticipantIds,
    liked_by_participant_ids: participant.likedByParticipantIds,
    popularity_score: participant.popularityScore,
    tier: participant.tier,
    sub_tier: participant.subTier,
    score: participant.score,
    attraction_score: participant.attractionScore,
    engagement_score: participant.engagementScore,
    is_vip: participant.isVip,
    is_high_value: participant.isHighValue,
    joined_at: participant.joinedAt,
    last_active_at: participant.lastActiveAt
  };
}

export function mapParticipantRow(row: ParticipantRow): ParticipantRecord {
  const legacyRow = row as ParticipantRow & Record<string, unknown>;
  const legacySpentHearts = Number(legacyRow["used_" + "free_hearts"] ?? 0);
  const legacyGrantedHearts = Number(legacyRow["paid_" + "heart_balance"] ?? 0);

  return {
    id: row.id,
    sessionId: row.session_id,
    branchId: row.branch_id,
    reservationId: row.reservation_id,
    reservationExternalId: row.reservation_external_id,
    phone: normalizePhoneNumber(row.phone),
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
    round2Attendance: row.round2_attendance ?? "UNDECIDED",
    receivedHearts: row.received_hearts,
    sentHearts: row.sent_hearts,
    profileViews: row.profile_views,
    heartsRemaining: deriveHeartsRemaining({
      heartsRemaining: row.hearts_remaining,
      legacySpentHearts,
      legacyGrantedHearts
    }),
    metParticipantIds: row.met_participant_ids,
    encounterHistory: normalizeEncounterHistory(
      row.encounter_history?.map((encounter) => ({
        participantId: encounter.participant_id,
        count: encounter.count,
        lastRoundSeen: encounter.last_round_seen,
        interactionStrength: encounter.interaction_strength
      })),
      row.met_participant_ids
    ),
    likedParticipantIds: row.liked_participant_ids ?? [],
    likedByParticipantIds: row.liked_by_participant_ids ?? [],
    popularityScore: row.popularity_score ?? 0,
    tier: row.tier,
    subTier: row.sub_tier,
    score: row.score,
    attractionScore: row.attraction_score,
    engagementScore: row.engagement_score,
    isVip: row.is_vip,
    isHighValue: row.is_high_value,
    joinedAt: row.joined_at,
    lastActiveAt: row.last_active_at ?? row.joined_at
  };
}

export function mapHeartToRow(heart: HeartRecord): HeartRow {
  return {
    id: heart.id,
    session_id: heart.sessionId,
    sender_id: heart.senderId,
    recipient_id: heart.recipientId,
    created_at: heart.createdAt
  };
}

export function mapHeartRow(row: HeartRow): HeartRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
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

export function mapBlacklistToRow(entry: BlacklistRecord): BlacklistRow {
  return {
    id: entry.id,
    session_id: entry.sessionId,
    branch_id: entry.branchId,
    participant_id: entry.participantId,
    reason: entry.reason,
    created_at: entry.createdAt
  };
}

export function mapBlacklistRow(row: BlacklistRow): BlacklistRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    branchId: row.branch_id,
    participantId: row.participant_id,
    reason: row.reason,
    createdAt: row.created_at
  };
}

export function mapIncidentToRow(entry: IncidentRecord): IncidentRow {
  return {
    id: entry.id,
    session_id: entry.sessionId,
    branch_id: entry.branchId,
    reporter_id: entry.reporterId,
    target_id: entry.targetId,
    type: entry.type,
    message: entry.message,
    timestamp: entry.timestamp
  };
}

export function mapIncidentRow(row: IncidentRow): IncidentRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    branchId: row.branch_id,
    reporterId: row.reporter_id,
    targetId: row.target_id,
    type: row.type,
    message: row.message,
    timestamp: row.timestamp
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
