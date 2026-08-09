# Wasel Frontend Deep Review

**Date:** 2026-08-08  
**Scope:** `src/features/home/*`, `src/wasel-routes.tsx`, `src/platform/event-broker.ts`, `src/locales/translations.ts`, `src/contexts/*`, `src/services/core.ts`, `vite.config.ts`

---

## Overall Frontend Score: 6.8 / 10

**Breakdown:**
- UI/UX Quality: 7.5/10 — Strong visual design and layout, but accessibility and consistency gaps.
- Performance: 5.5/10 — Bundle sizes are heavy, multiple concurrent polling loops, and an unconditionally-running canvas animation.
- Internationalization: 6.0/10 — Translation coverage is broad, but many home-page strings are hardcoded and two translation systems coexist.
- Routing/Navigation: 7.5/10 — Solid route consolidation and lazy loading, but legacy alias maintenance burden and a dead `isInsideIframe` flag.
- State Management: 6.5/10 — Context-based architecture works, but dual auth contexts and scattered polling create data-flow complexity.

---

## 1. UI/UX Quality

### Strengths
- Responsive grid system with clear breakpoints (`760px`, `980px`, `1100px`, `560px`) in `src/features/home/sections/HomePageStyles.tsx:524-617`.
- Strong visual hierarchy: hero section, proof pills, quick actions, corridors, trust pages.
- Dark theme with consistent token usage via `wasel-ds`.
- RTL/LTR direction switching is applied at the shell level.

### Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `src/features/home/HomePage.tsx` | 289-363 | Cookie banner lacks focus trap and Escape-key dismissal. Screen-reader users can tab out into the page behind the modal. | **High** |
| `src/features/home/HomePage.tsx` | 366-399 | Sticky mobile CTA buttons have no `type="button"`; inside a form they could trigger submit. | Medium |
| `src/features/home/sections/HomeHeroSection.tsx` | 128-146 | `TripModeCard` buttons use `aria-pressed` but the parent `role="group"` label comes from `t()` which may not be available in all contexts. | Low |
| `src/features/home/MobilityOSLandingMap.tsx` | 936-946 | Canvas element has no accessible fallback content or `aria-label`. Screen readers get nothing. | **High** |
| `src/features/home/HomePage.tsx` | 285 | Root shell applies `dir={dir}` but some inline SVGs and icons don't respect RTL mirroring. | Low |
| `src/features/home/sections/ConversionSections.tsx` | 509-669 | `OutcomesSection` is exported but **never used** in `HomePage.tsx`. Dead code in bundle. | Low |
| `src/features/home/sections/HomePageStyles.tsx` | 66-86 | `.wasel-home-sticky-cta` is `display: none` by default and shown via media query; no `prefers-reduced-motion` guard for sticky positioning. | Low |

---

## 2. Performance

### Bundle Sizes (Build Output)
| Chunk | Size | Concern |
|-------|------|---------|
| `index-*.js` | **350 KB** | Main entry; likely contains shared code + initial route |
| `data-layer-*.js` | **243 KB** | Supabase + TanStack Query; heavy for initial load |
| `react-core-*.js` | **230 KB** | React + ReactDOM + ReactRouter |
| `maps-*.js` | **147 KB** | Leaflet map library |
| `motion-*.js` | **124 KB** | Framer Motion |
| `ui-primitives-*.js` | **120 KB** | Radix + Lucide + Sonner |
| `HomePage-*.js` | **68 KB** | Home page chunk |

### Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `src/features/home/MobilityOSLandingMap.tsx` | 284-763 | `requestAnimationFrame` loop runs **unconditionally** even when the component is off-screen. No `IntersectionObserver` to pause rendering. | **High** |
| `src/platform/event-broker.ts` | 192 | `POLL_INTERVAL_MS = 5_000` — Supabase-backed broker polls every 5s in addition to Realtime subscription. This doubles DB load. | **High** |
| `src/services/liveDataService.ts` | 143 | `REFRESH_INTERVAL_MS = 45_000` for platform stats; fine, but combined with other polls creates 3+ concurrent timers on home page. | Medium |
| `src/services/core.ts` | 284 | `startAvailabilityPolling` defaults to 60s health probe; runs even when tab is hidden. | Medium |
| `src/services/liveDataService.ts` | 78-111 | `useLiveUserStats` `load` callback depends on `localUser` object reference, causing it to be recreated on every `LocalAuth` update and triggering re-fetch. | Medium |
| `vite.config.ts` | 30-68 | `manualChunks` groups `framer-motion` into its own chunk (`motion`), but `HomePage` imports motion directly; consider code-splitting motion for non-critical sections. | Low |
| `src/features/home/MobilityOSLandingMap.tsx` | 747 | `requestAnimationFrame(render)` is called recursively without any cancelation path when the component unmounts during the frame. | Medium |

---

## 3. Internationalization

### Strengths
- `translations.ts` is large (5,441 lines) with EN/AR coverage for most app features.
- `LanguageContext` provides `t()` with dot-notation and interpolation.
- `tx()` utility exists for non-React contexts.

### Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `src/features/home/sections/HomeHeroSection.tsx` | 38-92 | `heroProof`, `heroProofAr`, `liveTimeline`, `liveTimelineAr` arrays contain **hardcoded English/Arabic strings** instead of translation keys. | **High** |
| `src/features/home/sections/ConversionSections.tsx` | 29-181 | `proofMetrics`, `proofMetricsAr`, `onboardingSteps`, `onboardingStepsAr`, `outcomeCards`, `outcomeCardsAr`, `trustLinks`, `trustLinksAr` are all **hardcoded**. | **High** |
| `src/features/home/sections/CorridorBetaFocusSection.tsx` | 12-81 | `stageLabel`, `corridorReason`, `corridorNextAction` use **hardcoded bilingual strings** instead of `t()` lookups. | **High** |
| `src/features/home/sections/CorridorsSection.tsx` | 21-27 | Section header and CTA text are hardcoded (`'Corridors ready now'`, `'Browse rides'`, `'Open this corridor'`). | Medium |
| `src/features/home/sections/UtilitySections.tsx` | 36-221 | `SignedInUtilitySection` and `SignedOutCtaSection` contain **hardcoded bilingual strings** for all labels, CTAs, and descriptions. | **High** |
| `src/features/home/MobilityOSLandingMap.tsx` | 814-825 | `'Fallback focus'`, `'Live corridor focus'`, `'Jordan network'` are **hardcoded** despite `tx()` being imported. | Medium |
| `src/features/home/HomePageShared.tsx` | 385-600 | `TrustScoreCard` factor labels and status messages are **hardcoded** (`'Base profile'`, `'Email confirmation'`, etc.). | Medium |
| `src/features/home/HomePage.tsx` | 462-598 | `StatsStrip`, `HowItWorksSection`, `TestimonialsSection`, `FinalCtaBanner` are **100% hardcoded**. | **High** |
| `src/features/home/sections/QuickActionsSection.tsx` | 54 | `'Open this flow'` is hardcoded. | Low |
| `src/features/home/HomePage.tsx` | 155-213 | `quickActions` uses `t('homeSections.*')` which exists, but the surrounding component structure mixes `t()` and hardcoded strings inconsistently. | Medium |
| `src/locales/translations.ts` | 1550-1580 | `homeSections` keys exist but **do not cover** all strings used in `QuickActionsSection` (e.g., `outcome` text). | Low |

**Systemic Issue:** Two translation systems coexist — `useLanguage().t()` (context-based) and `tx()` (global). Home sections predominantly use inline `ar ? '...' : '...'` ternaries instead of either system, making translations impossible to extract and maintain.

---

## 4. Routing/Navigation

### Strengths
- `createBrowserRouter` with lazy-loaded routes and Suspense boundaries.
- `ScrollToTop` resets scroll on navigation.
- Comprehensive legacy alias redirects (`LEGACY_APP_ALIASES`) for backward compatibility.
- `ProtectedOutlet` guards private routes with optional permission checks.

### Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `src/hooks/useIframeSafeNavigate.ts` | 85-87 | `isInsideIframe()` **always returns `false`**. If this was intended for iframe embedding, it is non-functional dead code. | **High** |
| `src/wasel-routes.tsx` | 74-110 | `LEGACY_APP_ALIASES` contains 37 paths. Every new route must be added here manually or legacy links break silently. | Medium |
| `src/wasel-routes.tsx` | 244-273 | B2B routes (`/services/corporate`, `/services/school`, `/innovation-hub`, `/analytics`, `/ai-intelligence`, `/moderation`) all lazy-load the **same component** `OperationsOverviewPage`. This is likely a placeholder but creates confusing navigation. | Medium |
| `src/router/ProtectedOutlet.tsx` | 32-48 | Permission guard checks `userHasPermission(user.role, requiredPermission)` but `requiredPermission` is never passed in `wasel-routes.tsx`. The guard is effectively disabled. | Medium |
| `src/wasel-routes.tsx` | 302 | Catch-all `*` route returns `NotFound` **inside** `/app` children AND at the root level. The root `*` catch-all duplicates the inner one. | Low |
| `src/features/home/HomePage.tsx` | 166, 177, 188, 199, 210 | Quick action paths like `/find-ride`, `/offer-ride` are **hardcoded strings**. If route structure changes, these break without type safety. | Low |

---

## 5. State Management

### Strengths
- `AuthContext` and `LocalAuth` provide clean separation between Supabase auth and app-level user state.
- `eventBroker` singleton abstracts in-memory vs. Supabase-backed transport.
- `core.ts` `subscribeAvailability` provides reactive backend health state.

### Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `src/contexts/AuthContext.tsx` + `src/contexts/LocalAuth.tsx` | Multiple | **Dual auth contexts** create a split-brain risk. `LocalAuth` mirrors `AuthContext` but with its own `useRef` optimistic patches and localStorage persistence. A desync can occur if `AuthContext` updates but `LocalAuth` effect hasn't run yet. | **High** |
| `src/platform/event-broker.ts` | 192, 291-294 | Polling at **5s** is aggressive for a Realtime-backed system. The realtime channel should be the primary delivery mechanism; poll should be a much slower fallback (e.g., 30s). | **High** |
| `src/platform/event-broker.ts` | 210-238 | `publish` falls back from proxy to direct Supabase on **first failure**, never retrying the proxy. A transient proxy error permanently degrades performance. | Medium |
| `src/services/core.ts` | 282-303 | `startAvailabilityPolling` is called at module load (`warmUpServer().catch(...)` at line 305), meaning health probes start immediately and run forever, even on pages that don't need them. | Medium |
| `src/services/liveDataService.ts` | 78-111 | `useLiveUserStats` fetches wallet API on every `localUser` change without deduplication; rapid auth state changes can fire parallel requests. | Medium |
| `src/contexts/LanguageContext.tsx` | 36-58 | `setLanguage` writes to `localStorage` synchronously inside a state setter, which can block render if storage is slow (e.g., Safari private mode). | Low |
| `src/platform/event-broker.ts` | 443 | `eventBroker` is a module-level singleton. In development with HMR, multiple brokers can accumulate if the module is re-evaluated. | Low |

---

## 6. Additional Findings

### Accessibility
- `SkipToContent` component exists (`src/components/SkipToContent.tsx`) and is used in `WaselRoot.tsx:88`.
- Focus-visible outline is defined in `WaselRoot.tsx:94`.
- **Missing:** Home page (`HomePage.tsx`) does **not** include `SkipToContent` because it renders outside `WaselRoot` via `AppEntryPage` → `HomePage`. Landing-page keyboard users have no skip link.
- **Missing:** No `lang` attribute on the home page root element (it relies on `document.documentElement.lang` set by `LanguageContext`, but this is a side effect, not a component contract).

### Conversion Design
- Strong CTA placement (sticky mobile CTA, hero buttons, final CTA banner).
- Social proof is present (testimonials, stats strip, proof metrics).
- **Gap:** No A/B test hooks or variant system visible in the codebase.

### Maintenance
- `src/features/home/sections/ConversionSections.tsx` exports `OutcomesSection` which is **not imported** anywhere (`HomePage.tsx` does not use it). Dead code.
- `src/features/home/HomePageSections.tsx` is a pure re-export barrel; useful but adds indirection.
- `src/features/home/sections/index.ts` re-exports everything, making it hard to tree-shake unused sections.

---

## Recommendations (Priority Order)

1. **Add IntersectionObserver to MobilityOSLandingMap** to pause the rAF loop when off-screen. (`MobilityOSLandingMap.tsx:284`)
2. **Reduce event-broker poll interval** from 5s to 30s and add exponential backoff. (`event-broker.ts:192`)
3. **Migrate all hardcoded home-page strings** to `translations.ts` keys. Start with `HomeHeroSection`, `ConversionSections`, `UtilitySections`, and `HomePage.tsx` inline sections.
4. **Add focus trap** to the cookie banner and Escape-key dismissal. (`HomePage.tsx:289`)
5. **Add accessible fallback** to `MobilityOSLandingMap` canvas (e.g., `role="img"` + `aria-label`). (`MobilityOSLandingMap.tsx:936`)
6. **Reconcile dual auth contexts** — either eliminate `LocalAuth` and fold its logic into `AuthContext`, or clearly document the boundary and add a sync guard.
7. **Remove dead `isInsideIframe`** or implement it properly. (`useIframeSafeNavigate.ts:85`)
8. **Enable permission guards** on routes that need them by passing `require` to `ProtectedOutlet` in `wasel-routes.tsx`.
9. **Remove unused `OutcomesSection`** or wire it into the home page. (`ConversionSections.tsx:508`)
10. **Consolidate translation utilities** — choose `t()` or `tx()` as the standard for components and remove the other to prevent drift.
