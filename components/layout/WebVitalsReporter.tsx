"use client";

import { useEffectEvent } from "react";
import { useReportWebVitals } from "next/web-vitals";
import {
  classifyWebVital,
  formatWebVitalValue,
  getWebVitalHint,
  type WebVitalName
} from "@/lib/performance/budgets";

const TRACKED_WEB_VITALS = new Set<WebVitalName>(["LCP", "CLS", "INP", "FCP", "TTFB"]);

export function WebVitalsReporter() {
  const handleMetric = useEffectEvent(
    (metric: { id: string; name: string; value: number; rating?: string; delta?: number }) => {
      if (!TRACKED_WEB_VITALS.has(metric.name as WebVitalName)) {
        return;
      }

      const name = metric.name as WebVitalName;
      const rating = classifyWebVital(name, metric.value);
      const payload = {
        id: metric.id,
        name,
        rating,
        value: metric.value,
        formattedValue: formatWebVitalValue(name, metric.value),
        hint: getWebVitalHint(name, rating),
        delta: metric.delta ?? 0
      };

      if (process.env.NODE_ENV !== "production") {
        console.info("[mingle:web-vitals]", payload);
      }

      window.dispatchEvent(new CustomEvent("mingle:web-vitals", { detail: payload }));
    }
  );

  useReportWebVitals(handleMetric);

  return null;
}
