import { NextRequest } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { getServerSessionSnapshot, sanitizeSnapshotForAdmin } from "@/lib/repositories/server-repository";
import { runRotationPreview } from "@/server/rotation/rotation-runner";
import { saveRotationPreview } from "@/server/rotation/rotation.redis";
import { publishRotationEvent } from "@/server/rotation/rotation.socket";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = requireAdminRole(request, ["BRANCH_ADMIN"]);
    if ("response" in auth) {
      return auth.response;
    }

    const snapshot = await getServerSessionSnapshot();
    const computed = await runRotationPreview(snapshot);
    await saveRotationPreview(snapshot.session.id, computed.preview);
    publishRotationEvent({
      type: "rotation:previewed",
      sessionId: snapshot.session.id
    });
    return jsonOk({
      snapshot: sanitizeSnapshotForAdmin(snapshot),
      rotationPreview: computed.preview,
      warnings: computed.warnings,
      fallbackUsed: computed.fallbackUsed
    });
  } catch (error) {
    console.error("[api/admin/rotation/preview]", error);
    const message = error instanceof Error ? error.message : "회전 프리뷰 생성에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_ROTATION_PREVIEW_FAILED" });
  }
}
