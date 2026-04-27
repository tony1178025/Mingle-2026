import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createSeedSnapshot } from "@/lib/mingle";
import { getAdminSessionCookieValue } from "@/lib/admin-auth";
import { setSessionAuthorityRepositoryForTests } from "@/lib/repositories/authority-backend";
import {
  createDbAuthorityRepository,
  createMemoryDbAuthorityAdapter,
  type DbAuthorityRepository
} from "@/lib/repositories/db-repository";

const BRANCH_ID = "branch_seongsu";
const SESSION_ID = "session_signature_20260412";

function buildAdminCookie() {
  return `mingle_admin_session=${getAdminSessionCookieValue({
    adminUserId: "branch_admin_seongsu",
    role: "BRANCH_ADMIN",
    branchId: BRANCH_ID
  })}`;
}

describe("admin session lifecycle routes", () => {
  const originalSecret = process.env.MINGLE_ADMIN_SESSION_SECRET;
  const originalReadFromDb = process.env.READ_FROM_DB;
  let dbRepository: DbAuthorityRepository;

  beforeEach(async () => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = "admin-lifecycle-secret";
    process.env.READ_FROM_DB = "true";
    dbRepository = createDbAuthorityRepository({
      adapter: createMemoryDbAuthorityAdapter(),
      createSnapshot: () => {
        const snapshot = createSeedSnapshot();
        return {
          ...snapshot,
          participants: [],
          session: {
            ...snapshot.session,
            id: SESSION_ID,
            branchId: BRANCH_ID,
            phase: "CHECKIN"
          }
        };
      }
    });
    setSessionAuthorityRepositoryForTests(dbRepository);
    await dbRepository.getSessionSnapshot();
  });

  afterEach(() => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = originalSecret;
    process.env.READ_FROM_DB = originalReadFromDb;
    setSessionAuthorityRepositoryForTests(null);
  });

  it("allows admin current-session lookup without participant session", async () => {
    const route = await import("@/app/api/admin/sessions/current/route");
    const response = (await route.GET!(
      new NextRequest(`http://localhost/api/admin/sessions/current?branchId=${BRANCH_ID}`, {
        headers: { cookie: buildAdminCookie() }
      })
    )) as Response;
    expect(response.status).toBe(200);
  });

  it("allows admin to create session with zero participants", async () => {
    const route = await import("@/app/api/admin/sessions/route");
    const response = (await route.POST!(
      new NextRequest("http://localhost/api/admin/sessions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: buildAdminCookie()
        },
        body: JSON.stringify({
          name: "2026-04-27 1부",
          branchId: BRANCH_ID,
          eventId: "event_signature_20260412",
          venueName: "seongsu venue",
          venueAddress: "seongsu address",
          sessionDateLabel: "2026-04-27",
          sessionTimeLabel: "19:00",
          attendanceLabel: "입장",
          attendanceHint: "QR 스캔",
          code: "1000",
          tableCount: 5,
          tableCapacity: 6,
          maxCapacity: 30,
          status: "DRAFT"
        })
      })
    )) as Response;
    expect(response.status).toBe(200);
  });

  it("allows admin to close session", async () => {
    const route = await import("@/app/api/admin/sessions/[sessionId]/close/route");
    const response = (await route.POST!(
      new NextRequest(`http://localhost/api/admin/sessions/${SESSION_ID}/close`, {
        method: "POST",
        headers: { cookie: buildAdminCookie() }
      }),
      { params: Promise.resolve({ sessionId: SESSION_ID }) }
    )) as Response;
    expect(response.status).toBe(200);
  });
});
