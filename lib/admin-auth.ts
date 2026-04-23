import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getAdminUserStore } from "@/lib/admin-user-store";
import { logInvalidSessionAttempt } from "@/lib/authority-monitoring";
import type { AdminRole, AdminSessionRecord, MingleCommand } from "@/types/mingle";

export const ADMIN_SESSION_COOKIE = "mingle_admin_session";

type PersistedAdminSession = AdminSessionRecord & {
  issuedAt: string;
  expiresAt: string;
};

const ADMIN_SESSION_TTL_HOURS = 12;
const ADMIN_ROLE_PRIORITY: Record<AdminRole, number> = {
  HQ_ADMIN: 3,
  BRANCH_ADMIN: 2,
  STAFF: 1
};

function getAdminSessionSecret() {
  const secret = process.env.MINGLE_ADMIN_SESSION_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "mingle-admin-session-dev-only";
  }

  throw new Error("MINGLE_ADMIN_SESSION_SECRET가 설정되지 않았습니다.");
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function serializeAdminSession(session: PersistedAdminSession) {
  const payload = encodeBase64Url(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function parseAdminSession(token: string | undefined): PersistedAdminSession | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  if (!safeEqual(signature, signPayload(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as PersistedAdminSession;
    if (
      !parsed.adminUserId ||
      !parsed.role ||
      !(parsed.role in ADMIN_ROLE_PRIORITY) ||
      typeof parsed.branchId === "undefined" ||
      !parsed.issuedAt ||
      !parsed.expiresAt
    ) {
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function hasAdminPasswordConfigured() {
  return getAdminUserStore()?.isConfigured() ?? false;
}

export async function resolveAdminSessionByCredentials(login: string, password: string) {
  const store = getAdminUserStore();
  if (!store) {
    return null;
  }

  return store.findAdminSessionByCredentials(login, password);
}

export function getAdminSessionCookieValue(session: AdminSessionRecord) {
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  return serializeAdminSession({
    ...session,
    issuedAt,
    expiresAt
  });
}

export function readAdminSessionValue(value: string | null | undefined): AdminSessionRecord | null {
  const session = parseAdminSession(value ?? undefined);
  if (!session) {
    return null;
  }

  return {
    adminUserId: session.adminUserId,
    role: session.role,
    branchId: session.branchId
  };
}

export function hasRequiredAdminRole(
  session: AdminSessionRecord | null,
  requiredRoles: readonly AdminRole[] = []
) {
  if (!session) {
    return false;
  }

  if (!requiredRoles.length) {
    return true;
  }

  return requiredRoles.some(
    (requiredRole) => ADMIN_ROLE_PRIORITY[session.role] >= ADMIN_ROLE_PRIORITY[requiredRole]
  );
}

export function canAccessAdminBranch(session: AdminSessionRecord | null, branchId: string | null) {
  if (!session) {
    return false;
  }

  if (session.role === "HQ_ADMIN") {
    return true;
  }

  if (!branchId) {
    return true;
  }

  return session.branchId === branchId;
}

export async function isAuthorizedAdminSession(requiredRoles: readonly AdminRole[] = []) {
  const cookieStore = await cookies();
  const session = readAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  return hasRequiredAdminRole(session, requiredRoles);
}

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return readAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export function readAdminSessionFromRequest(request: NextRequest) {
  const session = readAdminSessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) {
    logInvalidSessionAttempt({
      actor: "admin",
      reason: "missing-or-invalid-admin-session"
    });
  }

  return session;
}

export function isAuthorizedAdminRequest(
  request: NextRequest,
  requiredRoles: readonly AdminRole[] = []
) {
  return hasRequiredAdminRole(readAdminSessionFromRequest(request), requiredRoles);
}

export function isAdminCommand(command: MingleCommand) {
  return command.type.startsWith("admin.");
}
