import { describe, expect, it } from "vitest";
import {
  parseCheckinQrValue,
  validateCheckinDraft
} from "@/features/checkin/model";
import { createEmptyCheckinDraft } from "@/lib/mingle";
import type { SessionRecord } from "@/types/mingle";

const FRESH_SESSION_STARTED_AT = new Date().toISOString();

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
  startedAt: FRESH_SESSION_STARTED_AT,
  updatedAt: FRESH_SESSION_STARTED_AT,
  tableCount: 1,
  tableCapacity: 2,
  customerSessionVersion: 1
};

describe("checkin qr parsing", () => {
  it("accepts the table-based qr contract", () => {
    expect(parseCheckinQrValue("mingle://table/branch_seongsu/3?code=2026")).toEqual({
      branchId: "branch_seongsu",
      tableId: 3,
      checkinCode: "2026"
    });
  });

  it("accepts any valid branch id and table number", () => {
    expect(parseCheckinQrValue("mingle://table/branch-gangnam/1?code=0000")).toEqual({
      branchId: "branch-gangnam",
      tableId: 1,
      checkinCode: "0000"
    });
  });

  it("rejects old session-based qr format", () => {
    expect(parseCheckinQrValue("mingle://session/session_test?code=1234")).toBeNull();
  });

  it("accepts missing code for walk-in qr", () => {
    expect(parseCheckinQrValue("mingle://table/branch_seongsu/3")).toEqual({
      branchId: "branch_seongsu",
      tableId: 3,
      checkinCode: ""
    });
  });

  it("rejects non-4-digit code", () => {
    expect(parseCheckinQrValue("mingle://table/branch_seongsu/3?code=12")).toBeNull();
    expect(parseCheckinQrValue("mingle://table/branch_seongsu/3?code=12345")).toBeNull();
  });

  it("rejects tableId of zero or negative", () => {
    expect(parseCheckinQrValue("mingle://table/branch_seongsu/0?code=1234")).toBeNull();
  });

  it("accepts extra query parameters if code is valid", () => {
    expect(parseCheckinQrValue("mingle://table/branch_seongsu/3?code=1234&extra=yes")).toEqual({
      branchId: "branch_seongsu",
      tableId: 3,
      checkinCode: "1234"
    });
  });

  it("does not depend on qrVersion query values", () => {
    expect(
      parseCheckinQrValue(
        "https://mingle.local/customer?branchId=branch_seongsu&tableId=3&qrVersion=legacy&code=1234"
      )
    ).toEqual({
      branchId: "branch_seongsu",
      tableId: 3,
      checkinCode: "1234"
    });
  });

  it("rejects missing tableId path segment", () => {
    expect(parseCheckinQrValue("mingle://table/branch_seongsu?code=1234")).toBeNull();
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
