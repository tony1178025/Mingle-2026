import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  createInMemoryAdminUserStore,
  hashAdminPassword,
  setAdminUserStoreForTests
} from "@/lib/admin-user-store";
import type { AdminUserRecord, AdminUserRow } from "@/types/mingle";
import { buildSeedAdminUserRows } from "@/scripts/seed-admin-users";

function mapSeedRowToRecord(row: AdminUserRow): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    branchId: row.branch_id,
    isActive: row.is_active,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    updatedBy: row.updated_by
  };
}

describe("admin login bootstrap contract", () => {
  const originalAdminSecret = process.env.MINGLE_ADMIN_SESSION_SECRET;
  const originalBootstrapPassword = process.env.MINGLE_ADMIN_BOOTSTRAP_PASSWORD;
  const originalLegacyPassword = process.env.MINGLE_ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = "admin-session-secret";
    process.env.MINGLE_ADMIN_BOOTSTRAP_PASSWORD = "bootstrap-admin-secret";
    delete process.env.MINGLE_ADMIN_PASSWORD;
  });

  afterEach(() => {
    process.env.MINGLE_ADMIN_SESSION_SECRET = originalAdminSecret;
    process.env.MINGLE_ADMIN_BOOTSTRAP_PASSWORD = originalBootstrapPassword;
    process.env.MINGLE_ADMIN_PASSWORD = originalLegacyPassword;
    setAdminUserStoreForTests(null);
  });

  it("seeded HQ admin can log in with the bootstrap password", async () => {
    const { rows } = await buildSeedAdminUserRows(null);
    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users: rows.map(mapSeedRowToRecord)
      })
    );

    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "hq-admin@mingle.local",
          password: "bootstrap-admin-secret"
        })
      })
    );
    const payload = (await response.json()) as {
      ok: boolean;
      adminSession: { adminUserId: string; role: string; branchId: string | null };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.adminSession.adminUserId).toBe("hq_admin_default");
    expect(payload.adminSession.role).toBe("HQ_ADMIN");
  }, 30000);

  it("seeded branch admin can log in with login id and the bootstrap password", async () => {
    const { rows } = await buildSeedAdminUserRows(null);
    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users: rows.map(mapSeedRowToRecord)
      })
    );

    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "branch_admin_seongsu",
          password: "bootstrap-admin-secret"
        })
      })
    );
    const payload = (await response.json()) as {
      adminSession: { adminUserId: string; role: string; branchId: string | null };
    };

    expect(response.status).toBe(200);
    expect(payload.adminSession.adminUserId).toBe("branch_admin_seongsu");
    expect(payload.adminSession.role).toBe("BRANCH_ADMIN");
    expect(payload.adminSession.branchId).toBe("branch_seongsu");
  }, 30000);

  it("first-login bootstrap sync recovers seeded admins from an older password hash", async () => {
    const { rows } = await buildSeedAdminUserRows(null);
    const users = rows.map(mapSeedRowToRecord);
    users[0] = {
      ...users[0],
      passwordHash: hashAdminPassword("old-bootstrap-secret")
    };

    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users
      })
    );

    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "hq_admin_default",
          password: "bootstrap-admin-secret"
        })
      })
    );

    expect(response.status).toBe(200);
  }, 30000);

  it("disabled admin cannot log in", async () => {
    const { rows } = await buildSeedAdminUserRows(null);
    const users = rows.map(mapSeedRowToRecord);
    users[0] = {
      ...users[0],
      isActive: false
    };

    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users
      })
    );

    const { POST } = await import("@/app/api/admin/auth/route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "hq-admin@mingle.local",
          password: "bootstrap-admin-secret"
        })
      })
    );

    expect(response.status).toBe(401);
  }, 30000);

  it("wrong password fails and password hashes are not exposed by admin summaries", async () => {
    const { rows } = await buildSeedAdminUserRows(null);
    const users = rows.map(mapSeedRowToRecord);
    setAdminUserStoreForTests(
      createInMemoryAdminUserStore({
        users
      })
    );

    const authRoute = await import("@/app/api/admin/auth/route");
    const wrongPasswordResponse = await authRoute.POST(
      new NextRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: "hq-admin@mingle.local",
          password: "wrong-password"
        })
      })
    );

    expect(wrongPasswordResponse.status).toBe(401);

    const summaries = await createInMemoryAdminUserStore({ users }).listAdminUsers();
    expect(summaries[0]).not.toHaveProperty("passwordHash");
    expect(summaries[0]).not.toHaveProperty("password_hash");
  }, 30000);
});
