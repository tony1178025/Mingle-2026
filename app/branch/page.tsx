import { getCurrentAdminSession } from "@/lib/admin-auth";
import Link from "next/link";

export default async function BranchPage() {
  const session = await getCurrentAdminSession();
  return (
    <main className="admin-shell min-h-screen">
      <div className="admin-stage">
        <section className="surface">
          <h1 className="admin-page-title">Branch Today</h1>
          <p className="admin-meta">{session?.branchId ?? "branch scope"}</p>
          <div className="button-row wrap-row">
            <Link href="/api/branch/today?branchId=branch_seongsu" className="button button-secondary">
              Today API
            </Link>
            <Link href="/api/branch/sessions" className="button button-secondary">
              Sessions API
            </Link>
            <Link href="/api/branch/close-report?sessionId=session_signature_20260412" className="button button-secondary">
              Close Report API
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
