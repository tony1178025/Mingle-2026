"use client";

import { useEffect, useEffectEvent } from "react";
import { startSessionRealtime } from "@/lib/realtime/channel";
import { startSessionPolling } from "@/lib/realtime/polling";
import { useMingleStore } from "@/stores/useMingleStore";

export function AppBootstrap() {
  const hydrate = useMingleStore((state) => state.hydrated);
  const runHydrate = useMingleStore((state) => state.hydrate);
  const syncFromRepository = useMingleStore((state) => state.syncFromRepository);

  const handleSync = useEffectEvent(() => {
    void syncFromRepository();
  });

  const disableLegacyServiceWorkers = useEffectEvent(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
  });

  useEffect(() => {
    if (!hydrate) {
      void runHydrate();
    }

    disableLegacyServiceWorkers();

    let stopPolling: (() => void) | null = null;
    const stopRealtime = startSessionRealtime(handleSync, () => {
      if (!stopPolling) {
        stopPolling = startSessionPolling(handleSync, 2000);
      }
    });

    return () => {
      stopRealtime();
      stopPolling?.();
    };
  }, [disableLegacyServiceWorkers, handleSync, hydrate, runHydrate]);

  return null;
}
