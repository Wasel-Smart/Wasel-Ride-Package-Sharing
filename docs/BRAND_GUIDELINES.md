# Wasel | واصل brand guidelines

## Core identity

Wasel connects people, places, and movement. Use the three-colour symbol as the primary visual anchor and the bilingual name **واصل | wasel** as the default product lockup.

## Master palette

### Primary brand colours

| Role | Token | Value |
| --- | --- | --- |
| Brand ink | `--wasel-brand-ink` | `#081D39` |
| Connection blue | `--wasel-brand-blue` | `#147FE4` |
| Movement green | `--wasel-brand-green` | `#72C70D` |
| Journey orange | `--wasel-brand-orange` | `#FF8A0B` |

Use brand ink for text and dark surfaces. Use blue as the principal interactive colour; reserve green and orange for positive movement, package progress, and supporting emphasis.

### Supporting accents

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Gold | `--wasel-gold` | `#FFBE5C` | Premium badges, rewards, Wasel Plus |
| Bronze | `--wasel-bronze` | `#FFBE5C` | Subscription tier indicators |
| Purple | `--wasel-purple` | `#8FA6FF` | Special status, VIP, trust signals |
| Teal / Cyan | `--wasel-teal` | `#58DDFF` | Information, maps, data viz |
| Lime | `--wasel-lime` | `#9AF1CF` | Secondary success, eco/movement themes |

Supporting accents must never overpower the primary brand colours. Use them sparingly for badges, secondary CTAs, and status indicators only.

## Logo rules

- Use `WaselLogo` everywhere in product UI. It centralizes the approved mark, bilingual lockup, sizing, contrast, and accessible name.
- Use the full lockup in headers, auth, page heroes, and offline states. Use the symbol-only variant only below 24px or where space is genuinely constrained.
- Maintain clear space equal to at least 20% of the symbol height. Do not stretch, recolour, outline, rotate, add text inside, or place the mark over busy imagery.
- Keep the mark at least 32px high in navigation, 48px in prominent page headers, and 72px in hero/auth contexts. PWA icons use the approved dark-background exports.
- The logo drop-shadow (when framed) uses `rgba(20, 127, 228, 0.24)` — Connection blue, not cyan or gold.

## Typography and direction

Use the Arabic name `واصل` with Cairo/Tajawal where available; use the same visual weight as `wasel`. Keep bilingual product names together as `واصل | wasel`, with Arabic rendered RTL. Arabic body copy uses a more generous line-height than English.

## Surfaces and motion

Prefer a calm ink/navy surface with high-contrast text. Shadows should be soft blue/navy, never heavy black. Motion is brief and purposeful (150–250ms); do not animate the logo continuously or introduce distracting glow effects.

### Shadow rules

All shadows must use soft blue/navy tones:

```
--wasel-shadow-sm: 0 1px 4px rgba(8,29,57,0.35)
--wasel-shadow-md: 0 4px 20px rgba(8,29,57,0.4)
--wasel-shadow-lg: 0 8px 40px rgba(8,29,57,0.45)
--wasel-shadow-blue: 0 4px 28px rgba(20,127,228,0.18)
--wasel-shadow-green: 0 4px 28px rgba(114,199,13,0.18)
--wasel-shadow-orange: 0 4px 28px rgba(255,138,11,0.2)
```

Never use `rgba(0, 0, 0, ...)` for shadows.

### Motion rules

- Durations: 150ms (fast), 200ms (normal), 280ms (slow)
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for spring, `cubic-bezier(0.4, 0, 0.2, 1)` for standard
- Pulse animations are opacity-only — no glow, no box-shadow animation
- Border emphasis uses colour shifts only, not glow spreads

## RTL Arabic support

All interactive components must support RTL:

- Layout direction follows `dir` attribute on root
- Sidebar border flips from `border-right` to `border-left`
- Margin/padding directional utilities use logical properties or `[dir='rtl']` overrides
- Select chevrons position on the correct side
- Icon arrows mirror in RTL contexts
- Text alignment respects direction — never force `textAlign: 'left'` in shared components
