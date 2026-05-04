import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { qrUrls, testBranch, testTables } from "../fixtures/test-data";

export async function fetchCustomerEntry(
  request: APIRequestContext,
  tableNumber = testTables[0]?.id ?? 1
) {
  const response = await request.get(
    `/api/customer/entry?branchId=${testBranch.id}&tableId=${tableNumber}`
  );
  expect(response.status(), "customer entry API should be reachable").toBe(200);
  return response;
}

export function getQrUrl(kind: "validRound1" | "revoked" | "regenerated" = "validRound1") {
  if (kind === "revoked") return qrUrls.revoked;
  if (kind === "regenerated") return qrUrls.regenerated;
  return qrUrls.valid;
}

export function buildCustomerQrUrl(url: string) {
  return url;
}

export function buildQrUrl(baseUrl: string, code?: string) {
  if (!code) return baseUrl;
  const delimiter = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${delimiter}code=${encodeURIComponent(code)}`;
}

export async function getSessionStatePayload(request: APIRequestContext) {
  const response = await request.get("/api/customer/session-state");
  expect(response.status()).toBe(200);
  const text = await response.text();
  const parsed = JSON.parse(text) as { ok?: boolean; data?: Record<string, unknown> };
  if (parsed && typeof parsed === "object" && "ok" in parsed && parsed.ok === true && "data" in parsed) {
    return parsed.data ?? {};
  }
  return parsed as Record<string, unknown>;
}

