import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieValue,
  hasAdminPasswordConfigured,
  resolveAdminSessionByCredentials
} from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import type { AdminSessionRecord } from "@/types/mingle";

export const runtime = "nodejs";

function buildCookieResponse(payload: { adminSession: AdminSessionRecord }) {
  const response = jsonOk(payload);
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: getAdminSessionCookieValue(payload.adminSession),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
  return response;
}

export async function POST(request: NextRequest) {
  if (!hasAdminPasswordConfigured()) {
    return jsonError("관리자 사용자 스토어가 아직 준비되지 않았습니다.", 503, {
      code: "ADMIN_STORE_NOT_CONFIGURED"
    });
  }

  const body = (await request.json()) as { login?: string; password?: string };
  // Admin login uses an explicit identifier contract:
  // - email input resolves against admin_users.email
  // - non-email input resolves against admin_users.id
  // Passwords are always verified against password_hash; bootstrap env passwords only help
  // first-login recovery for seeded accounts inside the store layer.
  if (!body.login || !body.password) {
    return jsonError("관리자 로그인 ID와 비밀번호를 모두 입력해 주세요.", 401, {
      code: "ADMIN_LOGIN_INVALID"
    });
  }

  const adminSession = await resolveAdminSessionByCredentials(body.login, body.password);
  if (!adminSession) {
    return jsonError("관리자 로그인 정보가 올바르지 않습니다.", 401, { code: "ADMIN_LOGIN_FAILED" });
  }

  return buildCookieResponse({ adminSession });
}

export async function DELETE() {
  const response = jsonOk({});
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
