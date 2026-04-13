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

  useEffect(() => {
    void hydrate();
    const stop = startSessionPolling(async () => {
      handleSync();
    });

    return stop;
  }, [handleSync, hydrate]);

  return null;
}
