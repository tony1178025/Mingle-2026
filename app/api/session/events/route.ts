import { NextResponse } from "next/server";
import { getAuthorityRuntimeDiagnostics } from "@/lib/repositories/authority-backend";
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

function getRequiredEnvErrorCode() {
  const requiresDbAuthority =
    process.env.USE_DB_AUTHORITY === "true" || process.env.READ_FROM_DB === "true";
  if (!requiresDbAuthority) {
    return null;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    return "MISSING_SUPABASE_URL";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return "MISSING_SERVICE_ROLE_KEY";
  }
  return null;
}

export async function GET() {
  const missingEnvCode = getRequiredEnvErrorCode();
  if (missingEnvCode) {
    const diagnostics = getAuthorityRuntimeDiagnostics();
    return NextResponse.json(
      {
        code: missingEnvCode,
        message: "Supabase 필수 환경변수가 누락되었습니다.",
        source: diagnostics.source,
        env: diagnostics.env
      },
      { status: 500 }
    );
  }

  try {
    const initial = await getServerSessionSnapshot();
    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
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
        "Cache-Control": "no-store, no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    const diagnostics = getAuthorityRuntimeDiagnostics();
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "세션 이벤트 스트림을 시작하지 못했습니다.";
    return NextResponse.json(
      {
        code: "SESSION_EVENTS_STREAM_INIT_FAILED",
        message,
        source: diagnostics.source,
        env: diagnostics.env
      },
      { status: 500 }
    );
  }
}
