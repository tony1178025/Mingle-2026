import {
  getServerSessionSnapshot,
  sanitizeSnapshotForClient,
  subscribeToSessionSnapshots
} from "@/lib/repositories/server-repository";
import type { SessionSyncEvent } from "@/types/mingle";

export const runtime = "nodejs";

function encodeEvent(event: SessionSyncEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const initial = await getServerSessionSnapshot();
      controller.enqueue(
        encoder.encode(
          encodeEvent({ type: "snapshot", snapshot: sanitizeSnapshotForClient(initial) })
        )
      );

      unsubscribe = subscribeToSessionSnapshots((snapshot) => {
        controller.enqueue(
          encoder.encode(
            encodeEvent({ type: "snapshot", snapshot: sanitizeSnapshotForClient(snapshot) })
          )
        );
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      unsubscribe?.();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
