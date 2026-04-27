import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["HQ_ADMIN"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ items: [], total: 0 });
}
