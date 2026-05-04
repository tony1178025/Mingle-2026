import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  buildCustomerSession,
  clearCustomerSession,
  issueCustomerSession
} from "@/lib/customer-session";
import { resolveCustomerEntry } from "@/lib/services/customer-entry-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get("branchId") ?? "";
    const tableId = Number(request.nextUrl.searchParams.get("tableId") ?? "0");
    const checkinCode = request.nextUrl.searchParams.get("code")?.trim() ?? undefined;
    const result = await resolveCustomerEntry({ branchId, tableId, checkinCode });
    const response = jsonOk(result);
    const resolution = result.checkinResolution;

    if (
      resolution &&
      result.participantId &&
      (resolution.flowState === "SUCCESS" || resolution.flowState === "RE_ENTRY") &&
      result.snapshot
    ) {
      issueCustomerSession(
        response,
        buildCustomerSession({
          participantId: result.participantId,
          reservationId: resolution.reservationId,
          sessionId: resolution.sessionId,
          sessionVersion: result.snapshot.session.customerSessionVersion
        })
      );
    } else if (checkinCode) {
      clearCustomerSession(response);
    }

    return response;
  } catch (error) {
    console.error("[api/customer/entry]", error);
    const message = error instanceof Error ? error.message : "입장 정보를 불러오지 못했습니다.";
    return jsonError(message, 400, { code: "CUSTOMER_ENTRY_FAILED" });
  }
}
