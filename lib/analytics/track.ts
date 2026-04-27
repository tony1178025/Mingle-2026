export type MgEvent =
  | "ENTRY"
  | "ONBOARD"
  | "HEART"
  | "MATCH"
  | "TABLE"
  | "CONTENT"
  | "EXIT";

export function track(event: MgEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("mg:track", {
      detail: { event, payload, at: Date.now() }
    })
  );
}
