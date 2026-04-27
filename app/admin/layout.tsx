import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { hasAdminPasswordConfigured, isAuthorizedAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const configured = hasAdminPasswordConfigured();
  const authorized = configured ? await isAuthorizedAdminSession() : false;

  if (!authorized) {
    return <AdminGuard configured={configured} />;
  }

  return <div className="admin-shell min-h-screen">{children}</div>;
}
