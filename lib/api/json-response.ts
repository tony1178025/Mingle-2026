import { NextResponse } from "next/server";

export type ApiSuccessEnvelope<T> = { ok: true; data: T };
export type ApiErrorEnvelope = { ok: false; error: string; code?: string };

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data } satisfies ApiSuccessEnvelope<T>, init);
}

export function jsonError(
  error: string,
  status: number,
  extras?: { code?: string }
) {
  const body: ApiErrorEnvelope = { ok: false, error, ...(extras?.code ? { code: extras.code } : {}) };
  return NextResponse.json(body, { status });
}

/**
 * Parse fetch() responses that use the standard { ok, data?, error? } envelope.
 * Throws on network errors, empty bodies, invalid JSON, or ok: false.
 */
export async function readApiJsonEnvelope<T>(response: Response, context: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Empty response from ${context}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON from ${context}: ${text.slice(0, 200)}`);
  }
  if (typeof parsed !== "object" || parsed === null || !("ok" in parsed)) {
    throw new Error(`Unexpected response shape from ${context}`);
  }
  const envelope = parsed as { ok: boolean; data?: T; error?: string; code?: string };
  if (!envelope.ok) {
    const message = envelope.error?.trim() || "요청에 실패했습니다.";
    throw new Error(envelope.code ? `[${envelope.code}] ${message}` : message);
  }
  return envelope.data as T;
}
