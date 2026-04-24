import type {
  CommandResult,
  GrantHeartsRequest,
  GrantHeartsResponse,
  MingleCommand,
  ReservationSessionContextRequest,
  SessionSnapshotResponse
} from "@/types/mingle";
import type { MingleRepository } from "@/lib/repositories";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const raw = await response.text();
    let parsed: { code?: string; message?: string; error?: string } | null = null;
    try {
      parsed = JSON.parse(raw) as { code?: string; message?: string; error?: string };
    } catch {}
    const message = parsed?.message ?? parsed?.error ?? raw || "요청에 실패했습니다.";
    throw new Error(parsed?.code ? `[${parsed.code}] ${message}` : message);
  }

  return (await response.json()) as T;
}

export function createHttpRepository(): MingleRepository {
  return {
    async getSessionSnapshot() {
      const response = await fetch("/api/session/current", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      return parseJson<SessionSnapshotResponse>(response);
    },

    async getReservationSessionContext(request: ReservationSessionContextRequest) {
      const response = await fetch("/api/reservations/session-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(request)
      });

      return parseJson<CommandResult>(response);
    },

    async executeCommand(command: MingleCommand) {
      const response = await fetch("/api/session/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(command)
      });

      return parseJson<CommandResult>(response);
    },

    async grantHearts(request: GrantHeartsRequest) {
      const response = await fetch("/api/admin/grant-hearts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(request)
      });

      return parseJson<GrantHeartsResponse>(response);
    }
  };
}
