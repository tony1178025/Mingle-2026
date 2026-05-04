import { NextRequest } from "next/server";
import { requireAdminRole } from "@/app/api/admin/helpers";
import { jsonError, jsonOk } from "@/lib/api/json-response";
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
      return jsonError("previewId가 필요합니다.", 400, { code: "PREVIEW_ID_REQUIRED" });
    }
    const preview = await getRotationPreview(sessionId, previewId);
    if (!preview) {
      return jsonError("유효한 프리뷰를 찾지 못했습니다. 프리뷰를 다시 생성해주세요.", 400, {
        code: "ROTATION_PREVIEW_NOT_FOUND"
      });
    }
    const locked = await acquireRotationApplyLock(sessionId);
    if (!locked) {
      return jsonError(
        "다른 운영자가 rotation apply를 진행 중입니다. 잠시 후 다시 시도해주세요.",
        409,
        { code: "ROTATION_APPLY_LOCKED" }
      );
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
    if (preview.rotationRound === 1) {
      publishRotationEvent({
        type: "table-pick:opened",
        sessionId: result.snapshot.session.id,
        rotationIndex: 1
      });
    } else if (preview.rotationRound >= 2) {
      publishRotationEvent({
        type: "table-pick:closed",
        sessionId: result.snapshot.session.id,
        rotationIndex: 1
      });
    }
    publishRotationEvent({
      type: "participant:tableChanged",
      sessionId: result.snapshot.session.id,
      participantIds: preview.moves.map((move) => move.participantId)
    });
    return jsonOk({
      snapshot: sanitizeSnapshotForAdmin(result.snapshot),
      rotationPreview: result.rotationPreview ?? null
    });
    } finally {
      await releaseRotationApplyLock(sessionId);
    }
  } catch (error) {
    console.error("[api/admin/rotation/apply]", error);
    const message = error instanceof Error ? error.message : "회전 적용에 실패했습니다.";
    return jsonError(message, 400, { code: "ADMIN_ROTATION_APPLY_FAILED" });
  }
}
