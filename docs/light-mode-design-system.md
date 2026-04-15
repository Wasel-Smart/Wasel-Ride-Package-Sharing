# Light Mode Design System

## Objective

Establish a premium light-mode system with the same product identity as dark mode:

- Mineral light canvas instead of generic flat white
- Deep signal panels for operational surfaces
- One CTA signature across shell, landing, and service flows
- Stronger semantic token contract so light mode is not a visual afterthought

## Audit Summary

### 1. Theme Contract Drift

- Light mode depended on shallow overrides in `brand-theme.css` while multiple pages still assumed dark-mode surfaces.
- Service pages were using `PAGE_DS` colors that were hardcoded and not aligned with the runtime theme variables.
- Shared wrappers in `src/features/shared/pageShared.tsx` and `src/pages/shared/pageUtils.tsx` forced `color-scheme: dark`, which broke light-mode parity at the document level.

### 2. Component Fragmentation

- Two parallel component systems existed: `src/components/ui/*` and `src/components/wasel-ui/*`.
- Token helpers in `src/utils/wasel-ds.ts` and `src/styles/wasel-design-system.ts` contained legacy hardcoded colors that diverged from the runtime theme.
- Buttons were not using a single foreground rule for CTA gradients, which made light-mode CTA readability inconsistent.

### 3. Surface and Brand Drift

- Landing and dashboard surfaces relied on hardcoded dark RGBA layers instead of local theme variables.
- The light palette leaned toward pale generic blue gradients, which reduced memorability.
- Service pages mixed light shell surfaces with dark-mode text assumptions, creating fragile contrast behavior.

## Implemented Changes

### Theme Layer

Updated `src/styles/brand-theme.css`:

- Rebuilt the light palette around a mineral canvas: `#f4faf7` with deeper ink copy
- Introduced stronger light-mode CTA gradients with dark-teal to signal-blue range
- Added service-specific text tokens:
  - `--service-text-primary`
  - `--service-text-secondary`
  - `--service-text-muted`
- Converted light-mode service cards into premium deep signal panels so existing service flows retain readable contrast

Updated `src/styles/app-service-theme.css`:

- Service text tokens now resolve from service-specific variables instead of generic page text

### Shared Tokens and Primitives

Updated:

- `src/styles/wasel-page-theme.ts`
- `src/utils/wasel-ds.ts`
- `src/styles/wasel-design-system.ts`
- `src/components/ui/buttonVariants.ts`
- `src/components/wasel-ui/WaselButton.tsx`

Results:

- Primary, secondary, success, warning, and danger colors now resolve from semantic CSS variables
- CTA text uses `--primary-foreground`
- Legacy token helpers no longer hardcode stale accent colors

### Shared Page Scaffolding

Updated:

- `src/features/shared/pageShared.tsx`
- `src/pages/shared/pageUtils.tsx`

Results:

- Removed forced dark `color-scheme`
- Moved CTA text to semantic foreground
- Replaced non-brand blue helper surfaces with theme-driven values

### Landing and Home Surfaces

Updated:

- `src/features/home/HomePage.css`
- `src/features/home/AppEntryPage.css`

Results:

- Added local theme variables instead of dark-only color literals
- Standardized panel background, shadow, and CTA behavior
- Reworked light mode to use premium light canvases with consistent CTA foreground

## Current Light Mode Spec

### Color System

- Canvas: `#f4faf7`
- Primary ink: `#10231d`
- Primary brand accent: `#0f9a79`
- Secondary signal accent: `#2e9ed8`
- CTA gradient: `linear-gradient(135deg, #08362f 0%, #0f6b58 48%, #11a184 100%)`
- Accent gradient: `linear-gradient(135deg, #0b4a40 0%, #0f9a79 38%, #2e9ed8 100%)`

### Surface System

- Shell surfaces remain bright and translucent
- Operational/service cards use deep signal panels in light mode
- Headers and shell chrome stay light and breathable

### Typography System

- Sans: `Plus Jakarta Sans`
- Display: `Space Grotesk`
- Dark ink on light surfaces
- Service text tokens reserved for dark operational panels

### Motion System

- Standard transition duration stays within `180ms` base contract
- Hover lift reserved for cards and CTA surfaces only

### Shape System

- CTA surfaces: rounded capsule / soft pill
- Panels/cards: 24px to 32px visual radius range
- Inputs: softer rounded field geometry aligned with shell chrome

## Source of Truth

### Runtime Theme

- `src/styles/brand-theme.css`
- `src/styles/app-service-theme.css`

### Semantic Token Helpers

- `src/utils/wasel-ds.ts`
- `src/styles/wasel-design-system.ts`
- `src/styles/wasel-page-theme.ts`

### Canonical UI Primitives

- `src/components/ui/*`

### Legacy Compatibility Layer

- `src/components/wasel-ui/*`

Legacy components should continue resolving through semantic CSS variables until they are migrated or removed.

## Refactor Structure Plan

### Phase A

- Keep expanding `src/components/ui/*` as the canonical primitive layer
- Route all CTA, card, and field styling through semantic CSS variables only

### Phase B

- Replace direct imports of `src/components/wasel-ui/*` with `src/components/ui/*` where feasible
- Collapse duplicate token helpers into one semantic contract

### Phase C

- Replace remaining feature-level `#fff`, `rgba(255,255,255,...)`, and hardcoded dark panel literals in service flows
- Prioritize `BusPage`, `SafetyPage`, `OfferRide*`, `TrustCenterSections`, and `ServiceFlowPlaybook`

### Phase D

- Add visual regression coverage for light and dark mode on:
  - shell
  - landing/auth
  - home
  - core service flows

## Remaining Risks

- Several large feature files still contain hardcoded white text and dark-surface literals
- Light mode is now structurally coherent, but the last mile still requires file-by-file cleanup in the legacy inline-style pages
- Until that cleanup is finished, a subset of long-tail screens may still show local visual drift
