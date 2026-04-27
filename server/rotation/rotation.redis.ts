import type { RotationPreview } from "@/types/mingle";

const PREVIEW_TTL_MS = 5 * 60 * 1000;
const APPLY_LOCK_TTL_MS = 20 * 1000;
const inMemoryPreviewStore = new Map<
  string,
  {
    expiresAt: number;
    previewId: string;
    preview: RotationPreview;
  }
>();
const applyLockStore = new Map<string, number>();
const participantSeenEdges = new Map<string, number>();

function buildPreviewKey(sessionId: string) {
  return `session:${sessionId}:rotation:preview`;
}

function buildLockKey(sessionId: string) {
  return `session:${sessionId}:rotation_apply_lock`;
}

function edgeKey(sessionId: string, participantA: string, participantB: string) {
  const [left, right] = [participantA, participantB].sort();
  return `session:${sessionId}:seen:${left}:${right}`;
}

export async function saveRotationPreview(sessionId: string, preview: RotationPreview) {
  const key = buildPreviewKey(sessionId);
  const previewId = preview.previewId ?? `${Date.now()}`;
  inMemoryPreviewStore.set(key, {
    previewId,
    preview: { ...preview, previewId },
    expiresAt: Date.now() + PREVIEW_TTL_MS
  });
}

export async function getRotationPreview(
  sessionId: string,
  previewId?: string
): Promise<RotationPreview | null> {
  const key = buildPreviewKey(sessionId);
  const cached = inMemoryPreviewStore.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    inMemoryPreviewStore.delete(key);
    return null;
  }
  if (previewId && cached.previewId !== previewId) {
    return null;
  }
  return cached.preview;
}

export async function acquireRotationApplyLock(sessionId: string): Promise<boolean> {
  const key = buildLockKey(sessionId);
  const now = Date.now();
  const existingExpiresAt = applyLockStore.get(key);
  if (existingExpiresAt && existingExpiresAt > now) {
    return false;
  }
  applyLockStore.set(key, now + APPLY_LOCK_TTL_MS);
  return true;
}

export async function releaseRotationApplyLock(sessionId: string) {
  applyLockStore.delete(buildLockKey(sessionId));
}

export async function accumulateParticipantSeenEdges(
  sessionId: string,
  tableAssignments: Array<{ tableId: number; participantIds: string[] }>
) {
  for (const assignment of tableAssignments) {
    for (let index = 0; index < assignment.participantIds.length; index += 1) {
      for (let offset = index + 1; offset < assignment.participantIds.length; offset += 1) {
        const key = edgeKey(
          sessionId,
          assignment.participantIds[index]!,
          assignment.participantIds[offset]!
        );
        participantSeenEdges.set(key, (participantSeenEdges.get(key) ?? 0) + 1);
      }
    }
  }
}
