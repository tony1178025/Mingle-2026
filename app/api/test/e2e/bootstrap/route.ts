import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createSeedSnapshot, MINGLE_CONSTANTS } from "@/lib/mingle";
import {
  createInMemoryAdminUserStore,
  hashAdminPassword,
  setAdminUserStoreForTests
} from "@/lib/admin-user-store";
import { getAdminSessionCookieValue, getCurrentAdminSession } from "@/lib/admin-auth";
import { createFileAuthorityRepository } from "@/lib/repositories/file-repository";
import type { ExternalReservationSessionContext, SessionSnapshot } from "@/types/mingle";

export const runtime = "nodejs";

const E2E_ADMIN = {
  id: "e2e_admin",
  email: "e2e-admin@mingle.local",
  password: "e2e-admin-password"
} as const;

function isSeedAllowed() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.E2E_SEED_ENABLED === "true";
}

function deniedResponse() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return new NextResponse("E2E bootstrap is disabled.", { status: 403 });
}

function resolveE2EDataDir() {
  // Use default runtime data directory so every request sees the same deterministic seed.
  return process.env.MINGLE_E2E_DATA_DIR?.trim() || path.join(process.cwd(), ".mingle-data");
}

function createDeterministicSnapshot(nowIso: string): SessionSnapshot {
  const snapshot = createSeedSnapshot();
  const tableQrCodes = [
    {
      id: "qr_e2e_table_1_active",
      branchId: snapshot.session.branchId,
      sessionId: snapshot.session.id,
      tableId: 1,
      code: "e2e-active-table-1",
      status: "ACTIVE" as const,
      createdAt: nowIso,
      revokedAt: null
    },
    {
      id: "qr_e2e_table_2_active",
      branchId: snapshot.session.branchId,
      sessionId: snapshot.session.id,
      tableId: 2,
      code: "e2e-active-table-2",
      status: "ACTIVE" as const,
      createdAt: nowIso,
      revokedAt: null
    }
  ];

  return {
    ...snapshot,
    session: {
      ...snapshot.session,
      phase: "ROUND_1",
      lifecycleStatus: "OPEN",
      startedAt: nowIso,
      updatedAt: nowIso,
      customerSessionVersion: snapshot.session.customerSessionVersion + 1,
      tableCount: Math.max(2, snapshot.session.tableCount)
    },
    participants: snapshot.participants.map((participant, index) => ({
      ...participant,
      tableId: index % 2 === 0 ? 1 : 2
    })),
    tableQrCodes,
    activeContentIds: ["content_e2e_live_1"],
    liveContent: {
      id: "content_e2e_live_1",
      templateId: "table-impression-pick",
      kind: "table_impression_pick",
      title: "E2E 콘텐츠 카드",
      description: "테스트용 라이브 콘텐츠",
      ctaLabel: "제출",
      scope: "TABLE",
      targetTableId: null,
      createdAt: nowIso,
      expiresAt: null,
      status: "LIVE",
      options: ["옵션 A", "옵션 B"],
      message: "E2E bootstrap content"
    },
    reports: [
      {
        id: "report_e2e_seed_1",
        sessionId: snapshot.session.id,
        reporterId: snapshot.participants[0]?.id ?? "f_01",
        targetId: snapshot.participants[1]?.id ?? "m_01",
        reason: "불쾌한 언행",
        details: "E2E bootstrap report seed",
        createdAt: nowIso,
        resolvedAt: null,
        status: "PENDING"
      }
    ]
  };
}

function createReservationRecords(snapshot: SessionSnapshot): ExternalReservationSessionContext[] {
  return [
    {
      sessionId: snapshot.session.id,
      branchId: snapshot.session.branchId,
      reservationId: "e2e_reservation_table_1",
      reservationExternalId: "e2e_external_table_1",
      checkinCode: "e2e-active-table-1",
      reservationLabel: "E2E 테스트 예약 1",
      phone: "01011112222",
      gender: "M",
      status: "ACTIVE",
      eligible: true
    },
    {
      sessionId: snapshot.session.id,
      branchId: snapshot.session.branchId,
      reservationId: "e2e_reservation_table_2",
      reservationExternalId: "e2e_external_table_2",
      checkinCode: "e2e-active-table-2",
      reservationLabel: "E2E 테스트 예약 2",
      phone: "01033334444",
      gender: "F",
      status: "ACTIVE",
      eligible: true
    }
  ];
}

export async function POST() {
  if (!isSeedAllowed()) {
    return deniedResponse();
  }

  const nowIso = new Date().toISOString();
  const dataDir = resolveE2EDataDir();
  const snapshotFile = path.join(dataDir, "session.json");
  const reservationFile = path.join(dataDir, "reservations.json");

  process.env.READ_FROM_DB = "false";
  process.env.USE_DB_AUTHORITY = "false";
  process.env.MINGLE_EXTERNAL_RESERVATION_SOURCE_PATH = reservationFile;

  const fileAuthority = createFileAuthorityRepository({ dataDir, snapshotFile });

  const seededSnapshot = createDeterministicSnapshot(nowIso);
  await fileAuthority.persistSessionSnapshot({
    ...seededSnapshot,
    version: 0
  });

  const reservationRecords = createReservationRecords(seededSnapshot);
  await mkdir(dataDir, { recursive: true });
  await writeFile(snapshotFile, JSON.stringify({ ...seededSnapshot, version: 1 }, null, 2), "utf8");
  await writeFile(reservationFile, JSON.stringify(reservationRecords, null, 2), "utf8");

  setAdminUserStoreForTests(
    createInMemoryAdminUserStore({
      users: [
        {
          id: E2E_ADMIN.id,
          email: E2E_ADMIN.email,
          passwordHash: hashAdminPassword(E2E_ADMIN.password),
          role: "BRANCH_ADMIN",
          branchId: seededSnapshot.session.branchId,
          isActive: true,
          displayName: "E2E Branch Admin",
          createdAt: nowIso,
          updatedAt: nowIso,
          lastLoginAt: null,
          updatedBy: "e2e-bootstrap"
        }
      ]
    })
  );

  const round1Target = seededSnapshot.participants[0];
  const round2Target = seededSnapshot.participants[1] ?? seededSnapshot.participants[0];
  const adminCookie = getAdminSessionCookieValue({
    adminUserId: E2E_ADMIN.id,
    role: "BRANCH_ADMIN",
    branchId: seededSnapshot.session.branchId
  });

  return NextResponse.json({
    ok: true,
    branchId: seededSnapshot.session.branchId,
    sessionId: seededSnapshot.session.id,
    phase: seededSnapshot.session.phase,
    lifecycleStatus: seededSnapshot.session.lifecycleStatus ?? "OPEN",
    admin: {
      email: E2E_ADMIN.email,
      password: E2E_ADMIN.password,
      cookieValue: adminCookie
    },
    qrUrls: {
      tableA: `/customer?branchId=${seededSnapshot.session.branchId}&tableId=1&code=e2e-active-table-1`,
      tableB: `/customer?branchId=${seededSnapshot.session.branchId}&tableId=2&code=e2e-active-table-2`,
      revokedTableA: `/customer?branchId=${seededSnapshot.session.branchId}&tableId=1&code=e2e-revoked-table-1`,
      regeneratedTableA: `/customer?branchId=${seededSnapshot.session.branchId}&tableId=1&code=e2e-regenerated-table-1`
    },
    tables: [
      { id: 1, label: "테이블 1", qrStatus: "ACTIVE" },
      { id: 2, label: "테이블 2", qrStatus: "ACTIVE" }
    ],
    participants: {
      round1Target: round1Target?.id ?? null,
      round1TargetNickname: round1Target?.nickname ?? null,
      round2Target: round2Target?.id ?? null,
      round2TargetNickname: round2Target?.nickname ?? null,
      round2TargetTableId: round2Target?.tableId ?? 1,
      reportTarget: round2Target?.id ?? null
    },
    onboardingProfile: {
      nickname: `e2e-user-${Date.now().toString().slice(-6)}`,
      age: "29",
      jobCategory: "IT/프로덕트",
      job: "E2E Engineer",
      heightCm: "175",
      animalType: "고양이상",
      energyType: "E"
    },
    metadata: {
      seedVersion: 1,
      source: "e2e-bootstrap",
      branchName: MINGLE_CONSTANTS.branchName,
      snapshotPath: snapshotFile,
      reservationPath: reservationFile
    }
  });
}

export async function GET() {
  if (!isSeedAllowed()) {
    return deniedResponse();
  }
  const session = await getCurrentAdminSession();
  return NextResponse.json({
    ok: true,
    configured: true,
    authorized: Boolean(session),
    session
  });
}
