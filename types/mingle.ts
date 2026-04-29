export type SessionPhase = "CHECKIN" | "ROUND_1" | "BREAK" | "ROUND_2" | "CLOSED" | "MATCH_END";
export type ParticipantSessionState = "ACTIVE" | "LOGGED_OUT" | "LEFT" | "BLOCKED";
export type PresenceState = "CHECKED_IN" | "TEMP_AWAY" | "NO_SHOW" | "RE_ENTERED";
export type SessionOperationalState = "ROUND_1" | "BREAK" | "ROUND_2" | "CLOSED";
export type CheckinMode = "qr" | "code" | "staff";
export type CheckinFlowState =
  | "IDLE"
  | "LOADING"
  | "SUCCESS"
  | "RE_ENTRY"
  | "BLOCKED"
  | "FAILURE";
export type ParticipantStatus = "ACTIVE" | "IDLE" | "GONE" | "BLOCKED";
export type TableState = "NORMAL" | "LOW_ACTIVITY" | "COLLAPSING";
export type ParticipantGender = "M" | "F";
export const DEFAULT_AVATAR_BY_GENDER: Record<ParticipantGender, string> = {
  M: "/avatars/male-default.png",
  F: "/avatars/female-default.png"
};
export type EnergyType = "E" | "I";
export type ParticipantTier = "A" | "B" | "C";
export type ParticipantSubTier = "HIGH" | "MID" | "LOW";
export type CustomerTab = "all" | "table" | "content" | "me";
export type AdminPanel =
  | "live"
  | "rotation"
  | "content"
  | "reports"
  | "admin-users"
  | "branches"
  | "sessions";
export type AdminRole = "HQ_ADMIN" | "BRANCH_ADMIN" | "STAFF";
export type SessionLifecycleStatus = "DRAFT" | "OPEN" | "CLOSED" | "DISABLED";
export type Round2Attendance = "UNDECIDED" | "YES" | "NO";
export type RevealStateKey =
  | "round1-count-only"
  | "round2-waiting-admin"
  | "round2-revealed";
export type AuditActorRole = "CUSTOMER" | "ADMIN" | "SYSTEM";
export type RotationPriority = "HIGH" | "MEDIUM" | "LOW";
export type InterventionKind =
  | "COLD_TABLE"
  | "DROP_RISK"
  | "REVEAL_READY"
  | "ROTATION_READY"
  | "VIP_PROTECTION";
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED";
export type EventStatus = "ACTIVE" | "ARCHIVED";
export type IncidentType =
  | "REPORT_SUBMITTED"
  | "BLACKLIST_BLOCKED"
  | "HIGH_FREQUENCY_ACTION"
  | "SUSPICIOUS_PATTERN";
export type ContentKind =
  | "prompt"
  | "vote"
  | "announcement"
  | "anonymous"
  | "nudge"
  | "table_impression_pick";
export type ContentScope = "ALL" | "TABLE";
export type ContentStatus = "LIVE" | "COMPLETED";
export type ContentPhasePolicy = "ROUND_1" | "ROUND_2" | "ALL";
export type AuditAction =
  | "SESSION_BOOTSTRAP"
  | "CHECKIN_VERIFIED"
  | "PROFILE_COMPLETED"
  | "PROFILE_UPDATED"
  | "PROFILE_VIEWED"
  | "HEART_SENT"
  | "PHASE_CHANGED"
  | "SESSION_STATE_CHANGED"
  | "REVEAL_TOGGLED"
  | "ROTATION_PREVIEWED"
  | "ROTATION_APPLIED"
  | "ROTATION_ACKNOWLEDGED"
  | "BLACKLIST_UPDATED"
  | "REPORT_SUBMITTED"
  | "REPORT_RESOLVED"
  | "CONTENT_ACTIVATED"
  | "CONTENT_RESPONDED"
  | "ANNOUNCEMENT_PUBLISHED"
  | "POLL_SYNC"
  | "PARTICIPANT_MOVED"
  | "MANUAL_PARTICIPANT_CREATED"
  | "RESERVATION_IMPORT_APPLIED"
  | "CONTACT_EXCHANGE_UPDATED"
  | "SESSION_CONFIG_UPDATED";

export interface SessionRecord {
  id: string;
  name: string;
  hqId: string;
  branchId: string;
  branchName: string;
  eventId: string;
  venueName: string;
  venueAddress: string;
  sessionDateLabel: string;
  sessionTimeLabel: string;
  attendanceLabel: string;
  attendanceHint: string;
  code: string;
  phase: SessionPhase;
  revealSenders: boolean;
  revealTriggeredAt: string | null;
  startedAt: string;
  updatedAt: string;
  tableCount: number;
  tableCapacity: number;
  operationalConfig?: SessionOperationalConfig;
  customerSessionVersion: number;
  lifecycleStatus?: SessionLifecycleStatus;
}

export interface SessionOperationalConfig {
  initialHearts: number;
  rotationDeadlineMinutes: number;
  presenceGoneThresholdMinutes: number;
  defaultProfileImagePaths: {
    male: string;
    female: string;
    unknown: string;
  };
}

export interface ParticipantEncounterRecord {
  participantId: string;
  count: number;
  lastRoundSeen: number;
  interactionStrength: number;
}

export interface ParticipantRecord {
  id: string;
  sessionId: string;
  branchId: string;
  reservationId: string | null;
  reservationExternalId?: string | null;
  phone?: string | null;
  nickname: string;
  gender: ParticipantGender;
  age: number;
  jobCategory: string;
  job: string;
  photoUrl: string | null;
  heightCm: number;
  animalType: string;
  energyType: EnergyType;
  checkinMode: CheckinMode;
  tableId: number;
  round2Attendance: Round2Attendance;
  receivedHearts: number;
  sentHearts: number;
  profileViews: number;
  heartsRemaining: number;
  metParticipantIds: string[];
  encounterHistory: ParticipantEncounterRecord[];
  likedParticipantIds: string[];
  likedByParticipantIds: string[];
  popularityScore: number;
  tier: ParticipantTier;
  subTier: ParticipantSubTier;
  score: number;
  attractionScore: number;
  engagementScore: number;
  isVip: boolean;
  isHighValue: boolean;
  joinedAt: string;
  lastActiveAt: string | null;
  participantSessionState?: ParticipantSessionState;
  presenceState?: PresenceState;
}

export interface HeartRecord {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
}

export interface SeatingAssignmentRecord {
  id: string;
  sessionId: string;
  rotationRound: number;
  participantId: string;
  tableId: number;
  assignedAt: string;
  assignmentSource: "INITIAL" | "ROTATION_APPLY" | "ADMIN_MOVE";
}

export interface ReportRecord {
  id: string;
  sessionId: string;
  reporterId: string;
  targetId: string;
  reason: string;
  details: string;
  createdAt: string;
  resolvedAt: string | null;
  status: ReportStatus;
}

export interface BlacklistRecord {
  id: string;
  sessionId: string;
  branchId: string;
  participantId: string;
  reason: string;
  createdAt: string;
}

export interface IncidentRecord {
  id: string;
  sessionId: string;
  branchId: string;
  reporterId: string | null;
  targetId: string | null;
  type: IncidentType;
  message: string;
  timestamp: string;
}

export interface AuditLogRecord {
  id: string;
  sessionId: string;
  action: AuditAction;
  actorId: string;
  actorRole: AuditActorRole;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ContentTemplateRecord {
  id: string;
  kind: ContentKind;
  title: string;
  description: string;
  ctaLabel: string;
  phasePolicy: ContentPhasePolicy;
  scope: ContentScope;
  durationSec: number;
  options?: string[];
  allowMessage?: boolean;
  allowTargetSelection?: boolean;
}

export interface LiveContentRecord {
  id: string;
  templateId: string;
  kind: ContentKind;
  title: string;
  description: string;
  ctaLabel: string;
  scope: ContentScope;
  targetTableId: number | null;
  createdAt: string;
  expiresAt: string | null;
  status: ContentStatus;
  options: string[];
  message: string | null;
}

export interface ContentResponseRecord {
  id: string;
  contentId: string;
  participantId: string;
  tableId: number;
  value: string;
  recipientId: string | null;
  createdAt: string;
}

export interface AnonymousMessageRecord {
  id: string;
  sessionId: string;
  contentBlockId: string;
  senderParticipantId: string;
  receiverParticipantId: string | null;
  receiverHint: string | null;
  message: string;
  revealSender: boolean;
  isSelected: boolean;
  selectedAt: string | null;
  moderationStatus: "PENDING" | "APPROVED" | "HIDDEN";
  createdAt: string;
  updatedAt: string;
}

export type TablePickType = "WANT_TO_KNOW" | "FUNNY";
export type TablePickWindowStatus = "OPEN" | "CLOSED";

export interface TableImpressionPickRecord {
  id: string;
  sessionId: string;
  contentBlockId: string | null;
  pickerParticipantId: string;
  targetParticipantId: string;
  tableId: number;
  rotationIndex: 0 | 1;
  pickType: TablePickType;
  createdAt: string;
  updatedAt: string;
}

export interface TablePickWindowRecord {
  id: string;
  sessionId: string;
  rotationIndex: 0 | 1;
  status: TablePickWindowStatus;
  openedAt: string;
  closedAt: string | null;
}

export interface TableQrCodeRecord {
  id: string;
  branchId: string;
  sessionId: string;
  tableId: number;
  code: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  revokedAt: string | null;
}

export interface ContactExchangeMethod {
  realName?: string;
  phone?: string;
  kakaoId?: string;
  instagramId?: string;
}

export interface ContactExchangeRecord {
  id: string;
  sessionId: string;
  participantAId: string;
  participantBId: string;
  participantAConsented: boolean;
  participantBConsented: boolean;
  participantAMethods: ContactExchangeMethod | null;
  participantBMethods: ContactExchangeMethod | null;
  status: "PENDING" | "COMPLETED" | "BLOCKED";
  requestedAt: string;
  completedAt: string | null;
}

export interface ContactExchangeStats {
  totalRequests: number;
  pendingCount: number;
  completedCount: number;
  blockedCount: number;
}

export interface AnnouncementRecord {
  id: string;
  message: string;
  createdAt: string;
  authorRole: "ADMIN" | "SYSTEM";
}

export interface RotationParticipantInstruction {
  participantId: string;
  fromTableId: number;
  toTableId: number;
  reasonTags: string[];
  acknowledgedAt: string | null;
}

export interface RotationInstructionState {
  version: number;
  rotationRound: number;
  startsAt: string;
  deadlineAt: string;
  assignments: RotationParticipantInstruction[];
}

export interface SessionSnapshot {
  session: SessionRecord;
  participants: ParticipantRecord[];
  hearts: HeartRecord[];
  reports: ReportRecord[];
  blacklist?: BlacklistRecord[];
  incidents?: IncidentRecord[];
  auditLogs: AuditLogRecord[];
  seatingAssignments: SeatingAssignmentRecord[];
  activeContentIds: string[];
  liveContent: LiveContentRecord | null;
  contentResponses: ContentResponseRecord[];
  anonymousMessages: AnonymousMessageRecord[];
  tableImpressionPicks?: TableImpressionPickRecord[];
  tablePickWindows?: TablePickWindowRecord[];
  tableQrCodes?: TableQrCodeRecord[];
  contactExchanges?: ContactExchangeRecord[];
  contactExchangeStats?: ContactExchangeStats;
  outboxEvents?: OutboxEventRecord[];
  reservations?: ReservationBridgeRecord[];
  announcements: AnnouncementRecord[];
  rotationInstruction: RotationInstructionState | null;
  version: number;
  participantStatusMap?: Record<string, ParticipantStatus>;
}

export interface CustomerParticipantView {
  id: string;
  nickname: string;
  profileImage: string | null;
  tableLabel: string;
  appearanceSummary: string;
  personalitySummary: string;
  preferenceSummary: string;
  heartStatus: {
    heartsRemaining: number;
  };
  sessionId?: string;
  branchId?: string;
  gender?: ParticipantGender;
  age?: number;
  jobCategory?: string;
  job?: string;
  photoUrl?: string | null;
  tableId?: number;
  round2Attendance?: Round2Attendance;
  receivedHearts?: number;
  sentHearts?: number;
  profileViews?: number;
  heartsRemaining?: number;
  metParticipantIds?: string[];
  encounterHistory?: ParticipantEncounterRecord[];
  likedParticipantIds?: string[];
  likedByParticipantIds?: string[];
  joinedAt?: string;
  lastActiveAt?: string | null;
}

export interface CustomerSessionView {
  session: SessionRecord;
  participants: CustomerParticipantView[];
  hearts: HeartRecord[];
  activeContentIds: string[];
  liveContent: LiveContentRecord | null;
  contentResponses: ContentResponseRecord[];
  anonymousMessages: AnonymousMessageRecord[];
  tableImpressionPicks?: TableImpressionPickRecord[];
  tablePickWindows?: TablePickWindowRecord[];
  tableQrCodes?: TableQrCodeRecord[];
  contactExchanges?: ContactExchangeRecord[];
  contactExchangeStats?: ContactExchangeStats;
  announcements: AnnouncementRecord[];
  rotationInstruction: RotationInstructionState | null;
  version: number;
  participantStatusMap?: Record<string, ParticipantStatus>;
}

export type AdminSessionView = SessionSnapshot;
export type SessionView = CustomerSessionView | AdminSessionView;

export interface ParsedCheckinQr {
  branchId: string;
  tableId: number;
  checkinCode: string;
}

export interface CheckinResolution {
  sessionId: string;
  branchId: string;
  tableId: number | null;
  reservationId: string;
  reservationExternalId?: string | null;
  participantId: string | null;
  phone?: string | null;
  gender: ParticipantGender;
  reservationLabel: string;
  checkinCode: string;
  flowState: Exclude<CheckinFlowState, "IDLE" | "LOADING" | "FAILURE">;
  customerMessage: string | null;
  customerSecondaryMessage: string | null;
}

export interface CheckinDraft {
  value: string;
  flowState: CheckinFlowState;
  customerMessage: string | null;
  customerSecondaryMessage: string | null;
  isSubmitting: boolean;
  isVerified: boolean;
  error: string | null;
  resolution: CheckinResolution | null;
}

export interface ExternalReservationSessionContext {
  sessionId: string;
  branchId?: string | null;
  reservationId: string;
  reservationExternalId?: string | null;
  reservationLabel: string;
  checkinCode: string;
  phone?: string | null;
  gender: ParticipantGender;
  eligible: boolean;
  status: "ACTIVE" | "BLOCKED";
}

export interface ReservationAdapterInput {
  sessionId: string;
  checkinCode: string;
  reservationExternalId?: string | null;
}

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "BLOCKED"
  | "CHECKED_IN";

export interface ReservationBridgeRecord {
  source: "NAVER" | "MANUAL" | "IMWEB" | "CSV";
  sessionId: string;
  branchId: string;
  eventId: string;
  eventDate: string;
  reservationId: string;
  reservationExternalId: string | null;
  slot?: "1부" | "2부" | "1+2부";
  name?: string | null;
  phone: string | null;
  normalizedPhone?: string | null;
  gender?: ParticipantGender | null;
  birthYear?: number | null;
  age?: number | null;
  paymentStatus?: string | null;
  reservationStatus?: string | null;
  checkinStatus?: "PENDING" | "CHECKED_IN";
  memo?: string | null;
  privacyConsent?: boolean | null;
  marketingConsent?: boolean | null;
  rawRow?: Record<string, unknown> | null;
  importedAt?: string;
  checkinParticipantId?: string | null;
  status: ReservationStatus;
  eligible: boolean;
}

export interface ReservationLookupRule {
  mode: "EXTERNAL_ID_FIRST_PHONE_FALLBACK";
  phonePolicy: "NORMALIZED_EXACT_MATCH";
  notes: string;
}

export interface ReservationAdapter {
  getSessionContext(input: ReservationAdapterInput): Promise<ExternalReservationSessionContext | null>;
}

export interface WebsiteEntryPayload {
  branchId: string;
  eventId: string;
  eventDate: string;
  reservationExternalId?: string | null;
  phone?: string | null;
}

export interface WebsiteEntryContext {
  sessionId: string;
  branchId: string;
  eventId: string;
  eventDate: string;
  tableId: number | null;
  reservationId?: string | null;
  reservationExternalId?: string | null;
  checkinCode?: string | null;
  participantId?: string | null;
}

export interface WebsiteEntryAdapter {
  resolveEntryContext(input: WebsiteEntryContext): Promise<WebsiteEntryContext>;
}

export type MessagingExportChannel = "SMS" | "CSV" | "XLSX" | "AUTOMATION";

export interface MessagingExportAdapterInput {
  channel: MessagingExportChannel;
  sessionId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface MessagingExportAdapter {
  enqueue(input: MessagingExportAdapterInput): Promise<void>;
}

export interface ReservationImportRow {
  reservationExternalId: string;
  reservationId: string;
  branchId: string;
  eventId: string;
  eventDate: string;
  phone?: string | null;
  status: ReservationStatus;
  reservationLabel?: string;
  checkinCode?: string;
}

export interface ReservationExportRow extends ReservationImportRow {
  sessionId: string;
  eligible: boolean;
  participantId?: string | null;
}

export interface ReservationImportResult {
  accepted: number;
  rejected: number;
  errors: Array<{ row: number; message: string }>;
}

export interface ParticipantExportRow {
  participantId: string;
  nickname: string;
  phone: string | null;
  tableId: number;
  matchStatus: "MATCHED" | "UNMATCHED";
}

export interface MatchExportRow {
  participantAId: string;
  participantANickname: string;
  participantAPhone: string | null;
  participantBId: string;
  participantBNickname: string;
  participantBPhone: string | null;
  status: "MATCHED";
}

export interface ContactExchangeExportRow {
  participantAId: string;
  participantANickname: string;
  participantAPhone: string | null;
  participantBId: string;
  participantBNickname: string;
  participantBPhone: string | null;
  contactExchangeStatus: "PENDING" | "COMPLETED" | "BLOCKED";
}

export interface ReservationImportExportAdapter {
  importRows(rows: ReservationImportRow[]): Promise<ReservationImportResult>;
  exportRows(input: {
    sessionId: string;
    format: "csv" | "xlsx";
    rows: ReservationExportRow[];
  }): Promise<{ fileName: string; mimeType: string; body: string }>;
  exportParticipants(input: {
    sessionId: string;
    includePhone: boolean;
    rows: ParticipantExportRow[];
  }): Promise<{ fileName: string; mimeType: string; body: string }>;
  exportMatches(input: {
    sessionId: string;
    includePhone: boolean;
    rows: MatchExportRow[];
  }): Promise<{ fileName: string; mimeType: string; body: string }>;
  exportContactExchanges(input: {
    sessionId: string;
    includePhone: boolean;
    rows: ContactExchangeExportRow[];
  }): Promise<{ fileName: string; mimeType: string; body: string }>;
}

export interface OutboxEventRecord {
  id: string;
  sessionId: string;
  eventType: string;
  channel: MessagingExportChannel;
  status: "PENDING" | "SENT" | "FAILED";
  payload: Record<string, unknown>;
  createdAt: string;
  processedAt: string | null;
  error: string | null;
}

export interface ProfileDraft {
  nickname: string;
  age: string;
  jobCategory: string;
  job: string;
  photoUrl: string;
  heightCm: string;
  animalType: string;
  energyType: EnergyType | "";
  fullName?: string;
  contact?: string;
  birthYear?: string;
  onboardingGoal?: string;
  idealType1?: string;
  idealType2?: string;
  idealType3?: string;
  consentPrivacy?: boolean;
  consentPortrait?: boolean;
  customJobInput?: string;
}

export interface StaffRecommendationSummary {
  recommended: boolean;
  grade: "S" | "A" | "B" | "C" | null;
  tags: string[];
  memo: string | null;
}

export interface BranchCustomerProfileSummary {
  customerId: string;
  branchId: string;
  branchVisitCount: number;
  branchReceivedHearts: number;
  branchMutualMatches: number;
  staffRecommendation: StaffRecommendationSummary;
}

export interface CustomerProfileSummary {
  customerId: string;
  name: string;
  phone: string | null;
  gender: ParticipantGender;
  age: number;
  heightCm: number;
  job: string;
  totalVisitCount: number;
  totalReceivedHearts: number;
  totalMutualMatches: number;
  totalContactExchanges: number;
  globalPopularityScore: number | null;
  isBlacklisted: boolean;
  hasReportHistory: boolean;
  branchProfiles: BranchCustomerProfileSummary[];
}

export interface ProfileUploadEnabledResponse {
  uploadEnabled: true;
  uploadUrl: string;
  assetUrl: string;
  key: string;
  provider: string;
}

export interface ProfileUploadDisabledResponse {
  uploadEnabled: false;
  helperMessage: string;
}

export type ProfileUploadResponse = ProfileUploadEnabledResponse | ProfileUploadDisabledResponse;

export interface TableVibeMetrics {
  activeUsersRatio: number;
  totalInteractions: number;
  normalizedInteractionCount: number;
  recentHeartSignals: number;
  normalizedHeartSignals: number;
  idlePenalty: number;
}

export interface RotationMoveBreakdown {
  newPeople: number;
  interestMatch: number;
  vibe: number;
  seenOncePenalty: number;
  popularClusterPenalty: number;
  eiBalancePenalty: number;
  finalScore: number;
}

export interface RotationMovePreview {
  participantId: string;
  nickname: string;
  fromTableId: number;
  toTableId: number;
  reasonTags: string[];
  breakdown: RotationMoveBreakdown;
}

export interface RotationTablePreview {
  tableId: number;
  beforeParticipants: ParticipantRecord[];
  afterParticipants: ParticipantRecord[];
  beforeHeat: number;
  afterHeat: number;
  beforeQuality: number;
  afterQuality: number;
  beforeVibeScore: number;
  afterVibeScore: number;
  beforeGenderBalance: number;
  afterGenderBalance: number;
  beforeRepeatMeetings: number;
  afterRepeatMeetings: number;
  beforePopularityLoad: number;
  afterPopularityLoad: number;
  beforeEnergyBalance: number;
  afterEnergyBalance: number;
  notes: string[];
  warnings: string[];
  explanations?: string[];
  moves: RotationMovePreview[];
}

export interface RotationPreview {
  previewId?: string;
  generatedAt: string;
  rotationRound: number;
  tableCapacityPlan: number[];
  tablePreviews: RotationTablePreview[];
  moves: RotationMovePreview[];
  overallBeforeQuality: number;
  overallAfterQuality: number;
  overallBeforeHeat: number;
  overallAfterHeat: number;
  fairnessDelta: number;
  baseVersion: number;
  auditDraft: AuditLogRecord;
}

export interface InterventionRecommendation {
  id: string;
  kind: InterventionKind;
  title: string;
  description: string;
  priority: RotationPriority;
  targetTableId?: number;
  targetParticipantId?: string;
}

export interface TableStatusCounts {
  ACTIVE: number;
  IDLE: number;
  GONE: number;
  BLOCKED: number;
}

export interface TableSummary {
  tableId: number;
  participants: ParticipantRecord[];
  capacity: number;
  occupancy: number;
  heat: number;
  quality: number;
  vibeScore: number;
  vibe: TableVibeMetrics;
  genderBalance: number;
  energyBalance: number;
  repeatMeetings: number;
  protectedCount: number;
  popularityLoad: number;
  statusCounts: TableStatusCounts;
  tableState: TableState;
}

export interface RevealState {
  key: RevealStateKey;
  canReveal: boolean;
  status: string;
  receivedCount: number;
  heartsRemaining: number;
  visibleSenders: ParticipantRecord[];
}

export interface ToastState {
  tone: "success" | "warning" | "info";
  message: string;
}

export interface CachedViewerState {
  cachedParticipantId: string | null;
}

export interface AdminSessionRecord {
  adminUserId: string;
  role: AdminRole;
  branchId: string | null;
}

export interface AdminUserRecord {
  id: string;
  email: string | null;
  passwordHash: string;
  role: AdminRole;
  branchId: string | null;
  isActive: boolean;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  updatedBy: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  role: AdminRole;
  branchId: string | null;
  isActive: boolean;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  updatedBy: string | null;
}

export interface AdminUserCreateInput {
  id?: string;
  email: string | null;
  password: string;
  role: AdminRole;
  branchId: string | null;
  displayName: string;
}

export interface AdminUserUpdateInput {
  email: string | null;
  role: AdminRole;
  branchId: string | null;
  displayName: string;
  isActive: boolean;
}

export interface BranchRecord {
  id: string;
  hqId: string;
  name: string;
  venueName: string;
  venueAddress: string;
  defaultMaxCapacity: number;
  defaultTableCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface BranchUpsertInput {
  id?: string;
  name: string;
  venueName: string;
  venueAddress: string;
  defaultMaxCapacity: number;
  defaultTableCount: number;
  isActive: boolean;
}

export interface ManagedSessionRecord {
  id: string;
  name: string;
  hqId: string;
  branchId: string;
  branchName: string;
  eventId: string;
  venueName: string;
  venueAddress: string;
  sessionDateLabel: string;
  sessionTimeLabel: string;
  attendanceLabel: string;
  attendanceHint: string;
  code: string;
  phase: SessionPhase;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  tableCount: number;
  tableCapacity: number;
  maxCapacity: number;
  status: SessionLifecycleStatus;
  updatedBy: string | null;
}

export interface ManagedSessionUpsertInput {
  id?: string;
  name: string;
  branchId: string;
  eventId: string;
  venueName: string;
  venueAddress: string;
  sessionDateLabel: string;
  sessionTimeLabel: string;
  attendanceLabel: string;
  attendanceHint: string;
  code: string;
  tableCount: number;
  tableCapacity: number;
  maxCapacity: number;
  status: SessionLifecycleStatus;
}

export interface CustomerSessionRecord {
  participantId: string;
  reservationId: string;
  sessionId: string;
  sessionVersion: number;
  issuedAt: string;
  expiresAt: string;
}

export interface SessionSnapshotResponse {
  data: SessionView;
  currentParticipantId: string | null;
}

export type CustomerEntryStatus = "OK" | "NO_OPEN_SESSION" | "INVALID" | "INVALID_BRANCH_OR_TABLE";

export interface CustomerEntryResponse {
  status: CustomerEntryStatus;
  sessionId?: string;
  branch?: {
    id: string;
    name: string;
  };
  table?: {
    id: string;
    tableNumber: number;
  };
  message?: string;
}

export interface CustomerProfileStepRequest {
  sessionId: string;
  tableId: number;
  step: 1 | 2 | 3 | 4 | 5;
  data: Record<string, unknown>;
  draftParticipantId?: string;
}

export interface CustomerProfileStepResponse {
  status: "OK";
  draftParticipantId: string;
}

export interface CustomerEnterRequest {
  draftParticipantId: string;
}

export interface CustomerEnterResponse {
  status: "OK";
  participantId: string;
  sessionId: string;
  tableId: number;
}

export interface SessionSyncEvent {
  type: "snapshot";
  snapshot: SessionView;
}

export interface SessionCommandResponse {
  snapshot: SessionView;
  participantId?: string | null;
  rotationPreview?: RotationPreview | null;
  checkinResolution?: CheckinResolution | null;
}

export interface CommandResult {
  snapshot: SessionSnapshot;
  participantId?: string | null;
  rotationPreview?: RotationPreview | null;
  checkinResolution?: CheckinResolution | null;
}

export interface GrantHeartsRequest {
  participantId: string;
  heartsToAdd: number;
}

export interface GrantHeartsResponse {
  snapshot: SessionSnapshot;
  participant: ParticipantRecord;
}

export interface ReservationSessionContextRequest {
  branchId: string;
  tableId: number;
  checkinCode?: string;
  participantId?: string | null;
}

export type MingleCommand =
  | {
      type: "customer.verifyCheckin";
      draft: CheckinDraft;
      participantId?: string | null;
    }
  | {
      type: "customer.completeProfile";
      resolution: CheckinResolution;
      checkinMode: CheckinMode;
      draft: ProfileDraft;
    }
  | {
      type: "customer.updateProfile";
      participantId: string;
      profile: {
        nickname: string;
        age: number;
        jobCategory: string;
        job: string;
        heightCm: number;
        animalType: string;
        energyType: EnergyType;
        photoUrl: string | null;
      };
    }
  | {
      type: "customer.setRound2Attendance";
      participantId: string;
      attendance: Round2Attendance;
    }
  | {
      type: "customer.sendHeart";
      participantId: string;
      recipientId: string;
    }
  | {
      type: "customer.submitReport";
      participantId: string;
      targetId: string;
      reason: string;
      details: string;
    }
  | {
      type: "customer.respondContent";
      participantId: string;
      contentId: string;
      value: string;
      recipientId?: string | null;
    }
  | {
      type: "customer.submitAnonymousMessage";
      participantId: string;
      sessionId: string;
      contentBlockId: string;
      receiverParticipantId?: string | null;
      receiverHint?: string | null;
      message: string;
      revealSender: boolean;
    }
  | {
      type: "customer.submitTablePick";
      participantId: string;
      sessionId: string;
      rotationIndex: 0 | 1;
      wantToKnowParticipantId: string;
      funnyParticipantId: string;
      contentBlockId?: string | null;
    }
  | {
      type: "customer.ackRotation";
      participantId: string;
    }
  | {
      type: "customer.submitContactExchangeConsent";
      participantId: string;
      targetParticipantId: string;
      consent: boolean;
      methods?: ContactExchangeMethod;
    }
  | {
      type: "admin.setSessionState";
      state: SessionOperationalState;
      expectedVersion?: number;
    }
  | {
      type: "admin.toggleReveal";
      value: boolean;
      expectedVersion?: number;
    }
  | {
      type: "admin.triggerReveal";
      expectedVersion?: number;
    }
  | {
      type: "admin.generateRotationPreview";
      expectedVersion?: number;
    }
  | {
      type: "admin.applyRotation";
      preview: RotationPreview;
      expectedVersion?: number;
    }
  | {
      type: "admin.activateContent";
      templateId: string;
      targetTableId: number | null;
      message?: string;
      expectedVersion?: number;
    }
  | {
      type: "admin.clearContent";
      expectedVersion?: number;
    }
  | {
      type: "admin.publishAnnouncement";
      message: string;
      expectedVersion?: number;
    }
  | {
      type: "admin.resolveReport";
      reportId: string;
      expectedVersion?: number;
    }
  | {
      type: "admin.updateAnonymousMessageSelection";
      messageId: string;
      isSelected: boolean;
      expectedVersion?: number;
    }
  | {
      type: "admin.openTablePickWindow";
      rotationIndex: 0 | 1;
      expectedVersion?: number;
    }
  | {
      type: "admin.closeTablePickWindow";
      rotationIndex: 0 | 1;
      expectedVersion?: number;
    }
  | {
      type: "admin.regenerateTableQr";
      tableId: number;
      expectedVersion?: number;
    }
  | {
      type: "admin.setBlacklistStatus";
      participantId: string;
      blocked: boolean;
      reason?: string;
      expectedVersion?: number;
    }
  | {
      type: "admin.moveParticipant";
      participantId: string;
      toTableId: number;
      expectedVersion?: number;
    }
  | {
      type: "admin.createManualParticipant";
      nickname: string;
      tableId: number;
      gender: ParticipantGender;
      expectedVersion?: number;
    }
  | {
      type: "admin.importReservations";
      rows: ReservationBridgeRecord[];
      expectedVersion?: number;
    }
  | {
      type: "admin.updateSessionConfig";
      config: {
        branchName?: string;
        venueName?: string;
        venueAddress?: string;
        sessionDateLabel?: string;
        sessionTimeLabel?: string;
        attendanceLabel?: string;
        attendanceHint?: string;
        tableCount?: number;
        tableCapacity?: number;
        initialHearts?: number;
        rotationDeadlineMinutes?: number;
        presenceGoneThresholdMinutes?: number;
        defaultProfileImageMale?: string;
        defaultProfileImageFemale?: string;
        defaultProfileImageUnknown?: string;
      };
      expectedVersion?: number;
    };

export interface SessionRow {
  id: string;
  name: string;
  hq_id: string;
  branch_id: string;
  branch_name: string;
  event_id: string;
  venue_name: string;
  venue_address: string;
  session_date_label: string;
  session_time_label: string;
  attendance_label: string;
  attendance_hint: string;
  code: string;
  phase: SessionPhase;
  reveal_senders: boolean;
  reveal_triggered_at: string | null;
  started_at: string;
  updated_at: string;
  table_count: number;
  table_capacity: number;
  customer_session_version: number;
  active_content_ids: string[];
  snapshot_version: number;
}

export interface ParticipantEncounterRow {
  participant_id: string;
  count: number;
  last_round_seen: number;
  interaction_strength: number;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  branch_id: string;
  reservation_id: string | null;
  reservation_external_id: string | null;
  phone: string | null;
  nickname: string;
  gender: ParticipantGender;
  age: number;
  job_category: string;
  job: string;
  photo_url: string | null;
  height_cm: number;
  animal_type: string;
  energy_type: EnergyType;
  checkin_mode: CheckinMode;
  table_id: number;
  round2_attendance: Round2Attendance;
  received_hearts: number;
  sent_hearts: number;
  profile_views: number;
  hearts_remaining: number;
  met_participant_ids: string[];
  encounter_history: ParticipantEncounterRow[];
  liked_participant_ids: string[];
  liked_by_participant_ids: string[];
  popularity_score: number;
  tier: ParticipantTier;
  sub_tier: ParticipantSubTier;
  score: number;
  attraction_score: number;
  engagement_score: number;
  is_vip: boolean;
  is_high_value: boolean;
  joined_at: string;
  last_active_at: string | null;
}

export interface SeatingAssignmentRow {
  id: string;
  session_id: string;
  rotation_round: number;
  participant_id: string;
  table_id: number;
  assigned_at: string;
  assignment_source: "INITIAL" | "ROTATION_APPLY" | "ADMIN_MOVE";
}

export interface HeartRow {
  id: string;
  session_id: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
}

export interface ReportRow {
  id: string;
  session_id: string;
  reporter_id: string;
  target_id: string;
  reason: string;
  details: string;
  created_at: string;
  resolved_at: string | null;
  status: ReportStatus;
}

export interface BlacklistRow {
  id: string;
  session_id: string;
  branch_id: string;
  participant_id: string;
  reason: string;
  created_at: string;
}

export interface IncidentRow {
  id: string;
  session_id: string;
  branch_id: string;
  reporter_id: string | null;
  target_id: string | null;
  type: IncidentType;
  message: string;
  timestamp: string;
}

export interface AuditLogRow {
  id: string;
  session_id: string;
  action: AuditAction;
  actor_id: string;
  actor_role: AuditActorRole;
  message: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  password_hash: string;
  role: AdminRole;
  branch_id: string | null;
  is_active: boolean;
  display_name: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  updated_by: string | null;
}

export interface BranchRow {
  id: string;
  hq_id: string;
  name: string;
  venue_name: string;
  venue_address: string;
  default_max_capacity: number;
  default_table_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ManagedSessionRow {
  id: string;
  name: string;
  hq_id: string;
  branch_id: string;
  branch_name: string;
  event_id: string;
  venue_name: string;
  venue_address: string;
  session_date_label: string;
  session_time_label: string;
  attendance_label: string;
  attendance_hint: string;
  code: string;
  phase: SessionPhase;
  reveal_senders: boolean;
  reveal_triggered_at: string | null;
  started_at: string;
  created_at: string;
  updated_at: string;
  table_count: number;
  table_capacity: number;
  customer_session_version: number;
  active_content_ids: string[];
  snapshot_version: number;
  authority_backend: "FILE" | "DB";
  snapshot_json: SessionSnapshot;
  status: SessionLifecycleStatus;
  max_capacity: number;
  updated_by: string | null;
}
