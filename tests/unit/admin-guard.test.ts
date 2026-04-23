import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const authMocks = vi.hoisted(() => ({
  hasAdminPasswordConfigured: vi.fn(),
  isAuthorizedAdminSession: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => authMocks);

describe("admin route guard", () => {
  it("renders the guard screen when not authenticated", async () => {
    authMocks.hasAdminPasswordConfigured.mockReturnValue(true);
    authMocks.isAuthorizedAdminSession.mockResolvedValue(false);

    const { default: AdminLayout } = await import("@/app/admin/layout");
    const markup = renderToStaticMarkup(
      await AdminLayout({ children: React.createElement("div", null, "dashboard") })
    );

    expect(markup).toContain("ADMIN ACCESS");
    expect(markup).not.toContain("dashboard");
  }, 15000);

  it("renders admin content after authentication", async () => {
    authMocks.hasAdminPasswordConfigured.mockReturnValue(true);
    authMocks.isAuthorizedAdminSession.mockResolvedValue(true);

    const { default: AdminLayout } = await import("@/app/admin/layout");
    const markup = renderToStaticMarkup(
      await AdminLayout({ children: React.createElement("div", null, "dashboard") })
    );

    expect(markup).toContain("dashboard");
  }, 15000);
});
