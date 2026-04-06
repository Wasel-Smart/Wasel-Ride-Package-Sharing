# Wasel Brand Guidelines

## Foundation

The refreshed Wasel identity is built from the linked-frames logo system:

- Primary brand energy: electric cyan
- Secondary momentum/accent: vivid lime
- Support surfaces: deep navy and blue-black glass panels
- Personality: minimal, connected, luminous, technical, investor-ready

The visual language should feel structured and calm first, then energetic through selective glow, gradients, and activation states.

## Logo Interpretation

- The interlocked rounded rectangles communicate connection, continuity, and multi-service mobility.
- Rounded corners should stay generous across the product to echo the mark geometry.
- Glow should be controlled and purposeful. Reserve stronger bloom for hero areas, active navigation, app-icon moments, and primary CTAs.
- On dark surfaces, use the brighter logo treatment.
- On light surfaces, reduce glow and increase outline clarity.

## Color Tokens

### Core

- `brand.bg`: `#061726`
- `brand.bgAlt`: `#082033`
- `brand.surface`: `#0B2135`
- `brand.surfaceAlt`: `#102B44`
- `brand.text`: `#EAF7FF`
- `brand.textMuted`: `rgba(153,184,210,0.66)`

### Brand

- `brand.primary`: `#16C7F2`
- `brand.primaryDeep`: `#0A74C9`
- `brand.accent`: `#C7FF1A`
- `brand.success`: `#60C536`

### Utility

- `brand.border`: `rgba(73,190,242,0.16)`
- `brand.borderStrong`: `rgba(73,190,242,0.34)`
- `brand.error`: `#FF646A`
- `brand.warning`: `#FFD84A`

## Gradients

- Primary CTA: `linear-gradient(135deg, #16C7F2 0%, #0A74C9 52%, #33D7D0 100%)`
- Accent/success: `linear-gradient(135deg, #59C83B 0%, #C7FF1A 100%)`
- Signal blend: `linear-gradient(135deg, #16C7F2 0%, #3AD7E4 48%, #C7FF1A 100%)`

## Typography

- Primary UI font: `Plus Jakarta Sans`
- Arabic font: `Cairo`
- Display font: `Space Grotesk`

### Scale

- H1: `3.25rem / 900 / -0.05em`
- H2: `2.5rem / 900 / -0.03em`
- H3: `2rem / 800 / -0.03em`
- H4: `1.6rem / 800 / -0.02em`
- H5: `1.32rem / 700 / -0.02em`
- H6: `1.125rem / 700`
- Body: `0.92rem - 1rem / 500 / 1.6`
- Caption/meta: `0.66rem - 0.76rem / 700 / 0.08em - 0.12em`

Use uppercase tracked labels sparingly for navigation categories, chips, status, and investor-style meta copy.

## Layout System

- Base grid: `4px`
- Standard spacing rhythm: `8px`
- Card padding defaults: `16px`, `20px`, `24px`
- Section spacing should prefer multiples of `24px`

## Radius

- Small: `10px`
- Medium: `14px`
- Large: `18px`
- XL: `22px`
- Pill/full: `9999px`

Rounded geometry should stay consistent with the logo. Avoid sharp corners unless representing data or map grids.

## Elevation

- Default card: `0 18px 44px rgba(1,10,18,0.28)`
- Raised panel: `0 24px 56px rgba(1,10,18,0.34)`
- Hero/shell: `0 34px 80px rgba(1,10,18,0.38)`
- Cyan glow: `0 18px 50px rgba(22,199,242,0.22)`

## Components

- Primary buttons: bright cyan gradient, dark text, subtle cyan glow
- Secondary buttons: glass surface, cyan border, white text
- Cards: dark glass or solid navy, hairline cyan border, low-noise shadows
- Inputs: dark panels with readable borders and clear focus rings
- Navigation: restrained glass backgrounds with active cyan/lime emphasis
- Icons: outline-first, crisp, slightly technical, minimal fill

## Accessibility

- Keep text contrast high against dark surfaces
- Glow must never replace contrast
- Focus states should use a visible cyan or lime ring
- Mobile tap targets should stay at or above `44px`

## Motion

- Use short, confident transitions
- Prefer fade, lift, and glow shifts over large movement
- Respect reduced-motion preferences

## Implementation Notes

- Global CSS variables live in `src/styles/brand-theme.css`
- Shared TypeScript tokens live in `src/utils/wasel-ds.ts`
- JSON token export lives in `src/tokens/brand-tokens.json`

When introducing new surfaces or features, start from the shared tokens instead of creating new one-off dark/cyan values.
