# Wasel Component Library

## Wasel UI Components

All brand components live in `src/components/wasel-ui/` and consume the canonical design tokens from `src/utils/wasel-ds.ts`.

---

## WaselLogo

Full logo component with wordmark, symbol, and variant support.

### Variants

| Component | Purpose | Min Size |
|-----------|---------|----------|
| `WaselLogo` | Full logo with wordmark | 120px |
| `WaselMark` | Symbol only | 24px |
| `WaselHeroMark` | Large framed symbol | 200px |
| `WaselIcon` | Compact symbol | 16px |

### Usage

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

## WaselButton

Brand-compliant button with gradient and variant support.

### Variants

| Variant | Background | Text Color | Usage |
|---------|-----------|------------|-------|
| Primary | `GRAD-PRIMARY` | `#081D39` | Main CTAs |
| Secondary | `rgba(0,229,255,0.12)` | `#00E5FF` | Secondary actions |
| Ghost | transparent | `#00E5FF` | Tertiary actions |
| Gold | `GRAD-EMBER` | `#FFFFFF` | Premium features |
| Danger | `#FF7C8B` | `#FFFFFF` | Destructive actions |

### Usage

```tsx
import { WaselButton } from '@/components/wasel-ui/WaselButton';

<WaselButton variant="primary" size="lg">Book Ride</WaselButton>
<WaselButton variant="secondary" size="md">Cancel</WaselButton>
<WaselButton variant="gold" size="lg">Upgrade to Plus</WaselButton>
```

---

## WaselCard

Glass-morphism card with brand tokens.

### Variants

| Variant | Background | Border |
|---------|-----------|--------|
| Default | `rgba(8,29,57,0.78)` + blur | `rgba(0,229,255,0.16)` |
| Solid | `#0e2240` | `rgba(0,229,255,0.12)` |
| Elevated | `#132b4d` | none |
| Brand | `rgba(0,229,255,0.06)` | `rgba(0,229,255,0.2)` |

### Usage

```tsx
import { WaselCard } from '@/components/wasel-ui/WaselCard';

<WaselCard variant="default" padding="lg">
  <h3>Ride Details</h3>
  <p>Your ride is confirmed</p>
</WaselCard>
```

---

## WaselInput

Token-driven text input with brand focus states.

### Features
- 48px minimum height (WCAG AAA)
- Cyan focus ring (`rgba(0,229,255,0.4)`)
- Error state with rose border
- Label with `TYPE.caption` weight

### Usage

```tsx
import { WaselInput } from '@/components/wasel-ui/WaselInput';

<WaselInput
  label="Pickup Location"
  placeholder="Enter your location"
  error={errors.pickup}
/>
```

---

## WaselBadge

Status and category badges with brand colors.

### Variants

| Variant | Color | Usage |
|---------|-------|-------|
| Live | `#00E5FF` | Real-time status |
| AI | `#8FA6FF` | Smart features |
| New | `#72C70D` | New features |
| Hot | `#FF8A0B` | Trending |
| Custom | any | Custom status |

### Usage

```tsx
import { WaselBadge } from '@/components/wasel-ui/WaselBadge';

<WaselBadge variant="live">Live</WaselBadge>
<WaselBadge variant="hot">Trending</WaselBadge>
```

---

## WaselPagePrimitives

Page-level layout components for consistent page structure.

### Components

| Component | Purpose |
|-----------|---------|
| `PageShell` | Page wrapper with header/sidebar |
| `PageHero` | Hero section with gradient |
| `SectionCard` | Section container |
| `MetricCard` | KPI display card |
| `ActionTile` | Quick action button |
| `DataRow` | Key-value display |
| `StatusBadge` | Status indicator |

### Usage

```tsx
import { PageShell, PageHero, SectionCard, MetricCard } from '@/components/wasel-ui/WaselPagePrimitives';

<PageShell>
  <PageHero title="Dashboard" subtitle="Welcome back" />
  <SectionCard>
    <MetricCard label="Total Rides" value="1,234" trend="+12%" />
  </SectionCard>
</PageShell>
```

---

## Design Token Reference

Import from `@/utils/wasel-ds`:

```ts
import { C, F, TYPE, SPACE, R, SH, GRAD, ANIM, EASE, DUR, LS, Z } from '@/utils/wasel-ds';
```

| Export | Type | Example |
|--------|------|---------|
| `C` | Colors | `C.brandCyan`, `C.brandInk` |
| `F` | Font stacks | `F`, `FA`, `FM` |
| `TYPE` | Typography | `TYPE.h1`, `TYPE.weight.bold` |
| `SPACE` | Spacing | `SP.4`, `SP.8` |
| `R` | Radius | `R.md`, `R.xl` |
| `SH` | Shadows | `SH.card`, `SH.cyan` |
| `GRAD` | Gradients | `GRAD`, `GRAD_EMBER` |
| `ANIM` | Motion | `ANIM.dur.normal`, `ANIM.ease.spring` |
| `EASE` | Easing aliases | `EASE.default`, `EASE.spring` |
| `DUR` | Duration aliases | `DUR.fast`, `DUR.slow` |
| `LS` | Letter spacing | `LS.tight`, `LS.wide` |
| `Z` | Z-index | `Z.modal`, `Z.toast` |

---

## Accessibility Checklist

- [ ] All buttons have 48px minimum touch target
- [ ] All text has 4.5:1 contrast minimum
- [ ] Focus indicators use cyan ring
- [ ] Decorative logos have `aria-hidden="true"`
- [ ] Interactive logos have `role="img"` + `aria-label`
- [ ] `prefers-reduced-motion` is respected
- [ ] RTL layouts have proper `dir` attributes
- [ ] Form inputs have associated labels

---

## Migration Notes

### v1.0 → v2.0 Changes

| Old Token | New Token | Change |
|-----------|-----------|--------|
| `C.brandBlue` | `C.brandCyan` | Renamed for clarity |
| `C.brandOrange` | `C.brandEmber` | Renamed for clarity |
| `C.brandGreen` | `C.brandLime` | Renamed for clarity |
| `#00E5FF` | `#00E5FF` | Unified brand cyan |
| `#00E5FF` | `#00E5FF` | Unified brand cyan |
| `#66e0ff` | `#66e0ff` | Renamed to cyanLight |
| `SH.blue` | `SH.cyan` | Renamed shadow |
| `SH.blueL` | `SH.cyanL` | Renamed shadow |
| `SH.green` | `SH.lime` | Renamed shadow |
| `SH.orange` | `SH.ember` | Renamed shadow |

**Backward compatibility:** Old token names still work via aliases in `wasel-ds.ts` but will be removed in v3.0.
