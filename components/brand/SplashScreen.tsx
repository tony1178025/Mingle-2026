"use client";

/**
 * 밍글 / Mingle — Splash Screen
 * Direction: Midnight Connection
 *
 * Premium midnight reveal:
 * - Centered logo lockup
 * - Premium icon presence
 * - Soft atmospheric diffusion
 * - Velvet-dark background
 * - Quiet pulse emphasis
 * - No noisy animation
 */

import { useEffect, useState } from "react";
import { MingleIcon } from "./MingleIcon";

interface SplashScreenProps {
  /** Minimum display time in ms */
  minDisplayMs?: number;
  /** Called when splash finishes */
  onComplete?: () => void;
}

export function SplashScreen({ minDisplayMs = 1800, onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const fadeTimer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 500);
      return () => clearTimeout(fadeTimer);
    }, minDisplayMs);
    return () => clearTimeout(timer);
  }, [minDisplayMs, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="splash-screen"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      role="status"
      aria-label="밍글 로딩 중"
    >
      {/* Quiet atmospheric pulse */}
      <div className="splash-pulse" />

      {/* Premium icon */}
      <div className="splash-icon">
        <MingleIcon variant="full" size={96} />
      </div>

      {/* Brand lockup */}
      <div className="splash-lockup">
        <span className="splash-brand-kr">밍글</span>
        <span className="splash-brand-en">Mingle</span>
      </div>
    </div>
  );
}
