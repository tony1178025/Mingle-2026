import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { HeartGrantPanel } from "@/components/admin/HeartGrantPanel";
import type { SessionSnapshot } from "@/types/mingle";

function createSnapshot(): SessionSnapshot {
  return {
    version: 1,
    session: {
      id: "session_signature_20260412",
      name: "Heart Grant Test",
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
      startedAt: "2026-04-22T10:00:00.000Z",
      updatedAt: "2026-04-22T10:00:00.000Z",
      tableCount: 1,
      tableCapacity: 6,
      customerSessionVersion: 1
    },
    participants: [
      {
        id: "participant_1",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        reservationId: "reservation_a",
        reservationExternalId: "naver_a",
        phone: "01012345678",
        nickname: "誘쇱닔",
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
        id: "participant_2",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        reservationId: "reservation_b",
        reservationExternalId: "naver_b",
        phone: "01087654321",
        nickname: "誘쇱닔",
        gender: "M",
        age: 30,
        jobCategory: "Finance",
        job: "Analyst",
        photoUrl: null,
        heightCm: 178,
        animalType: "dog",
        energyType: "I",
        checkinMode: "qr",
        tableId: 2,
        round2Attendance: "UNDECIDED",
        receivedHearts: 0,
        sentHearts: 0,
        profileViews: 0,
        heartsRemaining: 5,
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
    reports: [],
    blacklist: [
      {
        id: "blacklist_1",
        sessionId: "session_signature_20260412",
        branchId: "branch_seongsu",
        participantId: "participant_2",
        reason: "운영 정책상 제한",
        createdAt: "2026-04-22T10:10:00.000Z"
      }
    ],
    incidents: [],
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

describe("HeartGrantPanel", () => {
  it("shows stable identifiers and blocked status so duplicate nicknames are operationally distinguishable", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HeartGrantPanel, {
        snapshot: createSnapshot(),
        onGrantHearts: vi.fn(async () => true),
        onSetBlacklistStatus: vi.fn(async () => true)
      })
    );

    expect(markup).toContain("Participant ID: participant_1");
    expect(markup).toContain("Participant ID: participant_2");
    expect(markup).toContain("Reservation ID: reservation_a");
    expect(markup).toContain("Reservation ID: reservation_b");
    expect(markup).toContain("Phone: 010-12**-5678");
    expect(markup).toContain("Phone: 010-87**-4321");
    expect(markup).toContain("Status: BLOCKED");
    expect(markup).toContain("Block reason: 운영 정책상 제한");
  });
});
