export function startSessionRealtime(
  sync: () => Promise<void> | void,
  onFallback: () => void
) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    onFallback();
    return () => undefined;
  }

  const source = new EventSource("/api/session/events");
  source.onmessage = () => {
    void sync();
  };
  source.onerror = () => {
    source.close();
    onFallback();
  };

  return () => source.close();
}
