/**
 * Read JSON from a NextResponse in route tests. Supports `{ ok, data }` envelopes
 * returned by standardized API routes.
 */
export async function readRouteResponseData<T>(response: Response): Promise<T> {
  const body = (await response.json()) as unknown;
  if (
    typeof body === "object" &&
    body !== null &&
    "ok" in body &&
    (body as { ok: unknown }).ok === true &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}
