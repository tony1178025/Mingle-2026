/**
 * 밍글 / Mingle — Brand Logo System (Corrected)
 *
 * 로고 스페이싱: 리드미컬하고 에너지 있게 (과도한 확장 제거)
 * 한국어 우선, 따뜻하고 약간 무겁게
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
  sm: { kr: "1.3rem", en: "0.58rem", gap: "0.25rem", tracking: "0.06em" },
  md: { kr: "1.8rem", en: "0.72rem", gap: "0.35rem", tracking: "0.08em" },
  lg: { kr: "2.4rem", en: "0.88rem", gap: "0.45rem", tracking: "0.10em" },
  xl: { kr: "3.2rem", en: "1rem", gap: "0.55rem", tracking: "0.10em" },
} as const;

function getColors(theme: LogoTheme) {
  switch (theme) {
    case "dark":
      return { primary: "#F5F0FA", secondary: "#8E7CAA" };
    case "light":
      return { primary: "#110D1A", secondary: "#8E7CAA" };
    case "mono-dark":
      return { primary: "#F5F0FA", secondary: "#F5F0FA" };
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
    lineHeight: 1.15,
    margin: 0,
  };

  const enStyle: CSSProperties = {
    fontFamily: '"Noto Sans KR", "Pretendard", system-ui, sans-serif',
    fontSize: s.en,
    fontWeight: 400,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: c.secondary,
    lineHeight: 1,
    margin: 0,
  };

  if (variant === "english") {
    return (
      <span className={className} style={{ ...enStyle, fontSize: s.kr, letterSpacing: "0.12em", ...style }}>
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
