import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
  if ("response" in auth) return auth.response;
  const { sessionId } = await context.params;
  return NextResponse.json({
    sessionId,
    status: "CLOSED"
  });
}
