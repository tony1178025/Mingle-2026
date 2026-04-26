import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, readAdminSessionValue } from "@/lib/admin-auth";
import {
  clearCustomerSession,
  isCustomerSessionCompatibleWithSnapshot,
  readCustomerSession,
  resolveCustomerSessionParticipantId,
  validateCustomerSessionAgainstDbAuthority
} from "@/lib/customer-session";
import { getAuthorityRuntimeDiagnostics } from "@/lib/repositories/authority-backend";
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
    const response = NextResponse.json({ data: responseSnapshot, currentParticipantId });
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
    const diagnostics = getAuthorityRuntimeDiagnostics();
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "세션 스냅샷을 불러오지 못했습니다.";
    return NextResponse.json(
      {
        code: "SESSION_SNAPSHOT_LOAD_FAILED",
        message,
        source: diagnostics.source,
        env: diagnostics.env
      },
      { status: 500 }
    );
  }
}
