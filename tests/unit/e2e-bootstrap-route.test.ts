import { afterEach, describe, expect, it, vi } from "vitest";
import { setAdminUserStoreForTests } from "@/lib/admin-user-store";

describe("e2e bootstrap route guard", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSeedEnabled = process.env.E2E_SEED_ENABLED;
  const mutableEnv = process.env as Record<string, string | undefined>;

  afterEach(() => {
    vi.resetModules();
    mutableEnv.NODE_ENV = originalNodeEnv;
    mutableEnv.E2E_SEED_ENABLED = originalSeedEnabled;
    setAdminUserStoreForTests(null);
  });

  it("returns 403 when E2E_SEED_ENABLED is false", async () => {
    mutableEnv.NODE_ENV = "development";
    mutableEnv.E2E_SEED_ENABLED = "false";
    const route = await import("@/app/api/test/e2e/bootstrap/route");
    const response = await route.POST();
    expect(response.status).toBe(403);
  });

  it("returns 404 in production", async () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.E2E_SEED_ENABLED = "true";
    const route = await import("@/app/api/test/e2e/bootstrap/route");
    const response = await route.POST();
    expect(response.status).toBe(404);
  });
});
