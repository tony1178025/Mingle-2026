import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  canAccessAdminBranch,
  hasRequiredAdminRole,
  isAdminCommand,
  readAdminSessionFromRequest,
  readAdminSessionValue
} from "@/lib/admin-auth";
import {
  buildCustomerSession,
  clearCustomerSession,
  issueCustomerSession,
  validateCustomerSession,
  validateCustomerSessionAgainstDbAuthority
} from "@/lib/customer-session";
import { logInvalidSessionAttempt } from "@/lib/authority-monitoring";
import {
  executeServerCommand,
  getServerSessionSnapshot,
  sanitizeSnapshotForAdmin,
  sanitizeSnapshotForCustomer
} from "@/lib/repositories/server-repository";
import type { CommandResult, MingleCommand, SessionCommandResponse } from "@/types/mingle";

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

function isCustomerMutationCommand(command: MingleCommand) {
  return command.type !== "customer.verifyCheckin";
}

function getRequiredAdminRoles(command: MingleCommand) {
  switch (command.type) {
    case "admin.resolveReport":
      return ["STAFF"] as const;
    case "admin.setSessionState":
    case "admin.triggerReveal":
    case "admin.toggleReveal":
    case "admin.generateRotationPreview":
    case "admin.applyRotation":
    case "admin.activateContent":
    case "admin.clearContent":
    case "admin.publishAnnouncement":
    case "admin.setBlacklistStatus":
      return ["BRANCH_ADMIN"] as const;
    default:
      return [] as const;
  }
}

function validateCustomerCommandRequest(
  request: NextRequest,
  command: MingleCommand,
  snapshot: Awaited<ReturnType<typeof getServerSessionSnapshot>>
) {
  switch (command.type) {
    case "customer.completeProfile":
      return validateCustomerSession(request, {
        participantId: command.resolution.participantId ?? undefined,
        reservationId: command.resolution.reservationId,
        sessionId: command.resolution.sessionId,
        sessionVersion: snapshot.session.customerSessionVersion
      });
    case "customer.updateProfile":
    case "customer.setRound2Attendance":
    case "customer.sendHeart":
    case "customer.submitReport":
    case "customer.respondContent":
    case "customer.ackRotation":
    case "customer.submitContactExchangeConsent":
      return validateCustomerSession(request, {
        participantId: command.participantId,
        sessionId: snapshot.session.id,
        sessionVersion: snapshot.session.customerSessionVersion
      });
    default:
      return null;
  }
}

function attachCustomerSession(
  response: NextResponse,
  command: MingleCommand,
  result: CommandResult
) {
  if (command.type === "customer.verifyCheckin") {
    const resolution = result.checkinResolution;
    if (
      resolution &&
      result.participantId &&
      (resolution.flowState === "SUCCESS" || resolution.flowState === "RE_ENTRY")
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
      return;
    }

    clearCustomerSession(response);
    return;
  }

  if (command.type === "customer.completeProfile" && result.participantId) {
    issueCustomerSession(
      response,
      buildCustomerSession({
        participantId: result.participantId,
        reservationId: command.resolution.reservationId,
        sessionId: command.resolution.sessionId,
        sessionVersion: result.snapshot.session.customerSessionVersion
      })
    );
  }
}

export async function POST(request: NextRequest) {
  const missingEnvCode = getRequiredEnvErrorCode();
  if (missingEnvCode) {
    return NextResponse.json(
      {
        code: missingEnvCode,
        message: "Supabase 필수 환경변수가 누락되었습니다."
      },
      { status: 500 }
    );
  }

  try {
    const command = (await request.json()) as MingleCommand;
    const snapshot = await getServerSessionSnapshot();

    if (isAdminCommand(command)) {
      const adminSession = readAdminSessionFromRequest(request);
      if (!adminSession) {
        return new NextResponse("관리자 인증이 필요합니다.", { status: 401 });
      }

      if (!hasRequiredAdminRole(adminSession, getRequiredAdminRoles(command))) {
        return new NextResponse("현재 관리자 역할로는 이 작업을 수행할 수 없습니다.", {
          status: 403
        });
      }

      if (!canAccessAdminBranch(adminSession, snapshot.session.branchId)) {
        return new NextResponse("현재 브랜치 세션에 접근할 권한이 없습니다.", { status: 403 });
      }
    }

    if (isCustomerMutationCommand(command)) {
      const customerSession = validateCustomerCommandRequest(request, command, snapshot);
      if (!customerSession) {
        logInvalidSessionAttempt({
          actor: "customer",
          commandType: command.type,
          reason: "missing-or-invalid-signed-session"
        });
        const response = new NextResponse("유효한 참가자 세션이 필요합니다.", { status: 401 });
        clearCustomerSession(response);
        return response;
      }

      const authorityValidation = await validateCustomerSessionAgainstDbAuthority(
        customerSession
      );
      if (!authorityValidation.valid) {
        const response = new NextResponse("유효한 참가자 세션이 필요합니다.", { status: 401 });
        clearCustomerSession(response);
        return response;
      }

      if (command.type !== "customer.completeProfile") {
        const participant = snapshot.participants.find(
          (item) => item.id === customerSession.participantId
        );
        if (!participant || participant.reservationId !== customerSession.reservationId) {
          logInvalidSessionAttempt({
            actor: "customer",
            commandType: command.type,
            participantId: customerSession.participantId,
            reservationId: customerSession.reservationId,
            reason: "snapshot-participant-mismatch"
          });
          const response = new NextResponse("유효한 참가자 세션이 필요합니다.", {
            status: 401
          });
          clearCustomerSession(response);
          return response;
        }
      }
    }

    const result = await executeServerCommand(command);
    const responseSnapshot = isAdminCommand(command) ||
      Boolean(readAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))
      ? sanitizeSnapshotForAdmin(result.snapshot)
      : sanitizeSnapshotForCustomer(result.snapshot);
    const payload: SessionCommandResponse = {
      ...result,
      snapshot: responseSnapshot
    };
    const response = NextResponse.json(payload);
    attachCustomerSession(response, command, result);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "명령 처리에 실패했습니다.";
    return new NextResponse(message, {
      status: error instanceof Error && error.name === "BlockedParticipantError" ? 403 : 400
    });
  }
}
