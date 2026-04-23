import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getCurrentAdminSession } from "@/lib/admin-auth";

export default async function AdminPage() {
  const adminSession = await getCurrentAdminSession();
  return <AdminDashboard adminSession={adminSession} />;
}
