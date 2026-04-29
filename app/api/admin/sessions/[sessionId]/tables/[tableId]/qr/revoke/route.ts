import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { executeServerCommand } from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string; tableId: string }> }
) {
  try {
    const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }
    const { sessionId, tableId } = await context.params;
    const parsedTableId = Number(tableId);
    if (!Number.isInteger(parsedTableId) || parsedTableId < 1) {
      return new NextResponse("유효한 tableId가 필요합니다.", { status: 400 });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return new NextResponse("유효한 sessionId가 필요합니다.", { status: 400 });
    }
    const result = await executeServerCommand({
      type: "admin.revokeTableQr",
      sessionId,
      tableId: parsedTableId
    });
    return NextResponse.json({ status: "OK", snapshot: result.snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR 폐기에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
