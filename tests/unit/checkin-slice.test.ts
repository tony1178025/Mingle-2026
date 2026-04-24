import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyCheckinDraft } from "@/lib/mingle";
import type { SessionSnapshot } from "@/types/mingle";

const mockRepository = {
  getSessionSnapshot: vi.fn(),
  getReservationSessionContext: vi.fn(),
  executeCommand: vi.fn(),
  grantHearts: vi.fn()
};

vi.mock("@/lib/repositories", () => ({
  getMingleRepository: () => mockRepository
}));

function createSnapshot(): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: "session_signature_20260412",
      name: "Checkin Test",
      hqId: "hq_mingle",
      branchId: "branch_seongsu",
      branchName: "seongsu",
      eventId: "event_signature_20260412",
      venueName: "venue",
      venueAddress: "address",
      sessionDateLabel: "today",
      sessionTimeLabel: "20:00",
      attendanceLabel: "2",
      attendanceHint: "test",
      code: "2026",
      phase: "CHECKIN",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableCount: 1,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants: [],
    hearts: [],
    reports: [],
    auditLogs: [],
    seatingAssignments: [],
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    announcements: [],
    rotationInstruction: null
  };
}

describe("checkin slice failure handling", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRepository.getSessionSnapshot.mockReset();
    mockRepository.getReservationSessionContext.mockReset();
    mockRepository.executeCommand.mockReset();
    mockRepository.grantHearts.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps technical failures in FAILURE instead of BLOCKED", async () => {
    mockRepository.getReservationSessionContext.mockRejectedValue(new Error("network down"));

    const { useMingleStore } = await import("@/stores/useMingleStore");
    useMingleStore.setState((state) => ({
      ...state,
      snapshot: createSnapshot(),
      checkinDraft: {
        ...createEmptyCheckinDraft(),
        value: "mingle://table/branch_seongsu/1?code=2026"
      },
      toast: null
    }));

    const result = await useMingleStore.getState().verifyCheckin();
    const nextDraft = useMingleStore.getState().checkinDraft;

    expect(result).toBe(false);
    expect(nextDraft.flowState).toBe("FAILURE");
    expect(nextDraft.flowState).not.toBe("BLOCKED");
    expect(mockRepository.getReservationSessionContext).toHaveBeenCalledTimes(2);
  }, 45000);

  it("passes the current participantId as a re-entry recovery hint", async () => {
    mockRepository.getReservationSessionContext.mockResolvedValue({
      snapshot: createSnapshot(),
      participantId: "participant_1",
      checkinResolution: {
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        reservationId: "reservation_m_001",
        reservationExternalId: "naver_booking_001",
        participantId: "participant_1",
        phone: "01011112222",
        gender: "M",
        reservationLabel: "reservation_m_001 reservation",
        checkinCode: "2001",
        flowState: "RE_ENTRY",
        customerMessage: "기존 참가자 상태로 복귀했습니다.",
        customerSecondaryMessage: "예약 연동 정보 기준으로 기존 참가자 상태를 복구했습니다."
      }
    });

    const { useMingleStore } = await import("@/stores/useMingleStore");
    useMingleStore.setState((state) => ({
      ...state,
      snapshot: createSnapshot(),
      currentParticipantId: "participant_1",
      checkinDraft: {
        ...createEmptyCheckinDraft(),
        value: "mingle://table/branch_seongsu/1?code=2026"
      },
      toast: null
    }));

    await useMingleStore.getState().verifyCheckin();

    expect(mockRepository.getReservationSessionContext).toHaveBeenCalledWith({
      branchId: "branch_seongsu",
      tableId: 1,
      checkinCode: "2026",
      participantId: "participant_1"
    });
  }, 45000);
});
