/**
 * Presigned profile upload (delegates to ../profile/route).
 *
 * Stored object key: `profile/{participantId|temp}/{uuid}.(webp|jpg)` — immutable; new uploads use new keys.
 * Object metadata: `Cache-Control: public, max-age=31536000, immutable` (see profile route). Align CDN edge caching similarly.
 * Public URL base: R2 uses `R2_PUBLIC_BASE_URL` when set; otherwise configured `publicBaseUrl`.
 */
export { POST } from "../profile/route";
