import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { calculateChannelPnL } from "@/lib/services/channel-pnl-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = requireAdminRole(request, ["HQ_ADMIN"]);
  if ("response" in auth) return auth.response;
  return NextResponse.json({
    channels: calculateChannelPnL({
      reservations: [],
      totalCogs: 0
    })
  });
}
