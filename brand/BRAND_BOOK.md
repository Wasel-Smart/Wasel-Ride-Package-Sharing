# Wasel Brand Book
**واصل** — Visual Identity System v2.0

---

## 1. Brand Essence

### Core Identity
Wasel is the connective tissue of Jordanian mobility — a platform that transforms how people move, share, and trust each other across the Kingdom. The brand lives at the intersection of **kinetic energy** and **profound reliability**.

### Brand Positioning
- **Tone:** Confident guide, not corporate authority
- **Promise:** Movement made effortless, trust made visible
- **Territory:** Tech-forward but locally grounded
- **Differentiation:** Human-scale trust in a platform-scale product

### Brand Values in Visual Form
| Value | Visual Translation |
|-------|-------------------|
| Movement | Diagonal lines, forward momentum, orbital paths |
| Trust | Solid shapes, anchored compositions, transparent layers |
| Innovation | Gradient flows, luminous accents, glass surfaces |

---

## 2. Color Philosophy

### Primary Palette — The Movement Trinity

The Wasel color system is built on three functional colors that map directly to user intent:

| Token | Name | Hex | RGB | HSL | Role |
|-------|------|-----|-----|-----|------|
| `W-CYAN` | Orbit Cyan | `#00E5FF` | 0, 229, 255 | 188°, 100%, 50% | Primary actions, navigation, focus states |
| `W-INK` | Deep Ink | `#081D39` | 8, 29, 57 | 210°, 76%, 13% | Backgrounds, primary text, structure |
| `W-LIME` | Motion Lime | `#72C70D` | 114, 199, 13 | 93°, 88%, 42% | Success, confirmation, eco-positive |
| `W-EMBER` | Journey Ember | `#FF8A0B` | 255, 138, 11 | 35°, 100%, 52% | CTAs, warnings, energy moments |

### Color Psychology & Usage Hierarchy

**Orbit Cyan (#00E5FF)**
- The brand's signature — represents motion, air, digital flow
- Use for: Primary buttons, active states, links, focus rings, data visualization
- **Never** use as background fill (too luminous for large areas)
- Minimum text on cyan: `#081D39` (ink) at 4.8:1 ratio
- Minimum icon on cyan: `#081D39` at 3:1 ratio

**Deep Ink (#081D39)**
- The anchor — represents depth, trust, night sky
- Use for: Primary backgrounds, headers, body text, structural elements
- **Never** use for error states (conflicts with trust association)
- Text on ink: `#F8FBFF` at 15.2:1 ratio (AAA compliant)

**Motion Lime (#72C70D)**
- The confirmation — represents growth, arrival, positive outcome
- Use for: Success states, "arrived" confirmations, eco-friendly messaging
- Text on lime: `#081D39` at 4.6:1 ratio (AA compliant)
- Gradient partner: pairs with cyan for "eco-tech" feel

**Journey Ember (#FF8A0B)**
- The energy — represents warmth, urgency, human connection
- Use for: Urgent CTAs, time-sensitive alerts, premium features
- Text on ember: `#FFFFFF` at 3.2:1 ratio (AA large text compliant)
- Gradient partner: pairs with cyan for "warm tech" feel

### Extended Palette — Supporting Cast

| Token | Hex | Usage | Ratio to Primary |
|-------|-----|-------|-----------------|
| `W-PURPLE` | `#8FA6FF` | AI features, smart suggestions | Complementary accent |
| `W-GOLD` | `#FFBE5C` | Premium, Wasel Plus, rewards | Warm accent |
| `W-ROSE` | `#FF7C8B` | Errors, cancellations, alerts | Semantic warning |
| `W-SLATE` | `#95B2C9` | Muted text, disabled states | Neutral supporting |

### Gradient System

Gradients are directional — they imply movement. All gradients flow top-left to bottom-right (135°) or top to bottom (180°).

| Name | CSS | Usage |
|------|-----|-------|
| `GRAD-PRIMARY` | `linear-gradient(135deg, #00E5FF 0%, #38BEFF 52%, #32D8A6 100%)` | Hero sections, primary CTAs, key visuals |
| `GRAD-ORBIT` | `linear-gradient(135deg, #147FE4 0%, #38BEFF 52%, #32D8A6 100%)` | Trust indicators, verified badges |
| `GRAD-EMBER` | `linear-gradient(135deg, #FF8A0B 0%, #FFB35C 48%, #FF936A 100%)` | Urgent actions, hot deals |
| `GRAD-LIME` | `linear-gradient(135deg, #72C70D 0%, #34D8A7 52%, #209B7D 100%)` | Success flows, eco messaging |
| `GRAD-INK` | `linear-gradient(145deg, #081D39 0%, #0a1f3a 56%, #132b4d 100%)` | Card backgrounds, depth |
| `GRAD-AURORA` | `radial-gradient(circle at top, rgba(0,229,255,0.18), rgba(114,199,13,0.08) 42%, transparent 74%)` | Atmospheric backgrounds |
| `GRAD-SIGNAL` | `linear-gradient(135deg, #F8FBFF 0%, #8DEBFF 52%, #47D69E 100%)` | Light theme accents |

### Accessibility Contrast Matrix

| Foreground | Background | Ratio | WCAG |
|------------|-----------|-------|------|
| `#F8FBFF` | `#081D39` | 15.2:1 | AAA |
| `#00E5FF` | `#081D39` | 8.4:1 | AAA |
| `#72C70D` | `#081D39` | 4.6:1 | AA |
| `#FF8A0B` | `#FFFFFF` | 3.2:1 | AA Large |
| `#95B2C9` | `#081D39` | 4.8:1 | AA |

---

## 3. Typography System

### Type Architecture

Wasel typography is bilingual by design. Arabic and Latin scripts share the same hierarchy but use optimized font stacks.

### Font Families

| Stack | Token | Latin | Arabic | Mono |
|-------|-------|-------|--------|------|
| Primary | `F` | Plus Jakarta Sans | Cairo / Tajawal | — |
| Arabic-first | `FA` | Plus Jakarta Sans | Cairo / Tajawal | — |
| Technical | `FM` | — | — | JetBrains Mono |

**Font Loading Strategy:**
- Self-hosted WOFF2 files (see Section 9)
- `font-display: swap` for performance
- Preload critical weights (400, 600, 700)

### Type Scale (Modular, 1.25 ratio)

| Token | Size | Line Height | Usage | Min Weight |
|-------|------|-------------|-------|------------|
| `TYPE.display` | `3rem` (48px) | 1.05 | Hero headlines, landing pages | 800 |
| `TYPE.h1` | `2.25rem` (36px) | 1.1 | Page titles, section headers | 700 |
| `TYPE.h2` | `1.875rem` (30px) | 1.2 | Feature headers, card titles | 700 |
| `TYPE.h3` | `1.5rem` (24px) | 1.3 | Subsection headers | 600 |
| `TYPE.h4` | `1.25rem` (20px) | 1.4 | Component headers | 600 |
| `TYPE.title` | `1.125rem` (18px) | 1.5 | Card titles, list items | 600 |
| `TYPE.body` | `1rem` (16px) | 1.6 | Body text, paragraphs | 400 |
| `TYPE.caption` | `0.875rem` (14px) | 1.5 | Helper text, captions | 400 |
| `TYPE.overline` | `0.75rem` (12px) | 1.4 | Labels, metadata, timestamps | 500 |

### Weight Scale

| Token | Value | CSS | Usage |
|-------|-------|-----|-------|
| `TYPE.ultra` | 880 | `font-weight: 880` | Hero display only |
| `TYPE.black` | 800 | `font-weight: 800` | Headlines, emphasis |
| `TYPE.bold` | 700 | `font-weight: 700` | Subheadings, strong emphasis |
| `TYPE.semibold` | 600 | `font-weight: 600` | UI labels, button text |
| `TYPE.medium` | 500 | `font-weight: 500` | Secondary UI, captions |
| `TYPE.regular` | 400 | `font-weight: 400` | Body text, paragraphs |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `LS.tighter` | `-0.04em` | Large display text (48px+) |
| `LS.tight` | `-0.02em` | Headlines (24px+) |
| `LS.normal` | `0` | Body text, UI |
| `LS.wide` | `0.03em` | Uppercase labels, buttons |
| `LS.wider` | `0.06em` | Small caps, overlines |

### Arabic Typography Rules
- Default line height for Arabic: `1.95` (vs 1.6 for Latin)
- Preferred Arabic font: Cairo for UI, Tajawal for display
- Avoid justified text in Arabic (creates uneven word spacing)
- Use `font-feature-settings: "ss01"` for improved Arabic numerals

---

## 4. Logo System

### Logo Construction

The Wasel logo is built on a geometric grid:
- **Symbol:** Circular orbit with 3 nodes representing movement, trust, connection
- **Wordmark:** Custom letterforms with specific kerning pairs
- **Grid:** 24×24 unit grid with 4px increments

### Logo Hierarchy

| Component | Token | Min Size | Clear Space |
|-----------|-------|----------|-------------|
| Full Wordmark | `logo-full` | 120px wide | 1× symbol height |
| Compact Wordmark | `logo-compact` | 80px wide | 0.75× symbol height |
| Symbol | `logo-symbol` | 24px | 0.5× symbol height |
| W-Mark | `logo-w` | 16px | — |

### Logo Variants

| Variant | File Pattern | Background | Usage |
|---------|--------------|-----------|-------|
| Default | `logo-default.{fmt}` | Transparent | General use on dark/light |
| Dark | `logo-dark.{fmt}` | Dark | Light backgrounds |
| Light | `logo-light.{fmt}` | Light | Dark backgrounds |
| White | `logo-white.{fmt}` | Colored/dark | Hero sections, overlays |
| Black | `logo-black.{fmt}` | Light | Print, monochrome contexts |
| Monochrome | `logo-mono.{fmt}` | Any | Single-color reproduction |

### Logo Don'ts (Non-Negotiable)

1. **Never** stretch, skew, or rotate the logo
2. **Never** change logo colors outside the approved palette
3. **Never** add effects: shadows, outlines, glows, gradients to the logo mark itself
4. **Never** place logo on busy backgrounds without a solid 50%+ opacity ink backing
5. **Never** use old logo versions alongside new ones
6. **Never** recreate the logo in different typefaces
7. **Never** separate the symbol from the wordmark in headers (use symbol variant explicitly)
8. **Never** use the logo as a background pattern or watermark

### Logo Do's

1. **Always** maintain clear space equal to 1× symbol height
2. **Always** use approved file formats (SVG for vector, PNG/WebP/AVIF for raster)
3. **Always** use the `logo-symbol` variant for favicons and tabs
4. **Always** lock the aspect ratio at 1:1 for symbol, 3:1 for full wordmark
5. **Always** use the `brand-manifest.json` for programmatic asset resolution

---

## 5. Spacing & Layout

### Spacing Scale (8pt Grid)

| Token | Value | Usage |
|-------|-------|-------|
| `SP.0` | 0px | Reset, collapse |
| `SP.1` | 4px | Tight gaps, icon padding |
| `SP.2` | 8px | Compact elements |
| `SP.3` | 12px | List items, form fields |
| `SP.4` | 16px | Standard padding, card gaps |
| `SP.5` | 20px | Elevated padding |
| `SP.6` | 24px | Section spacing, card padding |
| `SP.8` | 32px | Major section gaps |
| `SP.10` | 40px | Page-level spacing |
| `SP.12` | 48px | Large section breaks |
| `SP.16` | 64px | Hero spacing, major divisions |

### Layout Principles
- **8pt grid:** All spacing aligns to 8px increments
- **12-column grid:** Web layouts use CSS Grid with 12 columns
- **Safe areas:** Mobile content respects notches and home indicators
- **Edge-to-edge:** Content extends to screen edges with contained cards
- **Breathing room:** Minimum 24px padding on mobile sides, 32px on desktop

---

## 6. Iconography

### Icon System
- **Style:** 2px stroke weight, rounded caps and joins
- **Size:** 24px grid, with 16px, 20px, 24px, 32px, 48px variants
- **Color:** Always use current color or `--wasel-brand-blue` for interactive icons
- **No fills:** Icons are stroked unless indicating state (filled = active)

### Icon Don'ts
1. Never mix icon families (no mixing outlined with filled in same component)
2. Never use icons smaller than 16px (accessibility violation)
3. Never use icons without proper `aria-label` or `title`
4. Never stretch icons beyond their grid

---

## 7. Imagery & Photography

### Photography Direction
- **Subjects:** Real Jordanians, authentic moments, diverse ages and backgrounds
- **Tone:** Warm, natural light, candid over staged
- **Composition:** Rule of thirds, leading lines toward movement
- **Color grading:** Warm shadows, cool highlights (cyan/teal accent in shadows)

### Illustration Style
- **Technique:** Flat design with subtle gradients
- **Characters:** Abstract human figures with movement lines
- **Scenes:** Simplified cityscapes, road networks, landmark silhouettes
- **Usage:** Empty states, onboarding, illustrations in emails

### Image Treatment
- Rounded corners: `border-radius: 12px` for photos, `16px` for cards
- Overlay gradient: `linear-gradient(180deg, transparent 60%, rgba(8,29,57,0.8) 100%)` for text legibility
- Shadow: `0 4px 20px rgba(8,29,57,0.3)` for depth

---

## 8. Motion Design System

### Motion Principles

**1. Purposeful Motion**
Every animation must serve a function: guide attention, indicate relationship, or provide feedback.

**2. Branded Easing**
Wasel motion uses custom cubic-bezier curves that feel organic, not mechanical.

| Token | Curve | Usage |
|-------|-------|-------|
| `EASE.DEFAULT` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Standard transitions |
| `EASE.SPRING` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Enter/exit, modals, sheets |
| `EASE.INOUT` | `cubic-bezier(0.4, 0, 0.2, 1)` | Page transitions, shared elements |
| `EASE.DECEL` | `cubic-bezier(0, 0, 0.2, 1)` | Deceleration, settling |

**3. Duration Hierarchy**

| Token | Duration | Usage |
|-------|----------|-------|
| `DUR.INSTANT` | 80ms | Micro-interactions, button press |
| `DUR.FAST` | 120ms | Hover states, focus indicators |
| `DUR.NORMAL` | 200ms | Standard transitions |
| `DUR.SLOW` | 300ms | Page transitions, modals |
| `DUR.SLOWER` | 500ms | Hero animations, onboarding |

### Core Animations

| Animation | Token | Description |
|-----------|-------|-------------|
| `slideUp` | — | Content enters from bottom |
| `slideDown` | — | Content enters from top |
| `fadeIn` | — | Simple opacity transition |
| `scaleIn` | — | Modal/sheet entrance |
| `pulseGlow` | — | Active state indicator |
| `shimmer` | — | Skeleton loading |
| `orbitSpin` | — | Branded loading spinner |
| `float` | — | Decorative elements |

### Motion Don'ts
1. Never animate more than 3 properties simultaneously
2. Never use duration > 500ms for UI transitions
3. Never animate layout properties (width, height) — use transforms
4. Never ignore `prefers-reduced-motion` media query
5. Never use motion for decoration without functional purpose

---

## 9. Component Standards

### Button Hierarchy

| Variant | Token | Usage | Background | Text |
|---------|-------|-------|-----------|------|
| Primary | `BTN.PRIMARY` | Main CTAs | `GRAD-PRIMARY` | `#081D39` |
| Secondary | `BTN.SECONDARY` | Secondary actions | `rgba(0,229,255,0.12)` | `#00E5FF` |
| Ghost | `BTN.GHOST` | Tertiary actions | transparent | `#00E5FF` |
| Gold | `BTN.GOLD` | Premium features | `GRAD-EMBER` | `#FFFFFF` |
| Danger | `BTN.DANGER` | Destructive actions | `#FF7C8B` | `#FFFFFF` |

### Card System

| Variant | Token | Background | Border |
|---------|-------|-----------|--------|
| Default | `CARD.DEFAULT` | `rgba(8,29,57,0.78)` + blur | `rgba(0,229,255,0.16)` |
| Solid | `CARD.SOLID` | `#0e2240` | `rgba(0,229,255,0.12)` |
| Elevated | `CARD.ELEVATED` | `#132b4d` | none |
| Brand | `CARD.BRAND` | `rgba(0,229,255,0.06)` | `rgba(0,229,255,0.2)` |

### Input Standards
- Height: 48px minimum (touch target)
- Border: `rgba(0,229,255,0.2)` with focus ring `rgba(0,229,255,0.4)`
- Background: `rgba(0,229,255,0.06)`
- Label: `TYPE.caption` with `TYPE.medium` weight
- Error state: Border `#FF7C8B`, helper text in rose

---

## 10. Voice & Tone

### Brand Voice
- **Clear:** Simple words, short sentences, active voice
- **Confident:** Direct statements, no hedging
- **Warm:** Human, approachable, never cold
- **Bilingual:** Arabic and English treated as equals, not translations

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Onboarding | Encouraging | "Let's get you moving" |
| Booking | Efficient | "Your ride is confirmed" |
| Trust/Safety | Reassuring | "Your safety is our priority" |
| Error | Apologetic + Solution | "Something went wrong. Try again." |
| Marketing | Aspirational | "Move through Jordan like never before" |

### Arabic Voice
- Use Modern Standard Arabic (MSA) for formal contexts
- Use Jordanian colloquial for casual/app contexts
- Right-to-left layout with proper mirroring
- Arabic numerals: Use Eastern Arabic numerals (٠١٢٣...) or Latin based on user preference

---

## 11. Accessibility Standards

### WCAG 2.1 AA Compliance (Minimum)

| Criterion | Requirement | Wasel Standard |
|-----------|-------------|----------------|
| Contrast (Text) | 4.5:1 | 4.8:1 minimum |
| Contrast (Large Text) | 3:1 | 3.2:1 minimum |
| Touch Target | 44×44px | 48×48px minimum |
| Focus Indicator | 3:1 contrast | Cyan ring, 3px |
| Text Resize | 200% without loss | Supported via rem units |
| Motion | Respect `prefers-reduced-motion` | All animations disabled |

### Accessibility Don'ts
1. Never rely on color alone to convey information
2. Never disable focus indicators
3. Never use `alert()` for notifications
4. Never auto-play audio/video
5. Never trap keyboard focus in modals without escape

---

## 12. Platform Adaptations

### Web (Desktop)
- Max content width: 1280px
- Sidebar navigation on desktop
- Hover states for all interactive elements
- Keyboard navigation support

### Web (Mobile)
- Bottom navigation bar
- Swipe gestures where appropriate
- Larger touch targets (48px minimum)
- Simplified navigation hierarchy

### Mobile App
- Portrait-only orientation
- Platform-native navigation patterns
- Biometric auth integration
- Offline-first architecture with visual indicators

### Print
- Minimum resolution: 300 DPI
- Logo minimum: 25mm wide
- CMYK color values provided in asset package
- Include tagline "Ride. Share. Move." on marketing materials

---

## 13. Brand Governance

### Asset Management
- Source files stored in `/brand/assets/`
- Generated artifacts in `/public/brand/` and `/artifacts/brand/`
- `brand-manifest.json` as single source of truth for asset metadata

### Change Control
- Brand changes require approval from design lead
- Version tracked in `brand-manifest.json`
- Changelog in this document (Section 16)

### Enforcement
- CI pipeline runs `npm run brand:check` to validate token usage
- Pull requests must pass brand consistency checks
- Deprecated tokens trigger warnings, then errors

---

## 14. Implementation Reference

### Design Token Import (TypeScript)
```ts
import { C, F, TYPE, SPACE, R, SH, GRAD, ANIM, EASE, DUR, LS, Z } from '@/utils/wasel-ds';
```

### CSS Variable Usage
```css
background: var(--wasel-brand-ink);
color: var(--wasel-brand-blue);
box-shadow: var(--wasel-shadow-blue);
```

### React Component Usage
```tsx
import { WaselLogo, WaselButton, WaselCard, WaselInput } from '@/components/wasel-ui';
```

---

## 15. Brand Checklist

Before shipping any feature, verify:

- [ ] Colors match approved palette (no unapproved blues/purples)
- [ ] Typography follows hierarchy (no random font sizes)
- [ ] Logo has proper clear space and variant
- [ ] Touch targets are 48px minimum
- [ ] Text has 4.5:1 contrast minimum
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Arabic text has proper RTL layout
- [ ] No brand tokens are hardcoded as hex values
- [ ] All images have alt text
- [ ] Error states use rose, not just color changes

---

## 16. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-08-25 | Comprehensive rebrand: new color philosophy, motion system, typography hierarchy, component standards, accessibility matrix, platform adaptations, brand governance |
| 1.0.0 | 2026-08-25 | Initial brand guidelines: unified asset structure, naming conventions, component API documentation, color and typography systems |

---

*Wasel Brand Book v2.0 — Maintained by the Wasel Design Team*
