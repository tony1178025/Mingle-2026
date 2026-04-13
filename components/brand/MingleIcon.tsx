/**
 * 밍글 / Mingle — Brand Icon / Symbol
 * Direction: Midnight Connection
 *
 * Concept: "The Intersection of Two Ethereal Energies"
 * Two abstract organic forms overlapping — refined monogram
 * with smoked-glass + subtle interior glow materiality.
 *
 * Usage states: app icon, splash icon, compact UI mark, monochrome
 */

import type { CSSProperties } from "react";

type IconVariant = "full" | "compact" | "mono-dark" | "mono-light";

interface MingleIconProps {
  variant?: IconVariant;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function MingleIcon({
  variant = "full",
  size = 64,
  className,
  style,
}: MingleIconProps) {
  if (variant === "mono-dark") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="밍글 아이콘"
      >
        <rect width="512" height="512" rx="128" fill="transparent" />
        <ellipse cx="220" cy="256" rx="110" ry="130" fill="none" stroke="#F2ECF8" strokeWidth="3.5" opacity="0.7" />
        <ellipse cx="292" cy="256" rx="110" ry="130" fill="none" stroke="#F2ECF8" strokeWidth="3.5" opacity="0.7" />
        <path
          d="M256 152c-28 30-44 66-44 104s16 74 44 104c28-30 44-66 44-104s-16-74-44-104z"
          fill="#F2ECF8"
          opacity="0.15"
        />
      </svg>
    );
  }

  if (variant === "mono-light") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="밍글 아이콘"
      >
        <rect width="512" height="512" rx="128" fill="transparent" />
        <ellipse cx="220" cy="256" rx="110" ry="130" fill="none" stroke="#110D1A" strokeWidth="3.5" opacity="0.6" />
        <ellipse cx="292" cy="256" rx="110" ry="130" fill="none" stroke="#110D1A" strokeWidth="3.5" opacity="0.6" />
        <path
          d="M256 152c-28 30-44 66-44 104s16 74 44 104c28-30 44-66 44-104s-16-74-44-104z"
          fill="#110D1A"
          opacity="0.1"
        />
      </svg>
    );
  }

  if (variant === "compact") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-label="밍글 아이콘"
      >
        <defs>
          <radialGradient id="compactGlow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#D48197" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1A0B2E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="256" cy="256" r="200" fill="url(#compactGlow)" />
        <ellipse cx="224" cy="256" rx="88" ry="108" fill="none" stroke="#D48197" strokeWidth="2.5" opacity="0.65" />
        <ellipse cx="288" cy="256" rx="88" ry="108" fill="none" stroke="#D48197" strokeWidth="2.5" opacity="0.65" />
        <path
          d="M256 170c-22 24-35 54-35 86s13 62 35 86c22-24 35-54 35-86s-13-62-35-86z"
          fill="url(#compactInner)"
          opacity="0.35"
        />
        <defs>
          <linearGradient id="compactInner" x1="221" y1="170" x2="291" y2="342">
            <stop offset="0%" stopColor="#D48197" />
            <stop offset="100%" stopColor="#7A55D4" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Full variant — premium app icon with smoked-glass depth
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="밍글 앱 아이콘"
    >
      <defs>
        {/* Background gradient — velvet midnight */}
        <radialGradient id="iconBg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#221340" />
          <stop offset="100%" stopColor="#0D0618" />
        </radialGradient>

        {/* Atmospheric haze */}
        <radialGradient id="iconHaze" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#7A55D4" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#D48197" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#0D0618" stopOpacity="0" />
        </radialGradient>

        {/* Interior glow for intersection */}
        <radialGradient id="iconInnerGlow" cx="50%" cy="45%" r="35%">
          <stop offset="0%" stopColor="#D48197" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#7A55D4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0D0618" stopOpacity="0" />
        </radialGradient>

        {/* Left form gradient */}
        <linearGradient id="formLeft" x1="130" y1="140" x2="260" y2="380">
          <stop offset="0%" stopColor="#D48197" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7A55D4" stopOpacity="0.25" />
        </linearGradient>

        {/* Right form gradient */}
        <linearGradient id="formRight" x1="252" y1="140" x2="382" y2="380">
          <stop offset="0%" stopColor="#7A55D4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D48197" stopOpacity="0.55" />
        </linearGradient>

        {/* Intersection fill */}
        <linearGradient id="intersection" x1="220" y1="160" x2="292" y2="360">
          <stop offset="0%" stopColor="#D48197" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#B8637A" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7A55D4" stopOpacity="0.35" />
        </linearGradient>

        {/* Gold micro-accent */}
        <radialGradient id="goldAccent" cx="62%" cy="28%" r="12%">
          <stop offset="0%" stopColor="#C5A059" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C5A059" stopOpacity="0" />
        </radialGradient>

        {/* Soft outer glow */}
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="innerSoftness">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="512" height="512" rx="128" fill="url(#iconBg)" />

      {/* Atmospheric haze layer */}
      <rect width="512" height="512" rx="128" fill="url(#iconHaze)" />

      {/* Soft inner glow */}
      <circle cx="256" cy="248" r="140" fill="url(#iconInnerGlow)" />

      {/* Left ethereal form */}
      <ellipse
        cx="218"
        cy="258"
        rx="98"
        ry="120"
        fill="url(#formLeft)"
        filter="url(#softGlow)"
      />

      {/* Right ethereal form */}
      <ellipse
        cx="294"
        cy="258"
        rx="98"
        ry="120"
        fill="url(#formRight)"
        filter="url(#softGlow)"
      />

      {/* Intersection — the meeting point */}
      <path
        d="M256 160c-30 28-48 64-48 98s18 70 48 98c30-28 48-64 48-98s-18-70-48-98z"
        fill="url(#intersection)"
      />

      {/* Subtle edge strokes */}
      <ellipse
        cx="218"
        cy="258"
        rx="98"
        ry="120"
        fill="none"
        stroke="rgba(212, 129, 151, 0.18)"
        strokeWidth="1.5"
      />
      <ellipse
        cx="294"
        cy="258"
        rx="98"
        ry="120"
        fill="none"
        stroke="rgba(122, 85, 212, 0.18)"
        strokeWidth="1.5"
      />

      {/* Gold micro-accent at top intersection */}
      <circle cx="310" cy="168" r="28" fill="url(#goldAccent)" />

      {/* Top edge highlight — smoked glass effect */}
      <rect
        x="56"
        y="56"
        width="400"
        height="400"
        rx="102"
        fill="none"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth="1"
      />
    </svg>
  );
}
