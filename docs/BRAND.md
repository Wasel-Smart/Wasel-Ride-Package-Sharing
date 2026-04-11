# Wasel Brand Guidelines

**Version:** 2026-04-11  
**Canonical identity:** Gold-navy. Solar gold (#F4C651) on deep navy (#07111B).

---

## 1. The One Brand — No More Divergence

The Wasel identity is **gold-navy**. Every file, component, and token now uses:

| Role | Hex | CSS Variable |
|---|---|---|
| Primary action | `#F4C651` | `--primary` |
| Primary deep | `#D59E26` | `--wasel-brand-bronze` |
| Champagne light | `#FFF0C1` | `--wasel-brand-green` |
| Accent bronze | `#C5831F` | `--wasel-bronze` |
| Deep background | `#07111B` | `--background` |
| Surface | `#101D2C` | `--card` |
| Text | `#F8EFD6` | `--foreground` |

**Never use** `#47B7E6`, `#1EA8E7`, `#A8D614`, or `#6BB515` — those were from a prior identity and are retired.

---

## 2. Logo — Canonical Hierarchy

### Primary mark
**`/public/brand/wasel-investor-pin.svg`** — used for all default contexts via `WaselLogo.tsx`.

### Full lockup (mark + wordmark)
`WaselLogo` component with `showWordmark={true}` (default). The wordmark renders "Wasel" in a champagne-gold gradient on dark surfaces. On light surfaces it uses warm amber tones.

### Mark only
`WaselMark` or `WaselIcon` components, or `wasel-mark-monochrome.svg` for single-color contexts.

### Variants by context

| Context | File / Component |
|---|---|
| App header & nav | `WaselLogo size={34}` |
| Hero / landing | `WaselHeroMark size={120}` |
| Favicon (16×16, 32×32) | `favicon.ico` / `favicon-16x16.png` |
| PWA icon | `icon-192.png`, `icon-512.png` |
| Investor / pin use | `wasel-investor-pin.svg` |
| Monochrome / print | `wasel-mark-monochrome.svg` |
| Social card | `og-social-card.png` (1200×630) |

### Retired variants (do not use in production)
- `W birdlogo.jpg` — JPEG, not scalable, wrong identity
- `wasel-mark-luxury-signature.svg` — alternate identity prototype
- `wasel-mark-simplified-concept.svg` — prototype

---

## 3. Clear Space

The logo mark must have minimum clear space equal to **the height of the "W" letterform** on all sides. Never crop, overlay, or crowd the mark.

Minimum display size: **24px height** for the mark. Below this use text-only wordmark.

---

## 4. Typography

| Role | Font | Weight |
|---|---|---|
| Display / hero headings | Space Grotesk | 700–800 |
| Body / UI | Plus Jakarta Sans | 400–700 |
| Arabic | Cairo, then Tajawal | 400–700 |
| Monospace / code | JetBrains Mono | 400 |

Minimum sizes: 12px for captions, 14px for UI labels, 16px for body copy.

---

## 5. Dark Mode (default) vs Light Mode

The app defaults to **dark mode**. All primary UI is designed dark-first.

Light mode (`class="light"` on `<html>`) uses warm cream (`#F8F2E5` background, `#2D210B` text). Light mode primary is `#D7A33A` for contrast on cream.

---

## 6. Gradients

| Name | Value | Usage |
|---|---|---|
| Primary button | `135deg, #FFF0C1 → #F4C651 → #C5831F` | CTAs, primary actions |
| Gold accent | `135deg, #D59E26 → #FFE8A0` | Secondary accent |
| Signal | `135deg, #FFF0C1 → #F4C651 → #D59E26` | Badges, highlights |

---

## 7. RTL / Arabic

- Use `dir="rtl"` on the root `<html>` when `language === 'ar'`
- Font stack falls to Cairo → Tajawal → Almarai for Arabic text
- Use CSS logical properties (`padding-inline-start`, `margin-inline-end`) for layout that must flip in RTL
- LanguageContext drives the `ar` boolean; pass it through PageShell

---

## 8. Do Not

- Do not use blue (`#1EA8E7`), cyan (`#47B7E6`), lime (`#A8D614`) — retired palette
- Do not place the JPEG bird logo in any production view
- Do not use the logo at under 24px height
- Do not place the mark on a mid-gray background — use deep navy or white only
- Do not stretch, rotate, or recolor the mark
- Do not add new color tokens without updating brand-tokens.json, wasel-tokens.ts, and brand-theme.css simultaneously
