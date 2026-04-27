import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["HQ_ADMIN"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({
    todayRevenue: 0,
    monthRevenue: 0,
    profit: 0,
    cogsRate: 0,
    noShowRate: 0,
    roas: null,
    revisitRate: 0
  });
}
