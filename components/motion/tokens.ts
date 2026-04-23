/**
 * 밍글 / Mingle — Motion Token System (Corrected)
 *
 * "오늘 밤 기대되는 프리미엄 파티"
 * 가볍고, 반응적이고, 즉각적.
 * 향수 광고가 아니라 파티 에너지.
 */

export const motionTokens = {
  duration: {
    quick: 0.12,
    base: 0.18,
    page: 0.26,
    splash: 0.4
  },
  ease: {
    standard: [0.4, 0, 0.2, 1] as const,
    snappy: [0.2, 0.9, 0.3, 1] as const,
    decelerate: [0, 0, 0.2, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const
  },
  spring: {
    micro: { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.7 },
    soft: { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.86 }
  }
} as const;

export const mingleMotion = {
  pageEnter: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: motionTokens.spring.soft
  },
  tabPanel: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: motionTokens.spring.soft
  },
  roundShift: {
    initial: { opacity: 0, y: 6, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: motionTokens.spring.soft
  },
  cardLift: {
    whileHover: { y: -2, scale: 1.006 },
    whileTap: { scale: 0.98 },
    transition: motionTokens.spring.micro
  },
  heartPress: {
    whileHover: { scale: 1.06 },
    whileTap: { scale: 0.88 },
    transition: motionTokens.spring.micro
  },
  revealUnlock: {
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: motionTokens.spring.soft
  },
  modal: {
    initial: { opacity: 0, y: 12, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 8, scale: 0.99 },
    transition: motionTokens.spring.soft
  },
  opsCommit: {
    initial: { opacity: 0, scale: 0.99, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: motionTokens.spring.soft
  },
  toast: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: motionTokens.spring.soft
  }
} as const;
