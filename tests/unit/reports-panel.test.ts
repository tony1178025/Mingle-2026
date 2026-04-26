import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import type { SessionSnapshot } from "@/types/mingle";

function createSnapshot(): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: "session_signature_20260412",
      name: "Reports Test",
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
      phase: "ROUND_1",
      revealSenders: false,
      revealTriggeredAt: null,
      startedAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
      tableCount: 1,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants: [
      {
        id: "participant_reporter",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        reservationId: "reservation_reporter",
        reservationExternalId: null,
        phone: "01012345678",
        nickname: "reporter",
        gender: "M",
        age: 29,
        jobCategory: "IT",
        job: "Engineer",
        photoUrl: null,
        heightCm: 175,
        animalType: "cat",
        energyType: "E",
        checkinMode: "qr",
        tableId: 1,
        round2Attendance: "UNDECIDED",
        receivedHearts: 0,
        sentHearts: 0,
        profileViews: 0,
        heartsRemaining: 3,
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
        isVip: false,
        isHighValue: false,
        joinedAt: "2026-04-22T10:00:00.000Z",
        lastActiveAt: "2026-04-22T10:00:00.000Z"
      },
      {
        id: "participant_target",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        reservationId: "reservation_target",
        reservationExternalId: null,
        phone: "01087654321",
        nickname: "target",
        gender: "F",
        age: 28,
        jobCategory: "Design",
        job: "Designer",
        photoUrl: null,
        heightCm: 168,
        animalType: "dog",
        energyType: "I",
        checkinMode: "qr",
        tableId: 1,
        round2Attendance: "UNDECIDED",
        receivedHearts: 0,
        sentHearts: 0,
        profileViews: 0,
        heartsRemaining: 3,
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
        isVip: false,
        isHighValue: false,
        joinedAt: "2026-04-22T10:00:00.000Z",
        lastActiveAt: "2026-04-22T10:00:00.000Z"
      }
    ],
    hearts: [],
    reports: [
      {
        id: "report_1",
        sessionId: "session_signature_20260412",
        reporterId: "participant_reporter",
        targetId: "participant_target",
        reason: "불쾌한 언행",
        details: "details longer than eight chars",
        createdAt: "2026-04-22T10:05:00.000Z",
        resolvedAt: null,
        status: "PENDING"
      }
    ],
    blacklist: [
      {
        id: "blacklist_1",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        participantId: "participant_target",
        reason: "운영 정책상 제한",
        createdAt: "2026-04-22T10:06:00.000Z"
      }
    ],
    incidents: [
      {
        id: "incident_1",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        reporterId: "participant_reporter",
        targetId: "participant_target",
        type: "REPORT_SUBMITTED",
        message: "Report submitted: 불쾌한 언행",
        timestamp: "2026-04-22T10:05:00.000Z"
      }
    ],
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

describe("ReportsPanel", () => {
  it("shows blocked status and incident visibility for admin review", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ReportsPanel, {
        snapshot: createSnapshot(),
        onResolve: vi.fn(async () => undefined),
        onSetBlacklistStatus: vi.fn(async () => true)
      })
    );

    expect(markup).toContain("참가자 ID: participant_target");
    expect(markup).toContain("전화번호: 010-87**-4321");
    expect(markup).toContain("상태: 운영 제한");
    expect(markup).toContain("제한 사유: 운영 정책상 제한");
    expect(markup).toContain("신고 접수");
    expect(markup).toContain("Report submitted: 불쾌한 언행");
  });
});
