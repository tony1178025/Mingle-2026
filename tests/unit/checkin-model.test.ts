import { describe, expect, it } from "vitest";
import {
  parseCheckinQrValue,
  validateCheckinDraft
} from "@/features/checkin/model";
import { createEmptyCheckinDraft } from "@/lib/mingle";
import type { SessionRecord } from "@/types/mingle";

const session: SessionRecord = {
  id: "session_test",
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
  code: "1234",
  phase: "CHECKIN",
  revealSenders: false,
  revealTriggeredAt: null,
  startedAt: "2026-04-22T10:00:00.000Z",
  updatedAt: "2026-04-22T10:00:00.000Z",
  tableCount: 1,
  tableCapacity: 2,
  customerSessionVersion: 1
};

describe("checkin qr parsing", () => {
  it("accepts only the unified qr contract", () => {
    expect(parseCheckinQrValue("mingle://session/session_test?code=1234")).toEqual({
      sessionId: "session_test",
      checkinCode: "1234"
    });
  });

  it("rejects legacy qr formats", () => {
    expect(parseCheckinQrValue("mingle://session/session_test/1234")).toBeNull();
    expect(parseCheckinQrValue("mingle://session/session_signature_20260412/1234")).toBeNull();
    expect(parseCheckinQrValue("mingle://session/session_test")).toBeNull();
  });
});

describe("checkin validation", () => {
  it("marks expired sessions as blocked, not generic failure", () => {
    const blocked = validateCheckinDraft(createEmptyCheckinDraft(), {
      ...session,
      startedAt: "2026-04-20T10:00:00.000Z"
    });

    expect(blocked.flowState).toBe("BLOCKED");
    expect(blocked.flowState).not.toBe("FAILURE");
    expect(blocked.error).toBeTruthy();
  });

  it("keeps malformed qr input as validation, not authority failure", () => {
    const invalid = validateCheckinDraft(
      {
        ...createEmptyCheckinDraft(),
        value: "mingle://session/session_test?code=12"
      },
      session
    );

    expect(invalid.flowState).toBe("IDLE");
    expect(invalid.flowState).not.toBe("FAILURE");
    expect(invalid.error).toBeTruthy();
  });
});
