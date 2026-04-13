/**
 * 밍글 / Mingle — Motion Token System
 * Direction: Midnight Connection
 *
 * Motion philosophy: controlled, premium, emotionally satisfying.
 * Never bouncy, playful, or gamified. Quiet magnetism.
 */

export const motionTokens = {
  duration: {
    quick: 0.16,
    base: 0.24,
    page: 0.36,
    reveal: 0.6,
    splash: 1.2
  },
  ease: {
    standard: [0.4, 0, 0.2, 1] as const,
    premium: [0.16, 1, 0.3, 1] as const,
    accelerate: [0.4, 0, 1, 1] as const,
    decelerate: [0, 0, 0.2, 1] as const,
    midnight: [0.22, 0.9, 0.36, 1] as const
  }
} as const;

export const mingleMotion = {
  pageEnter: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionTokens.duration.page, ease: motionTokens.ease.premium }
  },
  tabPanel: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: motionTokens.duration.base, ease: motionTokens.ease.standard }
  },
  roundShift: {
    initial: { opacity: 0, y: 8, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: motionTokens.duration.base, ease: motionTokens.ease.premium }
  },
  cardLift: {
    whileHover: { y: -3, scale: 1.008 },
    whileTap: { scale: 0.992 },
    transition: { duration: motionTokens.duration.base, ease: motionTokens.ease.premium }
  },
  heartPress: {
    whileHover: { scale: 1.04, y: -1 },
    whileTap: { scale: 0.90 },
    transition: { duration: 0.18, ease: motionTokens.ease.midnight }
  },
  revealUnlock: {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.32, ease: motionTokens.ease.premium }
  },
  modal: {
    initial: { opacity: 0, y: 16, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.985 },
    transition: { duration: 0.28, ease: motionTokens.ease.premium }
  },
  opsCommit: {
    initial: { opacity: 0, scale: 0.988, y: 6 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: motionTokens.duration.base, ease: motionTokens.ease.premium }
  },
  toast: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: motionTokens.duration.base, ease: motionTokens.ease.premium }
  },
  splashReveal: {
    initial: { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: motionTokens.duration.reveal, ease: motionTokens.ease.premium }
  }
} as const;
