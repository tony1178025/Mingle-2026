import type { RotationPreview } from "@/types/mingle";

const PREVIEW_TTL_MS = 5 * 60 * 1000;
const inMemoryPreviewStore = new Map<
  string,
  {
    expiresAt: number;
    preview: RotationPreview;
  }
>();

function buildPreviewKey(sessionId: string) {
  return `session:${sessionId}:rotation:preview`;
}

export async function saveRotationPreview(sessionId: string, preview: RotationPreview) {
  const key = buildPreviewKey(sessionId);
  inMemoryPreviewStore.set(key, {
    preview,
    expiresAt: Date.now() + PREVIEW_TTL_MS
  });
}

export async function getRotationPreview(sessionId: string): Promise<RotationPreview | null> {
  const key = buildPreviewKey(sessionId);
  const cached = inMemoryPreviewStore.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    inMemoryPreviewStore.delete(key);
    return null;
  }
  return cached.preview;
}
