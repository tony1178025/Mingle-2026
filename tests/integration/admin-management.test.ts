import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSeedSnapshot } from "@/lib/mingle";
import {
  createInMemoryAdminUserStore,
  hashAdminPassword,
  setAdminUserStoreForTests
} from "@/lib/admin-user-store";
import { getAdminSessionCookieValue } from "@/lib/admin-auth";
import { setSessionAuthorityRepositoryForTests } from "@/lib/repositories/authority-backend";
import {
  createDbAuthorityRepository,
  createMemoryDbAuthorityAdapter,
  type DbAuthorityRepository
} from "@/lib/repositories/db-repository";
import type { AdminRole, AdminUserRecord, SessionSnapshot } from "@/types/mingle";
import { readRouteResponseData } from "@/tests/helpers/read-route-json";

const HQ_ADMIN_ID = "hq_admin";
const BRANCH_ADMIN_ID = "branch_admin_seongsu";
const STAFF_ID = "staff_seongsu";
const BRANCH_SEONGSU = "branch_seongsu";
const BRANCH_GANGNAM = "branch_gangnam";
const SEONGSU_EVENT_ID = "event_signature_20260412";
const GANGNAM_EVENT_ID = "event_gangnam_20260412";
const GANGNAM_SESSION_ID = "session_gangnam_20260412";

function buildAdminCookie(role: AdminRole, branchId: string | null, adminUserId: string) {
  return `mingle_admin_session=${getAdminSessionCookieValue({
    adminUserId,
    role,
    branchId
  })}`;
}

function buildAdminUsers(): AdminUserRecord[] {
  return [
    {
      id: HQ_ADMIN_ID,
      email: "hq-admin@mingle.local",
      passwordHash: hashAdminPassword("hq-secret-123"),
      role: "HQ_ADMIN",
      branchId: null,
      isActive: true,
      displayName: "HQ Admin",
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z",
      lastLoginAt: null,
      updatedBy: "system"
    },
    {
      id: BRANCH_ADMIN_ID,
      email: "seongsu-admin@mingle.local",
      passwordHash: hashAdminPassword("branch-secret-123"),
      role: "BRANCH_ADMIN",
      branchId: BRANCH_SEONGSU,
      isActive: true,
      displayName: "Seongsu Admin",
      createdAt: "2026-04-23T09:05:00.000Z",
      updatedAt: "2026-04-23T09:05:00.000Z",
      lastLoginAt: null,
      updatedBy: "system"
    },
    {
      id: STAFF_ID,
      email: "staff@mingle.local",
      passwordHash: hashAdminPassword("staff-secret-123"),
      role: "STAFF",
      branchId: BRANCH_SEONGSU,
      isActive: true,
      displayName: "Seongsu Staff",
      createdAt: "2026-04-23T09:10:00.000Z",
      updatedAt: "2026-04-23T09:10:00.000Z",
      lastLoginAt: null,
      updatedBy: "system"
    }
  ];
}

function createBranchSnapshot(
  sessionId: string,
  branchId: string,
  branchName: string,
  eventId: string
): SessionSnapshot {
  const snapshot = createSeedSnapshot();
  return {
    ...snapshot,
    participants: [],
    hearts: [],
    reports: [],
    blacklist: [],
    incidents: [],
    auditLogs: [],
    seatingAssignments: [],
    activeContentIds: [],
    liveContent: null,
    contentResponses: [],
    anonymousMessages: [],
    announcements: [],
    rotationInstruction: null,
    session: {
      ...snapshot.session,
      id: sessionId,
      name: `${branchName} evening session`,
      branchId,
      branchName,
      eventId,
      venueName: `${branchName} venue`,
      venueAddress: `${branchName} address`,
      sessionDateLabel: "2026-04-24",
      sessionTimeLabel: "19:00",
      attendanceLabel: "Check-in",
      attendanceHint: "Show your QR code",
      code: branchId === BRANCH_GANGNAM ? "7788" : snapshot.session.code,
      startedAt: "2026-04-23T11:00:00.000Z",
      updatedAt: "2026-04-23T11:00:00.000Z",
      tableCount: 5,
      tableCapacity: 6,
      customerSessionVersion: 1
    }
  };
}

describe("admin operations management routes", () => {
  const originalAdminSecret = process.env.MINGLE_ADMIN_SESSION_SECRET;
  const originalReadFromDb = process.env.READ_FROM_DB;
  let dbRepository: DbAuthorityRepository;

  beforeEach(async () => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = "admin-ops-secret";
    process.env.READ_FROM_DB = "true";

    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users: buildAdminUsers()
      })
    );

    dbRepository = createDbAuthorityRepository({
      adapter: createMemoryDbAuthorityAdapter(),
      createSnapshot: () => createSeedSnapshot()
    });
    setSessionAuthorityRepositoryForTests(dbRepository);
    await dbRepository.getSessionSnapshot();
    await dbRepository.upsertExistingSessionSnapshot(
      createBranchSnapshot(GANGNAM_SESSION_ID, BRANCH_GANGNAM, "gangnam", GANGNAM_EVENT_ID)
    );
  });

  afterEach(() => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = originalAdminSecret;
    process.env.READ_FROM_DB = originalReadFromDb;
    setAdminUserStoreForTests(null);
    setSessionAuthorityRepositoryForTests(null);
  });

  it("HQ_ADMIN can list admin users without exposing password hashes", async () => {
    const usersRoute = await import("@/app/api/admin/users/route");
    const response = await usersRoute.GET!(
      new NextRequest("http://localhost/api/admin/users", {
        headers: { cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID) }
      })
    );
    const payload = await readRouteResponseData<{
      users: Array<Record<string, unknown>>;
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.users).toHaveLength(3);
    expect(payload.users[0]).not.toHaveProperty("passwordHash");
    expect(payload.users[0]).not.toHaveProperty("password_hash");
  }, 30000);

  it("HQ_ADMIN can create an admin user", async () => {
    const usersRoute = await import("@/app/api/admin/users/route");
    const response = (await usersRoute.POST!(
      new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          email: "ops-new@mingle.local",
          password: "ops-secret-123",
          displayName: "Ops New",
          role: "STAFF",
          branchId: BRANCH_SEONGSU
        })
      })
    )) as Response;
    const payload = await readRouteResponseData<{
      user: { email: string; role: string; branchId: string | null; updatedBy: string | null };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.user.email).toBe("ops-new@mingle.local");
    expect(payload.user.role).toBe("STAFF");
    expect(payload.user.branchId).toBe(BRANCH_SEONGSU);
    expect(payload.user.updatedBy).toBe(HQ_ADMIN_ID);
  }, 30000);

  it("HQ_ADMIN can edit an admin user and update audit fields", async () => {
    const usersRoute = await import("@/app/api/admin/users/[adminUserId]/route");
    const response = (await usersRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/users/branch_admin_seongsu", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          type: "update",
          input: {
            email: "seongsu-ops@mingle.local",
            displayName: "Seongsu Ops Lead",
            role: "BRANCH_ADMIN",
            branchId: BRANCH_SEONGSU,
            isActive: true
          }
        })
      }),
      { params: Promise.resolve({ adminUserId: BRANCH_ADMIN_ID }) }
    )) as Response;
    const payload = await readRouteResponseData<{
      user: { email: string; displayName: string; updatedBy: string | null; updatedAt: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.user.email).toBe("seongsu-ops@mingle.local");
    expect(payload.user.displayName).toBe("Seongsu Ops Lead");
    expect(payload.user.updatedBy).toBe(HQ_ADMIN_ID);
    expect(payload.user.updatedAt).not.toBe("2026-04-23T09:05:00.000Z");
  }, 30000);

  it("HQ_ADMIN can reset an admin password", async () => {
    const userRoute = await import("@/app/api/admin/users/[adminUserId]/route");
    const resetResponse = (await userRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/users/branch_admin_seongsu", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          type: "reset-password",
          password: "new-branch-secret"
        })
      }),
      { params: Promise.resolve({ adminUserId: BRANCH_ADMIN_ID }) }
    )) as Response;

    expect(resetResponse.status).toBe(200);

    const authRoute = await import("@/app/api/admin/auth/route");
    const loginResponse = await authRoute.POST!(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "seongsu-admin@mingle.local",
          password: "new-branch-secret"
        })
      })
    );

    expect(loginResponse.status).toBe(200);
  }, 30000);

  it("HQ_ADMIN can disable an admin user", async () => {
    const userRoute = await import("@/app/api/admin/users/[adminUserId]/route");
    const response = (await userRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/users/staff_seongsu", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          type: "update",
          input: {
            email: "staff@mingle.local",
            displayName: "Seongsu Staff",
            role: "STAFF",
            branchId: BRANCH_SEONGSU,
            isActive: false
          }
        })
      }),
      { params: Promise.resolve({ adminUserId: STAFF_ID }) }
    )) as Response;
    const payload = await readRouteResponseData<{ user: { isActive: boolean } }>(response);

    expect(response.status).toBe(200);
    expect(payload.user.isActive).toBe(false);
  }, 30000);

  it("disabled admin users cannot log in", async () => {
    const userRoute = await import("@/app/api/admin/users/[adminUserId]/route");
    await userRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/users/staff_seongsu", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          type: "update",
          input: {
            email: "staff@mingle.local",
            displayName: "Seongsu Staff",
            role: "STAFF",
            branchId: BRANCH_SEONGSU,
            isActive: false
          }
        })
      }),
      { params: Promise.resolve({ adminUserId: STAFF_ID }) }
    );

    const authRoute = await import("@/app/api/admin/auth/route");
    const response = await authRoute.POST!(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "staff@mingle.local",
          password: "staff-secret-123"
        })
      })
    );

    expect(response.status).toBe(401);
  }, 30000);

  it("BRANCH_ADMIN cannot access admin-user management", async () => {
    const usersRoute = await import("@/app/api/admin/users/route");
    const response = await usersRoute.GET!(
      new NextRequest("http://localhost/api/admin/users", {
        headers: {
          cookie: buildAdminCookie("BRANCH_ADMIN", BRANCH_SEONGSU, BRANCH_ADMIN_ID)
        }
      })
    );

    expect(response.status).toBe(403);
  }, 30000);

  it("STAFF cannot access admin-user management", async () => {
    const usersRoute = await import("@/app/api/admin/users/route");
    const response = await usersRoute.GET!(
      new NextRequest("http://localhost/api/admin/users", {
        headers: {
          cookie: buildAdminCookie("STAFF", BRANCH_SEONGSU, STAFF_ID)
        }
      })
    );

    expect(response.status).toBe(403);
  }, 30000);

  it("HQ_ADMIN can create and edit branches", async () => {
    const createRoute = await import("@/app/api/admin/branches/route");
    const createResponse = (await createRoute.POST!(
      new NextRequest("http://localhost/api/admin/branches", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          id: "branch_sinsa",
          name: "Sinsa",
          venueName: "Sinsa Venue",
          venueAddress: "Sinsa-ro",
          defaultMaxCapacity: 36,
          defaultTableCount: 6,
          isActive: true
        })
      })
    )) as Response;
    const createdPayload = await readRouteResponseData<{
      branch: { id: string; name: string; updatedBy: string | null };
    }>(createResponse);

    expect(createResponse.status).toBe(200);
    expect(createdPayload.branch.id).toBe("branch_sinsa");
    expect(createdPayload.branch.updatedBy).toBe(HQ_ADMIN_ID);

    const updateRoute = await import("@/app/api/admin/branches/[branchId]/route");
    const updateResponse = (await updateRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/branches/branch_sinsa", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          name: "Sinsa Prime",
          venueName: "Sinsa Prime Venue",
          venueAddress: "Sinsa-ro 101",
          defaultMaxCapacity: 40,
          defaultTableCount: 7,
          isActive: true
        })
      }),
      { params: Promise.resolve({ branchId: "branch_sinsa" }) }
    )) as Response;
    const updatedPayload = await readRouteResponseData<{
      branch: { name: string; defaultMaxCapacity: number; updatedBy: string | null };
    }>(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updatedPayload.branch.name).toBe("Sinsa Prime");
    expect(updatedPayload.branch.defaultMaxCapacity).toBe(40);
    expect(updatedPayload.branch.updatedBy).toBe(HQ_ADMIN_ID);
  }, 30000);

  it("branch disable persists correctly", async () => {
    const updateRoute = await import("@/app/api/admin/branches/[branchId]/route");
    const disableResponse = (await updateRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/branches/branch_gangnam", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          name: "gangnam",
          venueName: "gangnam venue",
          venueAddress: "gangnam address",
          defaultMaxCapacity: 30,
          defaultTableCount: 5,
          isActive: false
        })
      }),
      { params: Promise.resolve({ branchId: BRANCH_GANGNAM }) }
    )) as Response;

    expect(disableResponse.status).toBe(200);

    const listRoute = await import("@/app/api/admin/branches/route");
    const listResponse = (await listRoute.GET!(
      new NextRequest("http://localhost/api/admin/branches", {
        headers: { cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID) }
      })
    )) as Response;
    const payload = await readRouteResponseData<{
      branches: Array<{ id: string; isActive: boolean }>;
    }>(listResponse);

    const disabledBranch = payload.branches.find((branch) => branch.id === BRANCH_GANGNAM);
    expect(disabledBranch?.isActive).toBe(false);
  }, 30000);

  it("HQ_ADMIN can manage any session", async () => {
    const createRoute = await import("@/app/api/admin/sessions/route");
    const createResponse = (await createRoute.POST!(
      new NextRequest("http://localhost/api/admin/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          id: "session_ops_20260425",
          name: "Ops Managed Session",
          branchId: BRANCH_SEONGSU,
          eventId: SEONGSU_EVENT_ID,
          venueName: "Seongsu Ops Venue",
          venueAddress: "Seongsu-ro 1",
          sessionDateLabel: "2026-04-25",
          sessionTimeLabel: "20:00",
          attendanceLabel: "Check-in",
          attendanceHint: "Arrive 10 minutes early",
          code: "8899",
          tableCount: 6,
          tableCapacity: 6,
          maxCapacity: 36,
          status: "DRAFT"
        })
      })
    )) as Response;
    const createPayload = await readRouteResponseData<{
      session: { id: string; branchId: string; status: string; updatedBy: string | null };
    }>(createResponse);

    expect(createResponse.status).toBe(200);
    expect(createPayload.session.id).toBe("session_ops_20260425");
    expect(createPayload.session.branchId).toBe(BRANCH_SEONGSU);
    expect(createPayload.session.updatedBy).toBe(HQ_ADMIN_ID);

    const updateRoute = await import("@/app/api/admin/sessions/[sessionId]/route");
    const updateResponse = (await updateRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/sessions/session_gangnam_20260412", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          status: "OPEN",
          maxCapacity: 42
        })
      }),
      { params: Promise.resolve({ sessionId: GANGNAM_SESSION_ID }) }
    )) as Response;
    const updatePayload = await readRouteResponseData<{
      session: { id: string; status: string; maxCapacity: number; updatedBy: string | null };
    }>(updateResponse);

    expect(updateResponse.status).toBe(200);
    expect(updatePayload.session.id).toBe(GANGNAM_SESSION_ID);
    expect(updatePayload.session.status).toBe("OPEN");
    expect(updatePayload.session.maxCapacity).toBe(42);
    expect(updatePayload.session.updatedBy).toBe(HQ_ADMIN_ID);
  }, 30000);

  it("BRANCH_ADMIN can manage only own-branch sessions", async () => {
    const sessionsRoute = await import("@/app/api/admin/sessions/route");
    const listResponse = (await sessionsRoute.GET!(
      new NextRequest("http://localhost/api/admin/sessions", {
        headers: {
          cookie: buildAdminCookie("BRANCH_ADMIN", BRANCH_SEONGSU, BRANCH_ADMIN_ID)
        }
      })
    )) as Response;
    const listPayload = await readRouteResponseData<{
      sessions: Array<{ branchId: string }>;
    }>(listResponse);

    expect(listResponse.status).toBe(200);
    expect(listPayload.sessions.every((session) => session.branchId === BRANCH_SEONGSU)).toBe(true);

    const sessionRoute = await import("@/app/api/admin/sessions/[sessionId]/route");
    const ownBranchResponse = (await sessionRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/sessions/session_signature_20260412", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("BRANCH_ADMIN", BRANCH_SEONGSU, BRANCH_ADMIN_ID)
        },
        body: JSON.stringify({
          status: "CLOSED"
        })
      }),
      { params: Promise.resolve({ sessionId: "session_signature_20260412" }) }
    )) as Response;

    expect(ownBranchResponse.status).toBe(200);

    const otherBranchResponse = (await sessionRoute.PATCH!(
      new NextRequest(`http://localhost/api/admin/sessions/${GANGNAM_SESSION_ID}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("BRANCH_ADMIN", BRANCH_SEONGSU, BRANCH_ADMIN_ID)
        },
        body: JSON.stringify({
          status: "CLOSED"
        })
      }),
      { params: Promise.resolve({ sessionId: GANGNAM_SESSION_ID }) }
    )) as Response;

    expect(otherBranchResponse.status).toBe(403);
  }, 30000);

  it("STAFF cannot manage sessions", async () => {
    const sessionsRoute = await import("@/app/api/admin/sessions/route");
    const response = (await sessionsRoute.GET!(
      new NextRequest("http://localhost/api/admin/sessions", {
        headers: {
          cookie: buildAdminCookie("STAFF", BRANCH_SEONGSU, STAFF_ID)
        }
      })
    )) as Response;

    expect(response.status).toBe(403);
  }, 30000);

  it("session create, edit, and status update persist correctly", async () => {
    const createRoute = await import("@/app/api/admin/sessions/route");
    await createRoute.POST!(
      new NextRequest("http://localhost/api/admin/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          id: "session_ops_20260426",
          name: "Ops Session Persisted",
          branchId: BRANCH_SEONGSU,
          eventId: SEONGSU_EVENT_ID,
          venueName: "HQ Venue",
          venueAddress: "HQ Road",
          sessionDateLabel: "2026-04-26",
          sessionTimeLabel: "21:00",
          attendanceLabel: "Check-in",
          attendanceHint: "Bring ID",
          code: "9911",
          tableCount: 5,
          tableCapacity: 6,
          maxCapacity: 30,
          status: "DRAFT"
        })
      })
    );

    const sessionRoute = await import("@/app/api/admin/sessions/[sessionId]/route");
    await sessionRoute.PATCH!(
      new NextRequest("http://localhost/api/admin/sessions/session_ops_20260426", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID)
        },
        body: JSON.stringify({
          name: "Ops Session Final",
          status: "DRAFT",
          maxCapacity: 34
        })
      }),
      { params: Promise.resolve({ sessionId: "session_ops_20260426" }) }
    );

    const sessionsRoute = await import("@/app/api/admin/sessions/route");
    const listResponse = (await sessionsRoute.GET!(
      new NextRequest("http://localhost/api/admin/sessions", {
        headers: { cookie: buildAdminCookie("HQ_ADMIN", null, HQ_ADMIN_ID) }
      })
    )) as Response;
    const payload = await readRouteResponseData<{
      sessions: Array<{ id: string; name: string; status: string; maxCapacity: number }>;
    }>(listResponse);

    const session = payload.sessions.find((item) => item.id === "session_ops_20260426");
    expect(session).toMatchObject({
      id: "session_ops_20260426",
      name: "Ops Session Final",
      status: "DRAFT",
      maxCapacity: 34
    });
  }, 30000);
});
