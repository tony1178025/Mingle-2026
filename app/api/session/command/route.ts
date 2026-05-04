import { NextRequest, NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/json-response";
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
import { publishRotationEvent } from "@/server/rotation/rotation.socket";
import type { CommandResult, MingleCommand, SessionCommandResponse } from "@/types/mingle";

export const runtime = "nodejs";

/**
 * DEPRECATED: Legacy compatibility endpoint.
 * New development must use `/api/customer/*` and `/api/admin/sessions/{id}/rotation/*`.
 * This route is intentionally kept to prevent breaking existing clients.
 */

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
    case "admin.updateAnonymousMessageSelection":
    case "admin.openTablePickWindow":
    case "admin.closeTablePickWindow":
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
    case "customer.submitAnonymousMessage":
    case "customer.submitTablePick":
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

function publishLiveEvents(command: MingleCommand, result: CommandResult) {
  const sessionId = result.snapshot.session.id;
  if (command.type === "admin.setSessionState") {
    publishRotationEvent({ type: "session:phaseChanged", sessionId, phase: command.state });
  } else if (command.type === "customer.sendHeart") {
    publishRotationEvent({
      type: "heart:sent",
      sessionId,
      senderId: command.participantId,
      recipientId: command.recipientId
    });
  } else if (command.type === "customer.updateProfile") {
    publishRotationEvent({
      type: "participant:updated",
      sessionId,
      participantId: command.participantId
    });
  } else if (command.type === "customer.submitReport") {
    const newest = result.snapshot.reports[0];
    if (newest) {
      publishRotationEvent({ type: "report:created", sessionId, reportId: newest.id });
    }
  } else if (
    command.type === "admin.activateContent" ||
    command.type === "admin.clearContent" ||
    command.type === "admin.publishAnnouncement"
  ) {
    publishRotationEvent({
      type: "content:updated",
      sessionId,
      contentKind: result.snapshot.liveContent?.kind
    });
  }
}

export async function POST(request: NextRequest) {
  const missingEnvCode = getRequiredEnvErrorCode();
  if (missingEnvCode) {
    return jsonError("Supabase 필수 환경변수가 누락되었습니다.", 500, { code: missingEnvCode });
  }

  try {
    const command = (await request.json()) as MingleCommand;
    const snapshot = await getServerSessionSnapshot();

    if (isAdminCommand(command)) {
      const adminSession = readAdminSessionFromRequest(request);
      if (!adminSession) {
        return jsonError("관리자 인증이 필요합니다.", 401, { code: "ADMIN_AUTH_REQUIRED" });
      }

      if (!hasRequiredAdminRole(adminSession, getRequiredAdminRoles(command))) {
        return jsonError("현재 관리자 역할로는 이 작업을 수행할 수 없습니다.", 403, {
          code: "ADMIN_ROLE_FORBIDDEN"
        });
      }

      if (!canAccessAdminBranch(adminSession, snapshot.session.branchId)) {
        return jsonError("현재 브랜치 세션에 접근할 권한이 없습니다.", 403, {
          code: "ADMIN_BRANCH_FORBIDDEN"
        });
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
        const response = jsonError("유효한 참가자 세션이 필요합니다.", 401, {
          code: "CUSTOMER_SESSION_REQUIRED"
        });
        clearCustomerSession(response);
        return response;
      }

      const authorityValidation = await validateCustomerSessionAgainstDbAuthority(
        customerSession
      );
      if (!authorityValidation.valid) {
        const response = jsonError("유효한 참가자 세션이 필요합니다.", 401, {
          code: "CUSTOMER_SESSION_INVALID"
        });
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
          const response = jsonError("유효한 참가자 세션이 필요합니다.", 401, {
            code: "CUSTOMER_SESSION_MISMATCH"
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
    const response = jsonOk(payload);
    publishLiveEvents(command, result);
    attachCustomerSession(response, command, result);
    return response;
  } catch (error) {
    console.error("[api/session/command]", error);
    const message =
      error instanceof Error ? error.message : "명령 처리에 실패했습니다.";
    const status =
      error instanceof Error && error.name === "BlockedParticipantError" ? 403 : 400;
    return jsonError(message, status, { code: "SESSION_COMMAND_FAILED" });
  }
}
