import { NextRequest } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
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
      return jsonError("유효한 tableId가 필요합니다.", 400, { code: "TABLE_ID_INVALID" });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return jsonError("유효한 sessionId가 필요합니다.", 400, { code: "SESSION_ID_INVALID" });
    }
    const result = await executeServerCommand({
      type: "admin.revokeTableQr",
      sessionId,
      tableId: parsedTableId
    });
    return jsonOk({ status: "OK" as const, snapshot: result.snapshot });
  } catch (error) {
    console.error("[api/admin/qr/revoke]", error);
    const message = error instanceof Error ? error.message : "QR 폐기에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_QR_REVOKE_FAILED" });
  }
}
