/**
 * 밍글 / Mingle — Brand Logo System
 * Direction: Midnight Connection
 *
 * Lockup variants:
 *   - full:    밍글 + Mingle stacked
 *   - compact: 밍글 only (horizontal)
 *   - splash:  Large centered with icon
 *   - english: Mingle only (supporting)
 *   - mono:    Single-color version
 */

import type { CSSProperties } from "react";

type LogoVariant = "full" | "compact" | "splash" | "english";
type LogoTheme = "dark" | "light" | "mono-dark" | "mono-light";

interface MingleLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: CSSProperties;
}

const SIZES = {
  sm: { kr: "1.3rem", en: "0.58rem", gap: "0.3rem", tracking: "0.14em" },
  md: { kr: "1.8rem", en: "0.72rem", gap: "0.45rem", tracking: "0.16em" },
  lg: { kr: "2.4rem", en: "0.88rem", gap: "0.6rem", tracking: "0.18em" },
  xl: { kr: "3.6rem", en: "1.1rem", gap: "0.8rem", tracking: "0.20em" },
} as const;

function getColors(theme: LogoTheme) {
  switch (theme) {
    case "dark":
      return { primary: "#F2ECF8", secondary: "#7E6B9A" };
    case "light":
      return { primary: "#110D1A", secondary: "#7E6B9A" };
    case "mono-dark":
      return { primary: "#F2ECF8", secondary: "#F2ECF8" };
    case "mono-light":
      return { primary: "#110D1A", secondary: "#110D1A" };
  }
}

export function MingleLogo({
  variant = "full",
  theme = "dark",
  size = "md",
  className,
  style,
}: MingleLogoProps) {
  const s = SIZES[size];
  const c = getColors(theme);

  const krStyle: CSSProperties = {
    fontFamily: '"Noto Sans KR", "Pretendard", system-ui, sans-serif',
    fontSize: s.kr,
    fontWeight: 700,
    letterSpacing: s.tracking,
    color: c.primary,
    lineHeight: 1.1,
    margin: 0,
  };

  const enStyle: CSSProperties = {
    fontFamily: '"Noto Sans KR", "Pretendard", system-ui, sans-serif',
    fontSize: s.en,
    fontWeight: 400,
    letterSpacing: "0.32em",
    textTransform: "uppercase" as const,
    color: c.secondary,
    lineHeight: 1,
    margin: 0,
  };

  if (variant === "english") {
    return (
      <span className={className} style={{ ...enStyle, fontSize: s.kr, letterSpacing: "0.22em", ...style }}>
        Mingle
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span className={className} style={{ ...krStyle, ...style }} aria-label="밍글">
        밍글
      </span>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: variant === "splash" ? "center" : "flex-start",
        gap: s.gap,
        ...style,
      }}
      role="img"
      aria-label="밍글 Mingle"
    >
      <span style={krStyle}>밍글</span>
      <span style={enStyle}>Mingle</span>
    </div>
  );
}
