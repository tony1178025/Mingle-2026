import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createSeedSnapshot } from "@/lib/mingle";
import {
  createInMemoryAdminUserStore,
  hashAdminPassword,
  setAdminUserStoreForTests
} from "@/lib/admin-user-store";
import {
  buildCustomerSession,
  issueCustomerSession
} from "@/lib/customer-session";
import { getAdminSessionCookieValue } from "@/lib/admin-auth";
import {
  setSessionAuthorityRepositoryForTests
} from "@/lib/repositories/authority-backend";
import {
  createDbAuthorityRepository,
  createMemoryDbAuthorityAdapter
} from "@/lib/repositories/db-repository";

function buildCustomerCookie(participantId: string, reservationId: string, sessionId: string, sessionVersion: number) {
  const response = NextResponse.json({ ok: true });
  issueCustomerSession(
    response,
    buildCustomerSession({
      participantId,
      reservationId,
      sessionId,
      sessionVersion
    })
  );

  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

describe("db authority integration", () => {
  const originalAdminSecret = process.env.MINGLE_ADMIN_SESSION_SECRET;
  const originalCustomerSecret = process.env.MINGLE_CUSTOMER_SESSION_SECRET;
  const originalReadFromDb = process.env.READ_FROM_DB;

  beforeEach(() => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = "admin-session-secret";
    process.env.MINGLE_CUSTOMER_SESSION_SECRET = "customer-session-secret";
    process.env.READ_FROM_DB = "true";
    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users: [
          {
            id: "admin_hq",
            email: "hq-admin@mingle.local",
            passwordHash: hashAdminPassword("admin-secret"),
            role: "HQ_ADMIN",
            branchId: null,
            isActive: true,
            displayName: "HQ Admin",
            createdAt: "2026-04-23T09:00:00.000Z",
            updatedAt: "2026-04-23T10:00:00.000Z",
            lastLoginAt: null,
            updatedBy: "system"
          }
        ]
      })
    );
    setSessionAuthorityRepositoryForTests(
      createDbAuthorityRepository({
        adapter: createMemoryDbAuthorityAdapter(),
        createSnapshot: () => createSeedSnapshot()
      })
    );
  });

  afterEach(() => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = originalAdminSecret;
    process.env.MINGLE_CUSTOMER_SESSION_SECRET = originalCustomerSecret;
    process.env.READ_FROM_DB = originalReadFromDb;
    setAdminUserStoreForTests(null);
    setSessionAuthorityRepositoryForTests(null);
  });

  it("restores signed customer session against the db authority backend", async () => {
    const snapshot = createSeedSnapshot();
    const participant = snapshot.participants[0];
    expect(participant).toBeTruthy();

    const cookie = buildCustomerCookie(
      participant!.id,
      participant!.reservationId ?? "reservation_missing",
      snapshot.session.id,
      snapshot.session.customerSessionVersion
    );

    const { GET } = await import("@/app/api/session/current/route");
    const response = await GET(
      new NextRequest("http://localhost/api/session/current", {
        headers: { cookie }
      })
    );
    const payload = (await response.json()) as {
      currentParticipantId: string | null;
      data: { session: { branchId: string } };
    };

    expect(response.status).toBe(200);
    expect(payload.currentParticipantId).toBe(participant!.id);
    expect(payload.data.session.branchId).toBe("branch_seongsu");
  }, 30000);

  it("issues admin session cookie from the db-backed admin user store", async () => {
    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ login: "hq-admin@mingle.local", password: "admin-secret" })
      })
    );
    const payload = (await response.json()) as {
      ok: boolean;
      adminSession: { adminUserId: string; role: string; branchId: string | null };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.adminSession.adminUserId).toBe("admin_hq");
    expect(payload.adminSession.role).toBe("HQ_ADMIN");
    expect(response.headers.get("set-cookie")).toContain("mingle_admin_session");
  }, 30000);

  it("restricts admin session control commands by role", async () => {
    const { POST } = await import("@/app/api/session/command/route");
    const response = await POST(
      new NextRequest("http://localhost/api/session/command", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `mingle_admin_session=${getAdminSessionCookieValue({
            adminUserId: "staff_branch_seongsu",
            role: "STAFF",
            branchId: "branch_seongsu"
          })}`
        },
        body: JSON.stringify({
          type: "admin.setSessionState",
          state: "ROUND_1"
        })
      })
    );

    expect(response.status).toBe(403);
  }, 30000);

  it("restricts branch-scoped admins to their configured branch", async () => {
    const { POST } = await import("@/app/api/session/command/route");
    const response = await POST(
      new NextRequest("http://localhost/api/session/command", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `mingle_admin_session=${getAdminSessionCookieValue({
            adminUserId: "branch_admin_gangnam",
            role: "BRANCH_ADMIN",
            branchId: "branch_gangnam"
          })}`
        },
        body: JSON.stringify({
          type: "admin.toggleReveal",
          value: true
        })
      })
    );

    expect(response.status).toBe(403);
  }, 30000);

  it("rejects customer requests when db authority sessionVersion revokes the cookie", async () => {
    const dbRepository = createDbAuthorityRepository({
      adapter: createMemoryDbAuthorityAdapter(),
      createSnapshot: () => createSeedSnapshot()
    });
    setSessionAuthorityRepositoryForTests(dbRepository);

    const snapshot = await dbRepository.getSessionSnapshot();
    const participant = snapshot.participants[0];
    expect(participant).toBeTruthy();

    const revokedSnapshot = await dbRepository.upsertExistingSessionSnapshot({
      ...snapshot,
      session: {
        ...snapshot.session,
        customerSessionVersion: snapshot.session.customerSessionVersion + 1
      }
    });

    const staleCookie = buildCustomerCookie(
      participant!.id,
      participant!.reservationId ?? "reservation_missing",
      revokedSnapshot.session.id,
      revokedSnapshot.session.customerSessionVersion - 1
    );

    const { POST } = await import("@/app/api/session/command/route");
    const response = await POST(
      new NextRequest("http://localhost/api/session/command", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: staleCookie
        },
        body: JSON.stringify({
          type: "customer.setRound2Attendance",
          participantId: participant!.id,
          attendance: "YES"
        })
      })
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("mingle_customer_session=");
  }, 30000);
});
