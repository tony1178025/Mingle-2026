import { NextRequest } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { executeServerCommand } from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }
    const { sessionId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { rotationIndex?: 0 | 1 };
    const rotationIndex = body.rotationIndex ?? 0;
    const result = await executeServerCommand({
      type: "admin.closeTablePickWindow",
      rotationIndex
    });
    return jsonOk({ status: "OK" as const, sessionId, snapshot: result.snapshot });
  } catch (error) {
    console.error("[api/admin/table-picks/close]", error);
    const message = error instanceof Error ? error.message : "테이블 픽 마감에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_TABLE_PICK_CLOSE_FAILED" });
  }
}
