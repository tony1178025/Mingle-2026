"use client";

/**
 * 밍글 / Mingle — Splash Screen (Corrected)
 *
 * 빠르고 에너지 있는 진입. 과한 연출 없이.
 * 파티 전 기대감. 향수 광고 아님.
 */

import { useEffect, useState } from "react";
import { MingleIcon } from "./MingleIcon";

interface SplashScreenProps {
  minDisplayMs?: number;
  onComplete?: () => void;
}

export function SplashScreen({ minDisplayMs = 1200, onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const fadeTimer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 300);
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
        transition: "opacity 300ms cubic-bezier(0.2, 0.9, 0.3, 1)",
      }}
      role="status"
      aria-label="밍글 로딩 중"
    >
      <div className="splash-icon">
        <MingleIcon variant="full" size={80} />
      </div>
      <div className="splash-lockup">
        <span className="splash-brand-kr">밍글</span>
        <span className="splash-brand-en">Mingle</span>
      </div>
    </div>
  );
}
