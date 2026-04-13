"use client";

import { useEffect, useEffectEvent } from "react";
import { startSessionPolling } from "@/lib/realtime/polling";
import { useMingleStore } from "@/stores/useMingleStore";

export function AppBootstrap() {
  const hydrate = useMingleStore((state) => state.hydrate);
  const syncFromRepository = useMingleStore((state) => state.syncFromRepository);

  const handleSync = useEffectEvent(() => {
    void syncFromRepository();
  });

  const registerPwaServiceWorker = useEffectEvent(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => registration.update().catch(() => undefined))
      .catch((error) => {
        console.warn("[mingle:pwa] service worker registration failed", error);
      });
  });

  useEffect(() => {
    void hydrate();
    registerPwaServiceWorker();
    const stop = startSessionPolling(async () => {
      handleSync();
    });

    return stop;
  }, [handleSync, hydrate, registerPwaServiceWorker]);

  return null;
}
