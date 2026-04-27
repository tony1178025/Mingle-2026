import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = requireAdminRole(request, ["STAFF"]);
  if ("response" in auth) return auth.response;
  const movement = (await request.json()) as Record<string, unknown>;
  return NextResponse.json({
    movementId: `inv_mv_${Date.now()}`,
    ...movement
  });
}
