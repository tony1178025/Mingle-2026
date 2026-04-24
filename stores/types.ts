import type { StateCreator } from "zustand";
import type {
  AdminPanel,
  CheckinDraft,
  CommandResult,
  ContentTemplateRecord,
  ContactExchangeMethod,
  CustomerTab,
  MingleCommand,
  ProfileDraft,
  RotationPreview,
  Round2Attendance,
  SessionOperationalState,
  SessionSnapshot,
  ToastState
} from "@/types/mingle";

export type SessionSlice = {
  hydrated: boolean;
  snapshot: SessionSnapshot | null;
  hydrate: () => Promise<void>;
  syncFromRepository: () => Promise<void>;
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
  updateCheckinValue: (value: string) => void;
  verifyCheckin: () => Promise<boolean>;
  updateProfileDraft: <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => void;
  completeProfile: () => Promise<boolean>;
};

export type ViewerSlice = {
  currentParticipantId: string | null;
  sendHeart: (recipientId: string) => Promise<boolean>;
  submitReport: (targetId: string, reason: string, details: string) => Promise<boolean>;
  updateParticipantProfile: (nextProfile: {
    nickname: string;
    age: number;
    jobCategory: string;
    job: string;
    heightCm: number;
    animalType: string;
    energyType: "E" | "I";
    photoUrl: string | null;
  }) => Promise<boolean>;
  updateRound2Attendance: (attendance: Round2Attendance) => Promise<boolean>;
  acknowledgeRotation: () => Promise<boolean>;
  submitContactExchangeConsent: (
    targetParticipantId: string,
    methods: ContactExchangeMethod,
    consent?: boolean
  ) => Promise<boolean>;
};

export type AdminSlice = {
  rotationPreview: RotationPreview | null;
  getExpectedVersion: () => number;
  executeAdminCommandWithRetry: (
    commandFactory: (expectedVersion: number) => MingleCommand
  ) => Promise<CommandResult>;
  setSessionState: (state: SessionOperationalState) => Promise<void>;
  triggerReveal: () => Promise<void>;
  toggleRevealSenders: (value: boolean) => Promise<void>;
  generateRotationPreview: () => Promise<void>;
  applyRotationPreview: () => Promise<void>;
  resolveReport: (reportId: string) => Promise<void>;
  setBlacklistStatus: (
    participantId: string,
    blocked: boolean,
    reason?: string
  ) => Promise<boolean>;
  grantHearts: (participantId: string, heartsToAdd: number) => Promise<boolean>;
  moveParticipant: (participantId: string, toTableId: number) => Promise<boolean>;
  createManualParticipant: (
    nickname: string,
    tableId: number,
    gender: "M" | "F"
  ) => Promise<boolean>;
};

export type ContentSlice = {
  contentLibrary: readonly ContentTemplateRecord[];
  executeAdminContentCommandWithRetry: (
    commandFactory: (expectedVersion: number) => MingleCommand
  ) => Promise<CommandResult>;
  activateContent: (templateId: string, targetTableId?: number | null, message?: string) => Promise<void>;
  clearContent: () => Promise<void>;
  publishAnnouncement: (message: string) => Promise<void>;
  respondToContent: (value: string, recipientId?: string | null) => Promise<boolean>;
};

export type MingleStoreState = SessionSlice & UiSlice & CheckinSlice & ViewerSlice & AdminSlice & ContentSlice;

export type StoreSlice<T> = StateCreator<MingleStoreState, [], [], T>;
