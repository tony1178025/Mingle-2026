import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["STAFF"]);
  if ("response" in auth) return auth.response;
  const branchId = request.nextUrl.searchParams.get("branchId") ?? auth.adminSession.branchId ?? "";
  return NextResponse.json({
    branchId,
    reservations: 0,
    checkedIn: 0,
    male: 0,
    female: 0,
    noShow: 0,
    expectedRevenue: 0,
    sessionStatus: "WAITING"
  });
}
