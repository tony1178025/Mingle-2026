function isJsonEnvelope(value: unknown): value is { ok: boolean; data?: unknown; error?: string; code?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  );
}

/**
 * Parse a fetch Response body as JSON. Supports `{ ok, data?, error?, code? }` envelopes
 * from App Router API routes; throws on empty body, invalid JSON, or ok: false.
 */
export async function parseFetchResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty API response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.slice(0, 200)}`);
  }

  if (isJsonEnvelope(parsed)) {
    if (!parsed.ok) {
      const message = parsed.error?.trim() || "요청에 실패했습니다.";
      throw new Error(parsed.code ? `[${parsed.code}] ${message}` : message);
    }
    if (parsed.data === undefined) {
      throw new Error("API response missing data.");
    }
    return parsed.data as T;
  }

  if (!response.ok) {
    const legacy = parsed as { code?: string; message?: string; error?: string };
    const message = (legacy.message ?? legacy.error ?? trimmed) || "요청에 실패했습니다.";
    throw new Error(legacy.code ? `[${legacy.code}] ${message}` : message);
  }

  return parsed as T;
}
