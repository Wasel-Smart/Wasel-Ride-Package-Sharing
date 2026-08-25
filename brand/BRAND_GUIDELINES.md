# Wasel Brand Guidelines

## 1. Brand Overview

**Wasel** (واصل) is a mobility platform connecting drivers and passengers across Jordan and the MENA region. The brand identity is built on movement, trust, and modern technology.

### Core Values
- **Movement** — Dynamic, energetic, always in motion
- **Trust** — Reliable, safe, transparent
- **Innovation** — Modern, efficient, tech-forward

---

## 2. Brand Architecture

### Name
- **English**: Wasel
- **Arabic**: واصل
- **Tagline**: Ride. Share. Move.

### Voice & Tone
- Professional yet approachable
- Clear and direct
- Bilingual parity: Arabic and English treated as equals
- Use Arabic script for RTL contexts, Latin for LTR

---

## 3. Color System

### Primary Palette

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `C.brandBlue` | `#00E5FF` | `rgb(0, 229, 255)` | Primary actions, links, highlights |
| `C.brandInk` | `#081D39` | `rgb(8, 29, 57)` | Headers, dark backgrounds, primary text |
| `C.brandGreen` | `#72C70D` | `rgb(114, 199, 13)` | Success states, eco-friendly messaging |
| `C.brandOrange` | `#FF8A0B` | `rgb(255, 138, 11)` | Warnings, calls-to-action, highlights |

### Semantic Aliases

| Context | Light Theme | Dark Theme |
|---------|-------------|------------|
| Background | `#F8FBFF` | `#081D39` |
| Card | `rgba(8,29,57,0.78)` | `rgba(8,29,57,0.78)` |
| Text | `#081D39` | `#F8FBFF` |
| Border | `rgba(0,229,255,0.16)` | `rgba(0,229,255,0.16)` |

### Gradients

| Name | CSS |
|------|-----|
| Primary | `linear-gradient(135deg, #00E5FF 0%, #38BEFF 52%, #32D8A6 100%)` |
| Hero | `linear-gradient(145deg, #081D39 0%, #0a1f3a 56%, #132b4d 100%)` |
| Green | `linear-gradient(135deg, #72C70D 0%, #34D8A7 52%, #209B7D 100%)` |
| Orange | `linear-gradient(135deg, #FF8A0B 0%, #FFB35C 48%, #FF936A 100%)` |

---

## 4. Typography

### Type Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `TYPE.size.xs` | `0.6875rem` | 1.5 | Captions, labels |
| `TYPE.size.sm` | `0.8125rem` | 1.5 | Secondary text |
| `TYPE.size.base` | `0.9375rem` | 1.5 | Body text |
| `TYPE.size.md` | `1rem` | 1.5 | Emphasized body |
| `TYPE.size.lg` | `1.15rem` | 1.5 | Subtitles |
| `TYPE.size.xl` | `1.35rem` | 1.3 | Section headers |
| `TYPE.size['2xl']` | `1.5rem` | 1.3 | Page headers |
| `TYPE.size['3xl']` | `1.875rem` | 1.1 | Hero titles |
| `TYPE.size['4xl']` | `2.25rem` | 1.1 | Display text |
| `TYPE.size['5xl']` | `3rem` | 1.1 | Marketing hero |

### Font Families

| Token | Stack |
|-------|-------|
| `F` | `'Plus Jakarta Sans', 'Cairo', 'Tajawal', 'Inter', sans-serif` |
| `FA` | `'Cairo', 'Tajawal', 'Plus Jakarta Sans', sans-serif` |
| `FM` | `'JetBrains Mono', 'Fira Mono', monospace` |

### Weights

| Token | Value |
|-------|-------|
| `TYPE.weight.regular` | 400 |
| `TYPE.weight.medium` | 500 |
| `TYPE.weight.semibold` | 600 |
| `TYPE.weight.bold` | 700 |
| `TYPE.weight.black` | 780 |
| `TYPE.weight.ultra` | 880 |

### Usage Rules
- Use `F` for Latin-first interfaces
- Use `FA` for Arabic-first / RTL interfaces
- Use `FM` for code, data, technical content
- Avoid weights below 400 for brand elements

---

## 5. Logo System

### Logo Hierarchy

| Component | Purpose | Usage |
|-----------|---------|-------|
| `WaselLogo` | Full logo with wordmark | App headers, auth pages, marketing |
| `WaselMark` | Symbol only | Favicons, tabs, small contexts |
| `WaselHeroMark` | Large framed symbol | Empty states, splash screens |
| `WaselIcon` | Compact symbol | Buttons, inline, navigation |

### Logo Variants

| Variant | File Pattern | Background |
|---------|--------------|------------|
| Default | `logo-default.svg` | Transparent |
| Dark | `logo-dark.svg` | Dark backgrounds |
| Light | `logo-light.svg` | Light backgrounds |
| White | `logo-white.svg` | Colored/dark backgrounds |
| Black | `logo-black.svg` | Light backgrounds |
| Monochrome | `logo-monochrome.svg` | Single-color print |

### Logo Clear Space

- Minimum clear space: `X` height of the symbol
- Do not place text or other elements within this space
- The logo should not be stretched, skewed, or rotated

### Minimum Sizes

| Context | Minimum Width |
|---------|---------------|
| Web header | 120px |
| Mobile app | 40px |
| Favicon | 16px (use symbol only) |
| Print | 25mm |

### Don'ts
- Do not change logo colors outside approved palette
- Do not add effects like shadows, outlines, or gradients
- Do not place logo on busy backgrounds without sufficient contrast
- Do not use old logo versions alongside new ones

---

## 6. Asset Library

### Directory Structure

```
brand/
├── assets/
│   ├── logos/
│   │   ├── primary/          # Full wordmark logos
│   │   └── symbols/          # Symbol/icon-only logos
│   ├── icons/                # App icons, favicons
│   ├── og/                   # Open Graph / social sharing
│   └── social/               # Social media assets
├── docs/                     # Brand guidelines
├── brand-manifest.json       # Machine-readable asset registry
└── BRAND_GUIDELINES.md       # This document
```

### File Naming Convention

```
{type}-{variant}-{size}.{format}

Examples:
- logo-default-512.png
- symbol-dark.svg
- icon-app-192.webp
- og-default.png
```

### Supported Formats

| Format | Usage |
|--------|-------|
| SVG | Vector, icons, logos (preferred) |
| PNG | Raster, fallback |
| WebP | Web optimized raster |
| AVIF | Next-gen web raster |

---

## 7. Component Usage

### React Components

```tsx
import { WaselLogo, WaselMark, WaselHeroMark, WaselIcon } from '@/components/wasel-ui/WaselLogo';

// Full logo with wordmark
<WaselLogo size={120} showWordmark={true} theme="dark" />

// Symbol only
<WaselMark size={40} />

// Hero/large framed symbol
<WaselHeroMark size={200} />

// Compact icon
<WaselIcon size={20} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `38` | Size in pixels |
| `showWordmark` | `boolean` | `true` | Show brand name text |
| `theme` | `'dark' \| 'light'` | `'dark'` | Color theme |
| `variant` | `'full' \| 'compact'` | `'full'` | Layout variant |
| `framed` | `boolean` | `false` | Add glow/drop shadow |
| `alt` | `string` | auto | Alt text for accessibility |

---

## 8. Accessibility

- All decorative logos use `aria-hidden="true"`
- Logo containers use `role="img"` with `aria-label`
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text
- Support both LTR and RTL layouts with proper `dir` attributes

---

## 9. Implementation

### Design Tokens

Import from `@/utils/wasel-ds`:

```ts
import { C, F, TYPE, SPACE, R, SH, GRAD } from '@/utils/wasel-ds';
```

### CSS Classes

```css
.wasel-logo { /* logo styles */ }
.wasel-brand-text { /* wordmark styles */ }
```

### Brand Manifest

Programmatic access to asset metadata:

```ts
import brandAssets from '@/brand/brand-manifest.json';

// Get all logo variants
const logos = brandAssets.logos;

// Get specific asset by context
const favicon = brandAssets.icons.favicon;
```

---

## 10. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-08-25 | 1.0.0 | Initial brand guidelines |
| | | Unified asset structure |
| | | Standardized naming conventions |
| | | Added component API documentation |
| | | Established color and typography systems |
