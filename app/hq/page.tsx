import { getCurrentAdminSession } from "@/lib/admin-auth";
import Link from "next/link";

export default async function HqPage() {
  const session = await getCurrentAdminSession();
  return (
    <main className="admin-shell min-h-screen">
      <div className="admin-stage">
        <section className="surface">
          <h1 className="admin-page-title">HQ Dashboard</h1>
          <p className="admin-meta">{session?.role ?? "HQ scope"}</p>
          <div className="button-row wrap-row">
            <Link href="/api/hq/dashboard" className="button button-secondary">
              Dashboard API
            </Link>
            <Link href="/api/hq/pnl" className="button button-secondary">
              PnL API
            </Link>
            <Link href="/api/hq/roas" className="button button-secondary">
              ROAS API
            </Link>
            <Link href="/api/hq/ltv" className="button button-secondary">
              LTV API
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
