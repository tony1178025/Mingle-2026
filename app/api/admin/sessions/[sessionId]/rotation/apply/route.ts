import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { executeServerCommand, sanitizeSnapshotForAdmin } from "@/lib/repositories/server-repository";
import type { RotationPreview } from "@/types/mingle";
import { getRotationPreview } from "@/server/rotation/rotation.redis";
import { publishRotationEvent } from "@/server/rotation/rotation.socket";

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

    const body = (await request.json()) as { preview?: RotationPreview; expectedVersion?: number };
    const { sessionId } = await context.params;
    const preview = body.preview ?? (await getRotationPreview(sessionId));
    if (!preview) {
      return new NextResponse("회전 프리뷰가 만료되었습니다. 다시 생성해주세요.", { status: 400 });
    }
    const result = await executeServerCommand({
      type: "admin.applyRotation",
      preview,
      expectedVersion: body.expectedVersion
    });
    publishRotationEvent({
      type: "rotation:applied",
      sessionId: result.snapshot.session.id
    });
    publishRotationEvent({
      type: "participant:tableChanged",
      sessionId: result.snapshot.session.id,
      participantIds: preview.moves.map((move) => move.participantId)
    });
    return NextResponse.json({
      snapshot: sanitizeSnapshotForAdmin(result.snapshot),
      rotationPreview: result.rotationPreview ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "회전 적용에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
