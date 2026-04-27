import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
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
    return NextResponse.json({
      snapshot: sanitizeSnapshotForAdmin(snapshot),
      rotationPreview: computed.preview,
      warnings: computed.warnings,
      fallbackUsed: computed.fallbackUsed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "회전 프리뷰 생성에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
