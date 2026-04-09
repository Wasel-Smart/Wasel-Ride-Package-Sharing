# Wasel Mobile-First Product Strategy
**Senior Mobile Product, UX & System Design Lead — Full Audit & Roadmap**
*Prepared: April 2026 | Version 1.0*

---

## Executive Summary

Wasel is architecturally sophisticated and technically impressive — but it is fundamentally a **web-first product wearing mobile clothes**. The bottom navigation exists, RTL is declared, the map is feature-rich, and the MobilityOS canvas is stunning — but every structural, layout, and interaction decision was made through a desktop lens. The map controls require a mouse. The MobilityOS panel assumes a 1,200px canvas. The EnhancedWaselMap stacks detail panels below the map the way a desktop sidebar would. The bottom nav is `display: none` on desktop but has no companion gesture, sheet, or native interaction model for mobile.

This document defines the complete shift to mobile-first: vision, architecture, principles, map strategy, MobilityOS integration, technology direction, and a prioritized execution roadmap.

---

## 1. Mobile-First Product Vision

### 1.1 The Core Shift

Stop thinking of the mobile experience as a responsive version of the web app. Wasel on mobile is a **live mobility companion** — a tool someone opens while standing at a pickup point, while a driver is en route, while a package is moving through Jordan. Every interaction is happening one-handed, in sunlight, often on a slow connection, with divided attention.

The product vision for mobile Wasel:

> **"The most trusted, fastest, and most beautiful way for people in Jordan to move themselves and their goods — always in your pocket, always live, always clear."**

### 1.2 What This Means in Practice

| Web-first thinking | Mobile-first thinking |
|---|---|
| Show everything, let user scroll | Show one thing, let user go deeper |
| Map is a feature inside a page | Map IS the primary screen |
| Navigation is a sidebar or top bar | Navigation is a thumb-reachable bottom rail |
| Forms are full-page with many fields | Forms are step-by-step sheets that rise from the bottom |
| Data panels live beside the map | Data panels float over the map as dismissible cards |
| MobilityOS is a full dashboard | MobilityOS is a live pulse chip and a swipeable summary card |
| Offline is an error state | Offline is a first-class mode with queued actions |

### 1.3 Mobile Product Pillars

1. **Live-first** — The app should feel alive. Driver locations pulse. Seat counts update. The MobilityOS network breathes. Nothing is static.
2. **One thumb, one goal** — Every primary action must be reachable with the right thumb in the bottom 60% of the screen.
3. **Speed above all** — First Contentful Paint under 1.5s. Interactive under 2.5s. No spinner between common actions.
4. **Jordan-native** — Arabic RTL is not a mode. It is the primary language for most users. Dates, numbers, and text must feel local.
5. **Trust through clarity** — The map, the driver, the price, the ETA — show them clearly. Ambiguity is the enemy of trust.

---

## 2. Recommended Mobile Information Architecture

### 2.1 Bottom Navigation Rail (5 tabs — current structure is correct, execution needs work)

```
[ 🔍 Find ]  [ 🕐 Trips ]  [ 📦 Packages ]  [ 💳 Wallet ]  [ 👤 Profile ]
```

**Current issues with `MobileBottomNav.tsx`:**
- Icon size at 20px is too small (should be 24px minimum)
- Active indicator is a 2px top line — invisible in sunlight; needs filled icon + background pill
- No haptic feedback model (no `touchstart` handler)
- 58px min-height is acceptable but should be `env(safe-area-inset-bottom)` aware (already done — keep)
- The `motion/react` scale-down on tap is correct — extend the spring values

**Redesigned active state:**
- Active tab: filled icon + label + semi-transparent pill background behind icon
- Inactive tab: outlined icon + label in muted color, no background
- Transition: 150ms spring, icon scale 1.0 → 1.15 on press

### 2.2 Primary Screen Hierarchy

```
HOME / FIND RIDE
└── Map (full screen hero)
    ├── Search sheet (slides up from bottom, 40% height)
    ├── Trip card sheet (slides up when trip selected, 50% height)
    ├── Live driver card (floating, dismissible, bottom-left)
    └── MobilityOS pulse chip (floating, top-right, tappable)

MY TRIPS
├── Active trip (top card, live tracking map embedded)
├── Upcoming (scrollable list)
└── Past (scrollable list, paginated)

PACKAGES
├── Track (scan QR or enter code)
├── Send (step-by-step bottom sheet flow)
└── My packages (status cards)

WALLET
├── Balance (large display, top)
├── Quick actions (Pay, Add money, Transfer)
└── Transaction history

PROFILE
├── Trust score + verification
├── Settings
└── Driver mode toggle
```

### 2.3 Screen Stack Model

All secondary flows should use **bottom sheets**, not full-screen pushes. Full-screen navigation should be reserved only for:
1. Authentication flows
2. Camera/QR scanner
3. Full-screen map (already implemented)
4. Document upload

Everything else — trip details, payment confirmation, driver profile, route alternatives, package details — lives in a **half-sheet or three-quarter sheet** that can be dismissed with a swipe down.

### 2.4 MobilityOS in the Mobile IA

The current MobilityOS lives at `/app/mobility-os` as a standalone dashboard. On mobile, this is the wrong model. MobilityOS should be:

1. **A live pulse chip** on the map screen (top-right) — shows network status, top corridor pressure, active vehicles count
2. **A swipeable MobilityOS card** accessible from the Find Ride screen — a compressed version of the canvas
3. **A full-screen mode** behind a tap on the pulse chip — the full canvas experience, optimized for portrait orientation

---

## 3. Mobile UX/UI Design Principles

### 3.1 Touch Targets

| Element | Minimum size | Current status |
|---|---|---|
| Primary CTA button | 52px height, full-width | Inconsistent |
| Bottom nav items | 58px × (1/5 screen width) | ✅ Correct |
| Map control buttons | 44×44px | ⚠️ 40×40px — increase |
| List items | 64px height minimum | Needs audit |
| Input fields | 52px height | Needs audit |

### 3.2 Sheet-Based Navigation (the most important change)

Replace page pushes with `vaul` sheets (already in your dependencies). Every secondary screen should animate up from the bottom. This means:

```typescript
// WRONG — full page navigation
navigate('/app/trip/123')

// RIGHT — bottom sheet
<Drawer.Root>
  <Drawer.Trigger />
  <Drawer.Portal>
    <Drawer.Content> {/* TripDetailSheet */} </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

`vaul` is already in `package.json`. Use it everywhere for secondary content.

### 3.3 Gesture Model

| Gesture | Action |
|---|---|
| Swipe down on sheet | Dismiss |
| Swipe up on collapsed sheet | Expand |
| Long-press on map | Drop custom pin / set pickup |
| Pinch on map | Zoom (Leaflet handles this) |
| Swipe left on trip card | Quick cancel |
| Pull to refresh on lists | Refresh |
| Double-tap map | Zoom in |

### 3.4 Typography for Mobile

Current: `Plus Jakarta Sans` / `Cairo` / `Tajawal` — correct choices.

Mobile-specific adjustments:
- Body text: **16px minimum** (currently some labels are 10–12px — too small)
- Caption text: **13px minimum** on mobile
- Arabic text: use `Tajawal` at **17px** body — Arabic at 16px reads smaller than Latin at 16px
- Line-height: **1.6** for body, **1.3** for headings

### 3.5 Color Hierarchy on Mobile

The current dark palette (`#081b2b` bg, `#16C7F2` cyan, `#C7FF1A` gold) is excellent for a mobility product. For mobile, enforce:

- **Primary action**: Cyan gradient button, full-width, 52px height
- **Secondary action**: Ghost button with cyan border
- **Destructive**: Red, always require confirmation sheet
- **Status indicators**: Green (live/online), Gold (pending), Red (error), Cyan (info)
- **Map overlays**: Semi-transparent dark panels with `backdrop-filter: blur(16px)` — already done, keep

### 3.6 Loading States

Replace all spinners with:
1. **Skeleton screens** for lists and cards
2. **Progressive disclosure** — show what you have, update as more arrives
3. **Optimistic UI** — show the action result immediately, revert on failure

The `offlineQueue.ts` you have makes optimistic UI safe. Use it.

### 3.7 Error States

Every error on mobile must have:
1. A clear, human explanation (in Arabic AND English)
2. A single recovery action
3. Never show raw error codes or stack traces

---

## 4. Mobility OS Mobile Integration

### 4.1 Current State (Web-First)

`MobilityOSCore.tsx` is 900+ lines of a canvas-based network visualization designed at `BASE_W: 1200, BASE_H: 700`. On a 390px-wide phone screen, this renders at roughly 30% of its intended size, making city labels unreadable, route lines 1px thin, and vehicle dots invisible.

The control panels (hero section, time-of-day slider, analytics bands, corridor ranking) are all in a desktop grid layout that collapses awkwardly on mobile.

### 4.2 Recommended Mobile MobilityOS Architecture

**Layer 1: Pulse Chip (always visible on map screen)**
```
┌─────────────────┐
│ 🟢 84 vehicles  │
│ Amman ⟶ Zarqa  │
│ 67% utilization │
└─────────────────┘
```
- Fixed position, top-right of the map
- 3 lines of live data, updates every 5 seconds
- Tap opens Layer 2

**Layer 2: MobilityOS Summary Sheet (three-quarter height)**
- Portrait-optimized canvas at full phone width, 280px height
- 3 key metrics in a horizontal scroll row (not a grid)
- City selector as a horizontal chip scroll, not a button grid
- Time-of-day slider, full width
- Top 3 corridors as swipeable cards
- "View Full Dashboard" button at bottom

**Layer 3: MobilityOS Full Screen (on-demand)**
- Landscape orientation hint shown (Wasel works best in landscape for this view)
- Full canvas, fills screen
- All controls in a collapsible bottom panel
- Pinch to zoom on the canvas (add touch handler)

### 4.3 Canvas Responsive Fixes

The canvas `resizeCanvas` function already uses `ResizeObserver` — that's correct. The missing piece:

```typescript
// In MobilityOSCore.tsx - add mobile-specific rendering adjustments
const isMobile = width < 600;

// Scale down label font sizes
ctx.font = `${isMobile ? 600 : 700} ${isMobile ? '8px' : '10px'} ${F}`;

// Scale up city dot sizes for touch
const cityRadius = isMobile
  ? (selected ? 12 : city.isHub ? 9 : 7)
  : (selected ? 9 : city.isHub ? 7 : 5.5);

// Make city dots tappable (add touch event handler to canvas)
canvas.addEventListener('touchend', (e) => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.changedTouches[0];
  const x = (touch.clientX - rect.left) * dpr;
  const y = (touch.clientY - rect.top) * dpr;
  // Hit-test against city positions
});
```

### 4.4 Time-of-Day Slider on Mobile

The current `<input type="range">` needs mobile-specific styling:
- Height: 44px touch target minimum
- Thumb size: 24×24px minimum
- Track height: 6px minimum
- Add hour label that follows the thumb

---

## 5. Outstanding Mobile Map Experience Strategy

### 5.1 Map as Hero Screen

The map must fill the entire screen on mobile — not be contained in a card, not have a header above it, not have padding around it. The entire phone IS the map.

**Target layout:**
```
┌──────────────────────────┐
│  [MobilityOS chip]  [⋮]  │ ← 44px floating bar, top
│                          │
│                          │
│       MAP FILLS          │
│       100% SCREEN        │
│                          │
│                          │
├──────────────────────────┤
│  [Search sheet handle]   │ ← 20px drag handle
│  Where to?               │ ← Search input, 52px
│  [Amman] [Aqaba] [Irbid] │ ← Recent/popular chips
└──────────────────────────┘
```

### 5.2 Map Control Repositioning for Mobile

Current map controls are positioned top-right (correct for desktop, wrong for mobile one-handed use). Mobile-optimized control positions:

| Control | Desktop position | Mobile position |
|---|---|---|
| Zoom in/out | Top-right | Bottom-right, above bottom sheet |
| Map type switcher | Top-right panel | Bottom sheet, secondary tab |
| Locate me | Bottom-center | Bottom-right FAB |
| Mosque/Radar toggles | Bottom-center | Map settings sheet |
| Fullscreen | Top-right | Remove on mobile (already full-screen) |
| Live HUD | Top-left | Top-left but smaller: 2 lines max |

### 5.3 Bottom Sheet Search Flow

```
State 1: Collapsed (20% height)
  - Drag handle + "Where to?" input
  
State 2: Expanded search (50% height)
  - From / To inputs
  - Date/time picker
  - Recent trips
  - Popular routes chips (Amman, Aqaba, Irbid, Zarqa)
  
State 3: Results (70% height)
  - Trip cards in scrollable list
  - Map updates to show route behind the sheet
  - Each card: driver avatar, car, price, seats, ETA, WhatsApp button
```

### 5.4 Live Trip Tracking Screen

When a booking is active, the map screen transforms:

```
┌──────────────────────────┐
│                          │
│   MAP with driver dot    │
│   pulsing animation      │
│   route line shown       │
│                          │
├──────────────────────────┤
│ 🟢 Driver is 4 mins away │
│ Ahmed • ⭐ 4.9 • JO 123  │
│ [📞 Call]  [💬 WhatsApp] │
│                          │
│ Pickup: [address]        │
│ ETA: 14:32               │
└──────────────────────────┘
```

The driver dot should have:
- Pulsing ring animation (already in SVG.live)
- Rotation to match heading direction
- Smooth position interpolation (lerp, not snap)
- Car icon that rotates toward destination

### 5.5 Map Performance on Mobile

Current map uses Leaflet with CartoDB dark tiles — correct choice (no API key, fast CDN). For mobile optimization:

1. **Tile caching via Service Worker** — cache visited tiles so the map works offline for common routes
2. **Vector tiles** — consider switching to `protomaps` for smaller tile sizes (50-80% smaller than raster)
3. **Reduce marker count on zoom-out** — cluster mosques at zoom < 12, hide radars at zoom < 10
4. **Lazy-load Overpass API** — only fetch mosque data when zoom ≥ 13
5. **Reduce layer count** — on mobile, default to `roadmap` only; let user opt into satellite

### 5.6 Prayer Time Integration

For the Jordan market, add a prayer time indicator to the map that:
- Shows a subtle banner 5 minutes before prayer time
- Driver cards show "Prayer stop needed" if trip overlaps Maghrib
- Planned stops at mosques on long routes (Desert Highway, King's Highway)

---

## 6. Technology & Architecture Direction

### 6.1 Current Stack Assessment

| Technology | Current | Assessment | Recommendation |
|---|---|---|---|
| Framework | React 18 + Vite | ✅ Correct | Keep |
| Routing | React Router 7 | ✅ Modern | Keep |
| Map | Leaflet + OSM | ✅ Cost-free | Keep + optimize |
| Animations | Motion/React | ✅ Excellent | Keep |
| Bottom sheets | vaul (installed, unused) | ⚠️ Not wired | **Wire immediately** |
| State | TanStack Query v5 | ✅ Excellent | Keep |
| UI primitives | Radix UI | ✅ Accessible | Keep |
| Payments | Stripe | ✅ | Keep, add CliQ |
| Push notifications | Web Notifications API + SW | ⚠️ Firebase removed | Needs decision |
| Offline | offlineQueue.ts | ✅ Just improved | Wire into all flows |

### 6.2 Missing Mobile Technologies to Add

**1. `@capacitor/core` (Ionic Capacitor)**
Wrap the web app in a native shell for iOS/Android distribution without rewriting.
- Access to native GPS, camera, haptics, push notifications
- App Store + Google Play distribution
- `navigator.geolocation` already used — Capacitor improves accuracy
- Estimated effort: 1-2 weeks to wrap, 1-2 weeks to test

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

Key Capacitor plugins to add:
- `@capacitor/haptics` — vibration feedback on bookings, errors
- `@capacitor/push-notifications` — replace Web Notifications
- `@capacitor/geolocation` — higher accuracy than browser API
- `@capacitor/camera` — for package photos, profile pictures
- `@capacitor/share` — native share sheet for trips
- `@capacitor/local-notifications` — trip reminders

**2. `react-spring` or enhanced `motion/react` gesture handling**
- Swipe-to-dismiss on cards
- Drag-to-expand on bottom sheets
- Already using motion/react — extend with `useDrag` from `@use-gesture/react`

```bash
npm install @use-gesture/react
```

**3. PWA manifest enhancement**

Current `public/sw.js` exists but may not be fully configured. Add:
```json
{
  "name": "Wasel | واصل",
  "short_name": "واصل",
  "start_url": "/app/find-ride",
  "display": "standalone",
  "background_color": "#061726",
  "theme_color": "#16C7F2",
  "orientation": "portrait",
  "icons": [...]
}
```

**4. `workbox` for intelligent tile and asset caching**
```bash
npm install workbox-precaching workbox-routing workbox-strategies
```

Cache strategy:
- App shell: Cache-first
- API responses: Network-first with 5-minute cache
- Map tiles: Cache-first with background update
- User data: Network-only (no stale booking data)

### 6.3 Map Technology Decision

For the 6-month horizon, stay with **Leaflet + CartoDB** (current). It works, it's free, it's good.

For the 12-month horizon, evaluate **MapLibre GL JS**:
- Vector tiles (faster on mobile)
- Smooth 60fps zoom/pan (GPU-rendered)
- Better RTL label support
- Custom styling (Wasel-branded map style)
- Same price point (free with self-hosted tiles or MapTiler)

Migration path: `WaselMap.tsx` is already well-abstracted with a `props` API. Swapping the renderer underneath is a 2-week project.

### 6.4 MobilityOS Canvas on Mobile

The current canvas at `BASE_W: 1200, BASE_H: 700` renders poorly on mobile. Two options:

**Option A (quick, 1 week): Responsive canvas**
- Reduce `BASE_W` / `BASE_H` dynamically based on `window.innerWidth`
- Scale up city dot sizes, font sizes, and line widths on small screens
- Add touch event handler for city selection
- Simplify: hide corridor labels below zoom threshold

**Option B (better, 3 weeks): Mobile-specific canvas render pass**
- Add `isMobile: boolean` prop
- When true: simplified rendering (fewer stars, fewer decorative layers, larger labels)
- Portrait-optimized aspect ratio (1:1.4 instead of 1.42:1)
- Bottom-anchored city names instead of floating labels

Recommend **Option A first, Option B in Sprint 2**.

---

## 7. Actionable Redesign Roadmap

### Sprint 1 (Week 1-2): Foundation — "Make it feel native"

**Priority: CRITICAL**

1. **Wire `vaul` sheets everywhere**
   - Replace `navigate('/app/trip/:id')` with `<Drawer>` sheet
   - Replace `navigate('/app/packages/:id')` with sheet
   - Trip detail, driver profile, booking confirmation → all sheets
   - Estimated: 3 days

2. **Increase all touch targets to 44px minimum**
   - Map control buttons: 40px → 44px
   - Bottom nav already at 58px ✅
   - List items: add `min-height: 64px`
   - Form inputs: add `min-height: 52px`
   - Estimated: 1 day

3. **Redesign active state in `MobileBottomNav`**
   - Filled icon + semi-transparent pill background
   - Remove the 2px top line (invisible in sunlight)
   - Add `navigator.vibrate(10)` on tab tap
   - Estimated: 1 day

4. **Fix the 10-12px micro-label font sizes**
   - Audit all `fontSize: '10px'`, `'11px'`, `'12px'` in mobile views
   - Minimum 13px for captions, 16px for body
   - Estimated: 1 day

5. **Add swipe-to-dismiss to map POI panel**
   - The `selectedPOI` panel currently has an X button only
   - Add swipe-down gesture with `@use-gesture/react`
   - Estimated: 0.5 days

---

### Sprint 2 (Week 3-4): Map as Hero — "The map IS the app"

**Priority: HIGH**

1. **Full-screen map as the landing screen**
   - Remove any container padding/margin around the map on mobile
   - Map fills `100dvh` with bottom sheet floating over it
   - Status bar area: transparent with dark content
   - Estimated: 2 days

2. **Build the search bottom sheet**
   - `State 1 (collapsed)` → `State 2 (search open)` → `State 3 (results)`
   - Use `vaul` with `snapPoints={[0.2, 0.5, 0.75]}`
   - Popular routes as horizontal chip scroll
   - Estimated: 3 days

3. **Reposition map controls for mobile**
   - Zoom buttons: bottom-right, above bottom sheet
   - Locate me: FAB, bottom-right
   - Layer controls: move to map settings sheet
   - Remove fullscreen button on mobile (redundant)
   - Estimated: 1 day

4. **Live trip tracking screen**
   - Active booking: map + driver card (fixed, bottom 30%)
   - Driver dot with heading rotation and lerp animation
   - WhatsApp + Call in the card
   - Estimated: 3 days

5. **MobilityOS pulse chip**
   - Build the floating chip (top-right of map screen)
   - 3 lines: vehicle count, top corridor, utilization %
   - Animated pulse ring when data updates
   - Estimated: 1 day

---

### Sprint 3 (Week 5-6): MobilityOS Mobile — "The network in your pocket"

**Priority: HIGH**

1. **Portrait-optimized MobilityOS canvas**
   - Responsive `BASE_W`/`BASE_H` based on screen size
   - Increase font sizes and dot sizes on mobile
   - Touch handler for city selection on canvas
   - Estimated: 3 days

2. **MobilityOS summary sheet**
   - Triggered by tapping the pulse chip
   - 3/4 height sheet with compressed canvas + key metrics
   - Horizontal chip scroll for city selection
   - Swipeable corridor cards
   - Estimated: 3 days

3. **MobilityOS full-screen mode**
   - Tap "View full" → full-screen canvas
   - Landscape hint overlay
   - Pinch-to-zoom on canvas
   - Estimated: 2 days

---

### Sprint 4 (Week 7-8): Offline & Performance — "Works anywhere"

**Priority: HIGH**

1. **Wire `offlineQueue` into all booking flows**
   - Already improved in `rideLifecycle.ts` ✅
   - Add offline indicator banner using `NetworkStatusIndicator.tsx`
   - Show "Syncing..." badge on pending bookings
   - Estimated: 2 days

2. **Map tile caching via Service Worker**
   - Cache the last 5 visited route tiles
   - Show cached tiles when offline with a subtle "Offline mode" chip
   - Estimated: 2 days

3. **Skeleton screens for all lists**
   - Replace loading spinners with skeleton cards in Trips, Packages
   - Estimated: 2 days

4. **Web Vitals enforcement**
   - The `webVitalsReporter.ts` is now wired ✅
   - Add `<Suspense>` boundaries around all lazy routes
   - Audit and fix any LCP > 2.5s screens
   - Estimated: 2 days

5. **Image optimization**
   - Driver avatars: WebP with fallback (use `ImageWithFallback.tsx` ✅)
   - Add `loading="lazy"` to all below-fold images
   - Estimated: 1 day

---

### Sprint 5 (Week 9-10): Capacitor Wrapping — "Native app"

**Priority: MEDIUM (required for App Store)**

1. **Capacitor integration**
   - `npm install @capacitor/core @capacitor/cli`
   - `npx cap init` → `npx cap add ios` → `npx cap add android`
   - Test on real devices
   - Estimated: 3 days

2. **Native haptic feedback**
   - Booking confirmed: `Haptics.impact({ style: ImpactStyle.Medium })`
   - Error: `Haptics.notification({ type: NotificationType.Error })`
   - Tab tap: `Haptics.impact({ style: ImpactStyle.Light })`
   - Estimated: 1 day

3. **Native push notifications**
   - Replace Web Notifications API
   - Booking status updates, driver approaching, package picked up
   - Estimated: 2 days

4. **Native share sheet**
   - "Share trip" → native iOS/Android share
   - Estimated: 0.5 days

5. **App Store metadata**
   - Screenshots, description, Arabic + English
   - Estimated: 2 days

---

### Sprint 6 (Week 11-12): Polish & Arabic Excellence — "World-class"

**Priority: MEDIUM**

1. **Arabic UX stress test**
   - Run the new RTL Playwright tests ✅
   - Manual test on real Android device with Arabic locale
   - Fix any number formatting issues (use `Intl.NumberFormat('ar-JO')`)
   - Test all bottom sheets in RTL (sheet handle, swipe direction)
   - Estimated: 3 days

2. **Wasel design system token audit**
   - Enforce minimum touch target tokens
   - Add `--wasel-touch-sm: 44px`, `--wasel-touch-md: 52px`, `--wasel-touch-lg: 64px`
   - Remove all inline `fontSize: '10px'` — replace with design tokens
   - Estimated: 2 days

3. **Prayer time integration**
   - API: `aladhan.com/prayer-times` (free, no key)
   - Map banner + driver card indicator
   - Estimated: 2 days

4. **Onboarding flow**
   - 3-screen onboarding for new users (skip-able)
   - Explains rides, packages, bus — in Arabic and English
   - Permission requests: Location, Notifications
   - Estimated: 2 days

---

## Score Impact Summary

| Improvement | Score contribution |
|---|---|
| Bottom sheet navigation (Sprint 1) | Architecture: +0.3 |
| Touch target fixes (Sprint 1) | UX/Accessibility: +0.2 |
| Map as hero screen (Sprint 2) | Product quality: +0.3 |
| Live trip tracking (Sprint 2) | Core feature: +0.2 |
| MobilityOS mobile (Sprint 3) | Differentiation: +0.2 |
| Offline resilience (Sprint 4) | Reliability: +0.2 |
| Capacitor native (Sprint 5) | Platform: +0.2 |
| Arabic excellence (Sprint 6) | Market fit: +0.2 |
| **Total** | **+1.8 → score: 10.3 (capped at 10)** |

---

## Key Files to Create / Modify

### New files to create:
- `src/components/sheets/TripDetailSheet.tsx`
- `src/components/sheets/BookingConfirmSheet.tsx`
- `src/components/sheets/SearchSheet.tsx`
- `src/components/sheets/RouteAlternativesSheet.tsx`
- `src/components/map/MobilityOSPulseChip.tsx`
- `src/components/map/MobilityOSSummarySheet.tsx`
- `src/components/map/LiveDriverCard.tsx`
- `src/hooks/usePrayerTimes.ts`
- `src/hooks/useHaptics.ts`
- `capacitor.config.ts`

### Files to modify:
- `src/components/WaselMap.tsx` — reposition controls, increase touch targets
- `src/features/mobility-os/MobilityOSCore.tsx` — responsive canvas + touch
- `src/components/MobileBottomNav.tsx` — redesign active state, add haptics
- `src/pages/*.tsx` — replace page navigations with sheet openings
- `src/index.css` — enforce mobile typography minimums
- `src/tokens/*.ts` — add touch target tokens

---

## Final Note

Wasel has every technical ingredient of a world-class mobile product. The design system is solid. The map is feature-rich. The offline queue works. The analytics are real. The MobilityOS is genuinely impressive and unique in the MENA market.

What's missing is **the mobile experience wrapping those ingredients**. The difference between an 8.5 and a 9.5 is not more features — it is the feeling of using the app. It should feel instant, feel alive, feel like it was built for the phone from day one.

Execute Sprints 1 and 2. The product will feel like a different app.

---

*Document prepared by: Senior Mobile Product, UX & System Design Lead*
*Codebase reviewed: Wdoubleme — Wasel v5.0 Enhanced Engagement Edition*
*Next review: End of Sprint 2*
