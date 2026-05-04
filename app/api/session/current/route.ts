import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, readAdminSessionValue } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  clearCustomerSession,
  isCustomerSessionCompatibleWithSnapshot,
  readCustomerSession,
  resolveCustomerSessionParticipantId,
  validateCustomerSessionAgainstDbAuthority
} from "@/lib/customer-session";
import {
  getServerSessionSnapshot,
  sanitizeSnapshotForAdmin,
  sanitizeSnapshotForCustomer
} from "@/lib/repositories/server-repository";

export const runtime = "nodejs";

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

  try {
    const snapshot = await getServerSessionSnapshot();
    const adminSession = readAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
    const responseSnapshot = adminSession
      ? sanitizeSnapshotForAdmin(snapshot)
      : sanitizeSnapshotForCustomer(snapshot);
    const customerSession = readCustomerSession(request);
    const authorityValidation = customerSession
      ? await validateCustomerSessionAgainstDbAuthority(customerSession)
      : { valid: true as const };
    const currentParticipantId = authorityValidation.valid
      ? resolveCustomerSessionParticipantId(snapshot, customerSession)
      : null;
    const response = jsonOk({ data: responseSnapshot, currentParticipantId });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    if (
      customerSession &&
      (!authorityValidation.valid ||
        !isCustomerSessionCompatibleWithSnapshot(snapshot, customerSession))
    ) {
      clearCustomerSession(response);
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "세션 스냅샷을 불러오지 못했습니다.";
    return jsonError(message, 500, { code: "SESSION_SNAPSHOT_LOAD_FAILED" });
  }
}
