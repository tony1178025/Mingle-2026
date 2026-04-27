import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { executeServerCommand, sanitizeSnapshotForAdmin } from "@/lib/repositories/server-repository";
import type { RotationPreview } from "@/types/mingle";
import {
  acquireRotationApplyLock,
  accumulateParticipantSeenEdges,
  getRotationPreview,
  releaseRotationApplyLock
} from "@/server/rotation/rotation.redis";
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

    const body = (await request.json()) as {
      preview?: RotationPreview;
      previewId?: string;
      expectedVersion?: number;
    };
    const { sessionId } = await context.params;
    const previewId = body.previewId ?? body.preview?.previewId;
    if (!previewId) {
      return new NextResponse("previewId가 필요합니다.", { status: 400 });
    }
    const preview = await getRotationPreview(sessionId, previewId);
    if (!preview) {
      return new NextResponse("유효한 프리뷰를 찾지 못했습니다. 프리뷰를 다시 생성해주세요.", {
        status: 400
      });
    }
    const locked = await acquireRotationApplyLock(sessionId);
    if (!locked) {
      return new NextResponse("다른 운영자가 rotation apply를 진행 중입니다. 잠시 후 다시 시도해주세요.", {
        status: 409
      });
    }
    try {
    const result = await executeServerCommand({
      type: "admin.applyRotation",
      preview,
      expectedVersion: body.expectedVersion
    });
    const participantIdsByTable = result.snapshot.participants.reduce<Record<number, string[]>>(
      (acc, participant) => {
        const current = acc[participant.tableId] ?? [];
        current.push(participant.id);
        acc[participant.tableId] = current;
        return acc;
      },
      {}
    );
    await accumulateParticipantSeenEdges(
      result.snapshot.session.id,
      Object.entries(participantIdsByTable).map(([tableId, participantIds]) => ({
        tableId: Number(tableId),
        participantIds
      }))
    );
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
    } finally {
      await releaseRotationApplyLock(sessionId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "회전 적용에 실패했습니다.";
    return new NextResponse(message, { status: 400 });
  }
}
