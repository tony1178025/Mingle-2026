import type {
  GrantHeartsRequest,
  GrantHeartsResponse,
  MingleCommand,
  ReservationSessionContextRequest,
  SessionCommandResponse,
  SessionSnapshotResponse
} from "@/types/mingle";
import type { MingleRepository } from "@/lib/repositories";
import { parseFetchResponseJson } from "@/lib/api/parse-fetch-response";

async function parseJson<T>(response: Response): Promise<T> {
  return parseFetchResponseJson<T>(response);
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

      return parseJson<SessionCommandResponse>(response);
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

      return parseJson<SessionCommandResponse>(response);
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
