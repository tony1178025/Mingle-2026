"use client";

import { cn } from "@/lib/mingle";
import type { ParticipantGender } from "@/types/mingle";

/**
 * Neutral default avatar palette (similar to common SNS defaults).
 * M: cool gray, F: soft neutral rose.
 */
const AVATAR_COLORS: Record<ParticipantGender, { bg: string; fg: string; ring: string }> = {
  M: { bg: "#E2E5EA", fg: "#9AA3AD", ring: "rgba(148,163,184,0.4)" },
  F: { bg: "#F0E2E8", fg: "#B59AA8", ring: "rgba(181,154,168,0.38)" }
};

export function Avatar({
  gender,
  size = 48,
  className
}: {
  gender: ParticipantGender;
  size?: number;
  className?: string;
}) {
  const palette = AVATAR_COLORS[gender];

  return (
    <div
      className={cn("avatar-shell", className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: palette.bg,
        boxShadow: `0 0 0 1px ${palette.ring} inset`
      }}
    >
      <svg viewBox="0 0 40 40" width={size * 0.6} height={size * 0.6} aria-hidden="true">
        <circle cx="20" cy="14" r="7" fill={palette.fg} opacity="0.85" />
        <ellipse cx="20" cy="35" rx="13" ry="11" fill={palette.fg} opacity="0.85" />
      </svg>
    </div>
  );
}

export function UserPhoto({
  photoUrl,
  gender,
  size = 48,
  className
}: {
  photoUrl: string | null;
  gender: ParticipantGender;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={cn("avatar-photo", className)}
        loading="lazy"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32)
        }}
      />
    );
  }

  return <Avatar gender={gender} size={size} className={className} />;
}
