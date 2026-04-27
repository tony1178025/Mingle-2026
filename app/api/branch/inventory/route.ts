import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["STAFF"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ items: [], totalItems: 0, lowStockItems: 0 });
}
