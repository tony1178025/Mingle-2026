import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, readAdminSessionValue } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  getServerSessionSnapshot,
  sanitizeSnapshotForAdmin,
  sanitizeSnapshotForCustomer,
  subscribeToSessionSnapshots
} from "@/lib/repositories/server-repository";
import type { SessionSyncEvent } from "@/types/mingle";

export const runtime = "nodejs";

function encodeEvent(event: SessionSyncEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function getRequiredEnvErrorCode() {
  const requiresDbAuthority = process.env.USE_DB_AUTHORITY === "true";
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

export async function GET(request: NextRequest) {
  const missingEnvCode = getRequiredEnvErrorCode();
  if (missingEnvCode) {
    return jsonError("Supabase 필수 환경변수가 누락되었습니다.", 500, { code: missingEnvCode });
  }

  const acceptHeader = request.headers.get("accept") ?? "";
  const wantsJsonHandshake = acceptHeader.includes("application/json");

  try {
    const initial = await getServerSessionSnapshot();
    const adminSession = readAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    const sanitize = adminSession ? sanitizeSnapshotForAdmin : sanitizeSnapshotForCustomer;

    if (wantsJsonHandshake) {
      const event: SessionSyncEvent = { type: "snapshot", snapshot: sanitize(initial) };
      return jsonOk(
        {
          mode: "handshake" as const,
          event
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        }
      );
    }

    const encoder = new TextEncoder();
    let unsubscribe: (() => void) | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            encodeEvent({ type: "snapshot", snapshot: sanitize(initial) })
          )
        );

        unsubscribe = subscribeToSessionSnapshots((snapshot) => {
          controller.enqueue(
            encoder.encode(
              encodeEvent({ type: "snapshot", snapshot: sanitize(snapshot) })
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
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "세션 이벤트 스트림을 시작하지 못했습니다.";
    return jsonError(message, 500, { code: "SESSION_EVENTS_STREAM_INIT_FAILED" });
  }
}
