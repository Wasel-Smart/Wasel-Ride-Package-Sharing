# Wasel | واصل — Brand Hub

This folder is the entry point for anyone touching the Wasel brand. It doesn't hold the
production assets itself — it points to where each piece actually lives, so there's one
place to start instead of guessing across three folders.

## Where things live

| What | Where | Notes |
| --- | --- | --- |
| Brand rules (palette, logo usage, motion, RTL) | [`/docs/BRAND_GUIDELINES.md`](../docs/BRAND_GUIDELINES.md) | Source of truth. Read this first. |
| Design tokens (code) | [`/src/utils/wasel-ds.ts`](../src/utils/wasel-ds.ts) → re-exported by [`/src/tokens/wasel-tokens.ts`](../src/tokens/wasel-tokens.ts) | Colours, type scale, shadows, motion — must match the guidelines doc above. If they ever drift, the guidelines doc wins and the tokens get fixed. |
| Production logo/icon/social assets | [`/public/brand/`](../public/brand/) | Every exported PNG/SVG/WEBP/AVIF actually served to users. This is the canonical asset library. |
| Logo component | [`/src/components/wasel-ui/WaselLogo.tsx`](../src/components/wasel-ui/WaselLogo.tsx) | The only place a logo should be rendered in the app. Don't `<img>` a brand asset directly in a page — use `WaselLogo` / `WaselMark` / `WaselHeroMark` / `WaselIcon`. |
| Design reference | [`reference/wasel-bilingual-reference.png`](./reference/wasel-bilingual-reference.png) | Static reference render of the bilingual (AR/EN) lockup, kept for design review. Not served to users — see `/public/brand/` for that. |

## Core palette (see BRAND_GUIDELINES.md for full rules)

| Role | Value |
| --- | --- |
| Brand ink | `#081D39` |
| Connection blue | `#147FE4` |
| Movement green | `#72C70D` |
| Journey orange | `#FF8A0B` |

Every surface — web, mobile, PWA manifest, social previews — should trace back to these four
values. If you find a hex code in the wild that isn't one of these (or a documented supporting
accent from BRAND_GUIDELINES.md), it's drift, not a variant.

## Known cleanup still needed (not done automatically — confirm before deleting)

- `_REMOVED/wasel-premium-logo-v2.png`, `_REMOVED/src-wasellogo.png` — superseded logo exports, no longer referenced anywhere in `src/` or `public/`.
- `.logo-backup-20260716-132148/` — a dated backup folder from a past logo revision.
- `public/manifest.json` — appears to be an orphaned duplicate of `public/manifest.webmanifest` (only `manifest.webmanifest` is linked from `index.html`). Its maskable-icon and screenshot entries were fixed for consistency, but the file itself is likely safe to delete once confirmed unused.
- `_TO_DELETE_BRAND_CLEANUP/public-favicon-svg-1.26MB-orphaned.svg` — was `public/favicon.svg`, a 1.26MB unoptimized SVG never referenced by `index.html` or `manifest.webmanifest` (the real favicon chain is `favicon.ico` / `favicon-32x32.png` / `favicon-16x16.png`, and the correctly-sized 3.23KB favicon already lives at `public/brand/favicon.svg`). Moved here 2026-08-25; confirm and delete.

Once removed, this folder plus `/docs/BRAND_GUIDELINES.md` and `/public/brand/` are the complete,
non-duplicated brand system.
