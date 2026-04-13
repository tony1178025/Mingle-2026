# 밍글 / Mingle — Brand Design System

## Direction: Midnight Connection (Active)

> "조용히 압도적인" · "감도가 높은" · "보는 순간 수준이 느껴지는"

---

## Brand Core

- **Korean Primary**: 밍글
- **English Secondary**: Mingle
- **Concept**: "The Golden Hour of Connection"
- **Atmosphere**: Premium dark luxury, emotional-first, warmer, more mysterious

### Brand Personality Keywords

- Refined chemistry
- Midnight warmth
- Quiet magnetism
- Disciplined allure
- Premium anticipation
- Emotional polish
- Composure with pulse
- Sensitive luxury

### What This Brand Is NOT

- Loud, trendy, vulgar, childish
- Generic dating app aesthetic
- Startup template feeling
- Beauty brand cliché
- Nightlife poster energy

---

## 1. Color System

### Core Tokens

| Token | Value | Role |
|-------|-------|------|
| `--brand-bg-deep` | `#1A0B2E` | Midnight Royal Purple — core brand |
| `--brand-accent-rose` | `#D48197` | Muted Rose Pulse — primary accent |
| `--brand-detail-gold` | `#C5A059` | Champagne Gold — micro details only |

### Semantic Color Roles

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-foundation` | `#0D0618` | Deepest background layer |
| `--bg-base` | `#120822` | Primary background |
| `--bg-elevated` | `#1A0B2E` | Elevated surfaces |
| `--bg-surface` | `#221340` | Card / panel backgrounds |
| `--bg-surface-secondary` | `#2A1750` | Secondary surface |
| `--text-primary` | `#F2ECF8` | Primary text (warm ivory-lavender) |
| `--text-secondary` | `#B8A8D0` | Secondary text |
| `--text-muted` | `#7E6B9A` | Muted / tertiary text |
| `--line-dark` | `rgba(255,255,255,0.07)` | Subtle borders |
| `--line-dark-strong` | `rgba(255,255,255,0.13)` | Strong borders |
| `--glow-soft` | `rgba(212,129,151,0.06)` | Atmospheric soft glow |
| `--accent-pulse` | `rgba(212,129,151,0.12)` | Pulse / hover emphasis |

### Color Rationale

- **20% richer and darker** than previous Elegant Chemistry direction
- Purple foundation is velvet-dark, NOT dead black — retains soulful depth
- Rose accent is diffused, like distant neon through fog — never loud pink
- Gold is reserved for 1px details and micro-interactions only — never gaudy
- All colors bleed softly through atmospheric diffusion, not hard gradients

### CTA & Interactive

| Token | Value | Usage |
|-------|-------|-------|
| `--cta-gradient` | `#D48197 → #B8637A → #8B4A6A` | Premium CTA buttons |
| `--cta-glow` | Rose shadow at 0.28 opacity | Button depth |
| `--cta-hover-glow` | Rose shadow at 0.34 opacity | Hover state |

---

## 2. Typography

### Rationale

- Slightly warmer, slightly heavier than Elegant Chemistry
- Korean-first hierarchy — 밍글 always dominant
- Premium readability maintained
- No sharp, cold, hard-edged feeling

### System

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| UI / Body | Noto Sans KR | 400–600 | Korean-first, clean, warm |
| Display | Cormorant Garamond | 400–700 | English editorial headlines |
| Brand KR | Noto Sans KR | 700 | Wordmark "밍글" with wide tracking |
| Brand EN | Noto Sans KR | 400 | "Mingle" uppercase, wide letterspacing |

### Typography Tone

- The Korean wordmark "밍글" has **subtle rounded premium softness**
- Wide tracking creates **intentional distance and composure**
- English sits below Korean at ~1:0.6 ratio
- Never sharp, never bubbly, never childish

---

## 3. Logo System

### Lockup Variants

| Variant | Usage |
|---------|-------|
| `full` | 밍글 + Mingle stacked — primary branding |
| `compact` | 밍글 only — headers, navigation |
| `splash` | Centered with icon — splash screen |
| `english` | Mingle only — international contexts |

### Monochrome

| Variant | Context |
|---------|---------|
| `mono-dark` | Light text on dark background |
| `mono-light` | Dark text on light background |

### Component: `<MingleLogo>`

```tsx
<MingleLogo variant="full" theme="dark" size="lg" />
<MingleLogo variant="compact" theme="mono-light" size="sm" />
```

---

## 4. Icon / Symbol

### Concept: "The Intersection of Two Ethereal Energies"

- Two abstract organic ellipses overlapping
- The intersection (vesica piscis) represents the meeting point
- Smoked-glass materiality with subtle interior glow
- Gold micro-accent at the tension point

### What It Is NOT

- Not a heart
- Not a chat bubble
- Not people silhouettes
- Not a generic dating icon
- Not a startup blob

### Materiality

- Smoked glass + subtle interior glow
- Illuminated physical-object feeling
- Velvet-dark background with atmospheric haze
- Soft edge strokes suggesting glass edges

### Component: `<MingleIcon>`

```tsx
<MingleIcon variant="full" size={96} />      // App icon
<MingleIcon variant="compact" size={48} />    // UI mark
<MingleIcon variant="mono-dark" size={32} />  // Monochrome
```

---

## 5. Material / Surface Philosophy

### Texture Direction

- **Matte velvet** + **soft lacquer**
- Atmospheric soft shadow depth
- No bright glows, cheap neon, or generic glassmorphism

### Shadow System

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-deep` | Long double shadow | Hero / splash surfaces |
| `--shadow-dark` | Standard depth | Primary cards |
| `--shadow-soft` | Gentle depth | Secondary cards |
| `--shadow-subtle` | Minimal | Signal cards |
| `--shadow-inner-glow` | Inset rose tint | Premium surfaces |

### Surface Behavior

- Surfaces have a `::before` pseudo-element with soft radial glow
- Creates velvet-lit appearance without explicit glassmorphism
- Backdrop-filter uses moderate blur (28px) with low saturation (110%)
- This avoids the over-bright glass cliché

---

## 6. Spacing Rationale

- Intimate but premium — slightly tighter than generic spacing
- More padding inside interactive elements (1.05rem → 1.25rem)
- Wide tracking on brand text creates breathable luxury
- Card gaps at 1rem feel intentional, not cramped

---

## 7. Splash Screen

### Implementation: `<SplashScreen>`

- Velvet-dark foundation background
- Three-layer atmospheric diffusion (violet, rose, gold)
- Centered icon with reveal animation
- Brand lockup: "밍글" (KR primary) + "MINGLE" (EN secondary)
- Quiet pulse animation — never noisy
- Minimum 1.8s display, then 500ms fade-out
- Feels like a premium midnight reveal

---

## 8. Where Elegant Chemistry Differs (Not Selected)

| Aspect | Elegant Chemistry | Midnight Connection (Active) |
|--------|------------------|------------------------------|
| Saturation | Standard | 20% richer and darker |
| Shadow depth | Moderate | Enhanced velvet depth |
| Typography weight | Regular | Slightly heavier and warmer |
| Spacing | Standard | More intimate |
| Icon logic | Geometric precision | Smoked-glass ethereal |
| Emotional tone | Balanced refinement | Deeper mystery, warmth |
| Background | Near-black | Soulful midnight purple |

Elegant Chemistry is refined and globally versatile, but Midnight Connection was selected for its **deeper emotional resonance**, **warmer atmosphere**, and **more distinctive premium presence** in the Korean market.

---

## 9. UI Icon System

### Style Rules

- **2.5pt stroke weight** feeling
- Floating terminals (no hard caps)
- Soft-edge geometry — not too round, not too sharp
- Rose accent (`#D48197`) for active states
- Subtle glow on interaction
- Customer icons: slightly softer, more atmospheric
- Admin icons: slightly crisper, more informational

### States

| State | Behavior |
|-------|----------|
| Default | Rose outline at 0.65 opacity |
| Hover | Scale 1.04, subtle glow |
| Active | Filled with accent-pulse background |
| Disabled | 0.35 opacity, no glow |

---

## 10. QA Checklist

- [x] Branding feels premium and emotionally magnetic
- [x] Customer UI is atmospheric but not noisy
- [x] Admin readability preserved (light shell unchanged)
- [x] Tokens are reusable and scalable (CSS custom properties)
- [x] Splash screen feels expensive, not gimmicky
- [x] Logo/icon usage consistent across surfaces
- [x] Focus states use gold accent (not jarring blue)
- [x] Motion is controlled and premium (no bounce/spring)
- [x] Colors are 20% richer/darker than previous direction
- [x] No generic glassmorphism, neon, or startup clichés
