# Find a Ride — Developer Quick Reference

Quick reference for maintaining design consistency in Find a Ride.

---

## 🎨 Design Tokens (Import from Landing Page)

```typescript
// Color palette
import { LANDING_COLORS } from '../home/LandingSections';

LANDING_COLORS.text      // Primary text
LANDING_COLORS.muted     // Secondary text
LANDING_COLORS.soft      // Tertiary text
LANDING_COLORS.cyan      // Primary accent (#5EF6D8)
LANDING_COLORS.gold      // Secondary accent (#19E7BB)
LANDING_COLORS.green     // Success (#A7FFE9)
LANDING_COLORS.border    // Border color
```

```typescript
// Typography
import { LANDING_FONT, LANDING_DISPLAY } from '../home/LandingSections';

LANDING_FONT     // Body text: Plus Jakarta Sans, Cairo, Tajawal
LANDING_DISPLAY  // Headings: Space Grotesk, Plus Jakarta Sans
```

```typescript
// Gradients & Shadows
import { GRAD_HERO, GRAD_AURORA, GRAD_SIGNAL, SH } from '../../utils/wasel-ds';

GRAD_HERO    // Background base layer
GRAD_AURORA  // Background aurora overlay
GRAD_SIGNAL  // Primary button gradient
SH.cyanL     // Primary button shadow
```

---

## 🔲 Component Patterns

### Panel/Card
```typescript
const panel = (radius = 28): React.CSSProperties => ({
  borderRadius: radius,
  background: 'var(--wasel-panel-strong)',
  border: `1px solid ${LANDING_COLORS.border}`,
  boxShadow: 'var(--wasel-shadow-lg)',
  backdropFilter: 'blur(22px)',
});

// Usage:
<div style={panel(24)}>Content</div>
```

### Primary Button
```typescript
<button
  style={{
    height: 54,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.08)',
    background: GRAD_SIGNAL,
    color: '#041521',
    fontWeight: 900,
    fontSize: '0.95rem',
    boxShadow: SH.cyanL,
  }}
>
  Button Text
</button>
```

### Input Field
```typescript
<input
  style={{
    width: '100%',
    height: 52,
    padding: '0 16px 0 48px', // 48px for icon
    borderRadius: 16,
    border: `2px solid ${LANDING_COLORS.border}`,
    background: 'rgba(255,255,255,0.04)',
    color: LANDING_COLORS.text,
    fontSize: '1rem',
    fontWeight: 600,
    outline: 'none',
  }}
/>
```

### Badge/Pill
```typescript
<div
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 999,
    background: `${LANDING_COLORS.cyan}10`,
    border: `1px solid ${LANDING_COLORS.cyan}18`,
    fontSize: '0.76rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: LANDING_COLORS.cyan,
  }}
>
  Badge Text
</div>
```

---

## 📏 Spacing Scale

Use these values for consistent spacing:

```typescript
4px   // Tiny gap
8px   // Small gap
12px  // Medium gap
16px  // Standard gap
20px  // Large gap
24px  // XL gap
32px  // Section gap
48px  // Major section gap
```

---

## 🎭 Animation Guidelines

### Page Load
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
```

### Staggered List
```typescript
{items.map((item, i) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: i * 0.05 }}
  >
))}
```

### Exit Animation
```typescript
<AnimatePresence>
  {show && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
  )}
</AnimatePresence>
```

---

## 🎨 Color Usage Guide

| Element | Color Token | Hex |
|---------|-------------|-----|
| Heading | `LANDING_COLORS.text` | var(--wasel-copy-primary) |
| Body text | `LANDING_COLORS.text` | var(--wasel-copy-primary) |
| Subtext | `LANDING_COLORS.muted` | var(--wasel-copy-muted) |
| From location | `LANDING_COLORS.cyan` | #5EF6D8 |
| To location | `LANDING_COLORS.gold` | #19E7BB |
| Success | `LANDING_COLORS.green` | #A7FFE9 |
| Border | `LANDING_COLORS.border` | var(--border) |

---

## 📐 Typography Scale

```typescript
// Headings
h1: 'clamp(2.2rem, 4vw, 3.8rem)'  // Hero headline
h2: 'clamp(1.45rem, 3vw, 2rem)'   // Section title
h3: '1.15rem'                      // Card title

// Body
body: '1rem'                       // Standard text
bodySmall: '0.92rem'               // Secondary text
caption: '0.76rem'                 // Labels, metadata
tiny: '0.66rem'                    // Fine print

// Weights
regular: 400
medium: 500
semibold: 600
bold: 700
black: 800
ultra: 900
```

---

## 🔍 Common Patterns

### Icon + Text
```typescript
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <MapPin size={16} color={LANDING_COLORS.cyan} />
  <span>Text</span>
</div>
```

### Vertical Route Indicator
```typescript
<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
  <MapPin size={16} color={LANDING_COLORS.cyan} />
  <div style={{
    width: 2,
    height: 24,
    background: `linear-gradient(180deg, ${LANDING_COLORS.cyan}, ${LANDING_COLORS.gold})`,
    margin: '0 7px'
  }} />
  <MapPin size={16} color={LANDING_COLORS.gold} />
</div>
```

### Gradient Text
```typescript
<h1 style={{
  background: GRAD_SIGNAL,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}>
  Gradient Headline
</h1>
```

---

## ⚠️ Don'ts

- ❌ Don't create new color values
- ❌ Don't use custom fonts
- ❌ Don't use custom spacing values
- ❌ Don't create new shadow values
- ❌ Don't use custom border radius values
- ❌ Don't import from `waselBrandTokens.ts` (deprecated)

---

## ✅ Do's

- ✅ Import from Landing Page design system
- ✅ Use existing color tokens
- ✅ Use existing spacing scale
- ✅ Use existing typography scale
- ✅ Follow existing component patterns
- ✅ Maintain visual consistency

---

## 🐛 Debugging Checklist

If something looks off:

1. Check color token — is it from `LANDING_COLORS`?
2. Check font — is it `LANDING_FONT` or `LANDING_DISPLAY`?
3. Check spacing — is it from the 4/8/12/16/20/24/32/48 scale?
4. Check border radius — is it 16/18/22/24/28/999?
5. Compare with Landing Page — does it match?

---

## 📚 Reference Files

- **Design Tokens**: `src/features/home/LandingSections.tsx`
- **Gradients**: `src/utils/wasel-ds.ts`
- **Implementation**: `src/features/rides/FindRidePage.tsx`
- **Documentation**: `docs/FIND_RIDE_RESTORATION_COMPLETE.md`

---

**Remember:** When in doubt, check the Landing Page. It's the source of truth. ✨
