export type SessionPhase = "CHECKIN" | "ROUND_1" | "ROUND_2" | "MATCH_END";
export type CheckinMode = "qr" | "code" | "staff";
export type CheckinFlowState =
  | "IDLE"
  | "LOADING"
  | "SUCCESS"
  | "RE_ENTRY"
  | "BLOCKED"
  | "FAILURE";
export type ParticipantStatus = "ACTIVE" | "BLOCKED";
export type ParticipantGender = "M" | "F";
export type EnergyType = "E" | "I";
export type ParticipantTier = "A" | "B" | "C";
export type ParticipantSubTier = "HIGH" | "MID" | "LOW";
export type CustomerTab = "table" | "hearts" | "settings";
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
export type ContentKind = "prompt" | "vote" | "announcement" | "anonymous" | "nudge";
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
  | "POLL_SYNC";

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
  customerSessionVersion: number;
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
  assignmentSource: "INITIAL" | "ROTATION_APPLY";
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
  contentId: string;
  senderId: string;
  recipientId: string;
  message: string;
  createdAt: string;
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
  announcements: AnnouncementRecord[];
  rotationInstruction: RotationInstructionState | null;
  version: number;
}

export interface ParsedCheckinQr {
  sessionId: string;
  checkinCode: string;
}

export interface CheckinResolution {
  sessionId: string;
  branchId: string;
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

export interface ProfileDraft {
  nickname: string;
  age: string;
  jobCategory: string;
  job: string;
  photoUrl: string;
  heightCm: string;
  animalType: string;
  energyType: EnergyType | "";
}

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
  moves: RotationMovePreview[];
}

export interface RotationPreview {
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
  data: SessionSnapshot;
  currentParticipantId: string | null;
}

export interface SessionSyncEvent {
  type: "snapshot";
  snapshot: SessionSnapshot;
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
  sessionId: string;
  checkinCode: string;
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
      type: "customer.ackRotation";
      participantId: string;
    }
  | {
      type: "admin.setPhase";
      phase: SessionPhase;
    }
  | {
      type: "admin.toggleReveal";
      value: boolean;
    }
  | {
      type: "admin.generateRotationPreview";
    }
  | {
      type: "admin.applyRotation";
      preview: RotationPreview;
    }
  | {
      type: "admin.activateContent";
      templateId: string;
      targetTableId: number | null;
      message?: string;
    }
  | {
      type: "admin.clearContent";
    }
  | {
      type: "admin.publishAnnouncement";
      message: string;
    }
  | {
      type: "admin.resolveReport";
      reportId: string;
    }
  | {
      type: "admin.setBlacklistStatus";
      participantId: string;
      blocked: boolean;
      reason?: string;
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
  assignment_source: "INITIAL" | "ROTATION_APPLY";
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
