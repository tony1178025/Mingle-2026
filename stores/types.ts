import type { StateCreator } from "zustand";
import type {
  AdminPanel,
  CheckinDraft,
  CustomerTab,
  ParticipantRecord,
  PaymentCheckoutState,
  ProfileDraft,
  RotationPreview,
  SessionPhase,
  SessionSnapshot,
  ToastState
} from "@/types/mingle";

export type SessionSlice = {
  hydrated: boolean;
  snapshot: SessionSnapshot | null;
  hydrate: () => Promise<void>;
  syncFromRepository: () => Promise<void>;
  resetDemo: () => Promise<void>;
};

export type UiSlice = {
  customerTab: CustomerTab;
  adminPanel: AdminPanel;
  selectedTableId: number;
  toast: ToastState | null;
  setCustomerTab: (tab: CustomerTab) => void;
  setAdminPanel: (panel: AdminPanel) => void;
  setSelectedTableId: (tableId: number) => void;
  dismissToast: () => void;
};

export type CheckinSlice = {
  checkinDraft: CheckinDraft;
  profileDraft: ProfileDraft;
  updateCheckinMode: (mode: CheckinDraft["mode"]) => void;
  updateCheckinValue: (value: string) => void;
  updateStaffNote: (value: string) => void;
  verifyCheckin: () => Promise<boolean>;
  updateProfileDraft: <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => void;
  completeProfile: () => Promise<boolean>;
};

export type ViewerSlice = {
  viewerParticipantId: string | null;
  viewParticipantProfile: (participantId: string) => Promise<void>;
  sendHeart: (recipientId: string) => Promise<boolean>;
  purchaseHeartBundle: () => Promise<PaymentCheckoutState>;
  submitReport: (targetId: string, reason: string, details: string) => Promise<boolean>;
};

export type AdminSlice = {
  rotationPreview: RotationPreview | null;
  setPhase: (phase: SessionPhase) => Promise<void>;
  toggleRevealSenders: (value: boolean) => Promise<void>;
  generateRotationPreview: () => Promise<void>;
  applyRotationPreview: () => Promise<void>;
};

export type MingleStoreState = SessionSlice & UiSlice & CheckinSlice & ViewerSlice & AdminSlice;

export type StoreSlice<T> = StateCreator<MingleStoreState, [], [], T>;

export type SetState = Parameters<StoreSlice<{}>>[0];
export type GetState = Parameters<StoreSlice<{}>>[1];

export type SnapshotUpdater = (snapshot: SessionSnapshot) => SessionSnapshot;

export type PersistSnapshot = (nextSnapshot: SessionSnapshot, extra?: Partial<MingleStoreState>) => Promise<void>;

export type UpdateSnapshot = (
  updater: SnapshotUpdater,
  extra?: Partial<MingleStoreState>
) => Promise<SessionSnapshot | null>;

export type ViewerParticipant = ParticipantRecord | null;
