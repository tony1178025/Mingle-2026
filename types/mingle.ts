export type SessionPhase = "CHECKIN" | "ROUND_1" | "ROUND_2" | "MATCH_END";
export type CheckinMode = "qr" | "code" | "staff";
export type ParticipantGender = "M" | "F";
export type EnergyType = "E" | "I";
export type ParticipantTier = "A" | "B" | "C";
export type ParticipantSubTier = "HIGH" | "MID" | "LOW";
export type CustomerTab = "explore" | "hearts" | "content" | "settings";
export type AdminPanel = "overview" | "rotation" | "history";
export type HeartSource = "FREE" | "PAID";
export type RevealStateKey =
  | "round1-count-only"
  | "round2-waiting-admin"
  | "round2-waiting-user"
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
export type PaymentIntegrationState = "unavailable" | "checkout_required" | "ready";
export type AuditAction =
  | "SESSION_BOOTSTRAP"
  | "CHECKIN_VERIFIED"
  | "PROFILE_COMPLETED"
  | "PROFILE_VIEWED"
  | "HEART_SENT"
  | "HEART_PURCHASE_REQUESTED"
  | "PHASE_CHANGED"
  | "REVEAL_TOGGLED"
  | "ROTATION_PREVIEWED"
  | "ROTATION_APPLIED"
  | "REPORT_SUBMITTED"
  | "POLL_SYNC";

export interface SessionRecord {
  id: string;
  name: string;
  branchName: string;
  code: string;
  phase: SessionPhase;
  revealSenders: boolean;
  revealTriggeredAt: string | null;
  startedAt: string;
  updatedAt: string;
  freeHeartLimit: number;
  paidHeartBundlePriceKrw: number;
  tableCount: number;
  tableCapacity: number;
}

export interface ParticipantRecord {
  id: string;
  reservationId: string | null;
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
  receivedHearts: number;
  sentHearts: number;
  profileViews: number;
  usedFreeHearts: number;
  paidHeartBalance: number;
  purchasedBundles: number;
  metParticipantIds: string[];
  tier: ParticipantTier;
  subTier: ParticipantSubTier;
  score: number;
  attractionScore: number;
  engagementScore: number;
  isVip: boolean;
  isHighValue: boolean;
  joinedAt: string;
}

export interface HeartRecord {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  source: HeartSource;
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

export interface SessionSnapshot {
  session: SessionRecord;
  participants: ParticipantRecord[];
  hearts: HeartRecord[];
  reports: ReportRecord[];
  auditLogs: AuditLogRecord[];
  seatingAssignments: SeatingAssignmentRecord[];
  activeContentIds: string[];
  version: number;
}

export interface CheckinResolution {
  reservationId: string;
  gender: ParticipantGender;
  reservationLabel: string;
}

export interface CheckinDraft {
  mode: CheckinMode;
  value: string;
  staffNote: string;
  isVerified: boolean;
  error: string | null;
  resolution: CheckinResolution | null;
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

export interface RotationTablePreview {
  tableId: number;
  beforeParticipants: ParticipantRecord[];
  afterParticipants: ParticipantRecord[];
  beforeHeat: number;
  afterHeat: number;
  beforeQuality: number;
  afterQuality: number;
  notes: string[];
  warnings: string[];
}

export interface RotationPreview {
  generatedAt: string;
  rotationRound: number;
  tableCapacityPlan: number[];
  tablePreviews: RotationTablePreview[];
  overallBeforeQuality: number;
  overallAfterQuality: number;
  overallBeforeHeat: number;
  overallAfterHeat: number;
  fairnessDelta: number;
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
  heat: number;
  quality: number;
  genderBalance: number;
  energyBalance: number;
  repeatMeetings: number;
  protectedCount: number;
}

export interface RevealState {
  key: RevealStateKey;
  canReveal: boolean;
  status: string;
  receivedCount: number;
  remainingFreeHearts: number;
  visibleSenders: ParticipantRecord[];
}

export interface ToastState {
  tone: "success" | "warning" | "info";
  message: string;
}

export interface ViewerState {
  viewerParticipantId: string | null;
}

export interface PaymentCheckoutState {
  state: PaymentIntegrationState;
  message: string;
  checkoutUrl?: string;
}

export interface SessionRow {
  id: string;
  name: string;
  branch_name: string;
  code: string;
  phase: SessionPhase;
  reveal_senders: boolean;
  reveal_triggered_at: string | null;
  started_at: string;
  updated_at: string;
  free_heart_limit: number;
  paid_heart_bundle_price_krw: number;
  table_count: number;
  table_capacity: number;
  active_content_ids: string[];
  snapshot_version: number;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  reservation_id: string | null;
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
  received_hearts: number;
  sent_hearts: number;
  profile_views: number;
  used_free_hearts: number;
  paid_heart_balance: number;
  purchased_bundles: number;
  met_participant_ids: string[];
  tier: ParticipantTier;
  sub_tier: ParticipantSubTier;
  score: number;
  attraction_score: number;
  engagement_score: number;
  is_vip: boolean;
  is_high_value: boolean;
  joined_at: string;
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
  source: HeartSource;
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

export interface SessionSnapshotResponse {
  data: SessionSnapshot;
}

export interface SessionSyncEvent {
  type: "snapshot";
  snapshot: SessionSnapshot;
}
