# Wasel Design System - Implementation Guide

## Overview

This design system implements a sophisticated operational dashboard aesthetic inspired by command centers and network operations interfaces. The core visual language uses deep space backgrounds with cyan/teal accents, creating a premium, trustworthy, and technically advanced feel.

## Core Philosophy

1. **Operational Clarity**: Every element should communicate system state and user control
2. **Dark-First Design**: Optimized for extended viewing with reduced eye strain
3. **Accent-Driven Hierarchy**: Cyan/teal primary with blue, gold, green, and purple secondaries
4. **Glass Morphism**: Layered surfaces with blur and transparency for depth
5. **Data Visualization**: Metrics, charts, and live indicators are first-class citizens

## Color System

### Background Layers
```typescript
bg.primary: '#060c18'    // Deepest background
bg.secondary: '#0a1628'  // Card backgrounds
bg.tertiary: '#0f1a2e'   // Elevated surfaces
bg.elevated: '#141f36'   // Highest elevation
```

### Accent Colors
```typescript
cyan.base: '#19e7bb'     // Primary brand color
cyan.bright: '#dcfff8'   // Highlights
cyan.dim: 'rgba(25, 231, 187, 0.12)'  // Subtle backgrounds
cyan.glow: 'rgba(25, 231, 187, 0.24)' // Glow effects
cyan.border: 'rgba(25, 231, 187, 0.18)' // Border accents
```

### Secondary Accents
- **Blue** (`#65e1ff`): Information, navigation, secondary actions
- **Gold** (`#f8ba3e`): Warnings, premium features, highlights
- **Green** (`#a2ffe7`): Success, growth, positive metrics
- **Purple** (`#a78bfa`): Special features, AI/intelligence indicators

### Text Hierarchy
```typescript
text.primary: 'rgba(255, 255, 255, 0.96)'   // Main content
text.secondary: 'rgba(255, 255, 255, 0.76)' // Supporting text
text.muted: 'rgba(140, 172, 185, 0.72)'     // Labels, captions
text.dim: 'rgba(140, 172, 185, 0.48)'       // Disabled, placeholder
```

## Component Patterns

### Panel (Standard Container)
```typescript
import { panel } from './services/designSystem';

<div style={panel(24)}>
  {/* Content */}
</div>
```

**Features:**
- Gradient background (dark to darker)
- Subtle border with cyan tint
- Large shadow for depth
- Customizable border radius

### Glass Panel (Elevated Container)
```typescript
import { glassPanel } from './services/designSystem';

<div style={glassPanel(20)}>
  {/* Content */}
</div>
```

**Features:**
- Backdrop blur effect
- Semi-transparent background
- Inset highlight for glass effect
- Perfect for overlays and modals

### Stat Card
```typescript
<StatCard
  label="Active Rides"
  value="127"
  detail="Live rides available across major corridors"
  accent={DesignSystem.colors.cyan.base}
/>
```

**Use Cases:**
- KPI displays
- Dashboard metrics
- Real-time statistics
- Performance indicators

### Action Buttons

**Primary Button** (High emphasis)
```typescript
<ActionButton
  label="Search Rides"
  onClick={handleSearch}
  variant="primary"
  icon={<Search size={16} />}
/>
```

**Outline Button** (Medium emphasis)
```typescript
<ActionButton
  label="View History"
  onClick={handleHistory}
  variant="outline"
  icon={<Clock size={16} />}
/>
```

**Ghost Button** (Low emphasis)
```typescript
<ActionButton
  label="Cancel"
  onClick={handleCancel}
  variant="ghost"
/>
```

### Data Panel
```typescript
<DataPanel
  title="Recent Transactions"
  icon={<Wallet size={18} color={DesignSystem.colors.cyan.base} />}
>
  {/* Panel content */}
</DataPanel>
```

**Use Cases:**
- Transaction lists
- Activity feeds
- Data tables
- Grouped information

### Metric Row (Progress Indicator)
```typescript
<MetricRow
  label="Ride efficiency"
  value={0.82}
  color={DesignSystem.colors.cyan.base}
/>
```

**Features:**
- Label and percentage display
- Animated progress bar
- Color-coded by metric type

## Page Layout Structure

### Standard Page Shell
```typescript
import { PageShell, PageHeader } from './services/pageComponents';

export function MyPage() {
  return (
    <PageShell maxWidth={1320} padding="24px 16px 44px">
      <PageHeader
        badge="Feature Category"
        title="Page Title"
        description="Clear description of page purpose and functionality"
        formulas={['equation1', 'equation2']}
        actions={<>/* Action buttons */}</>}
      />
      
      {/* Stats grid */}
      <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* StatCard components */}
      </section>
      
      {/* Main content */}
      <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)' }}>
        {/* Primary content */}
        {/* Sidebar content */}
      </section>
    </PageShell>
  );
}
```

## Typography

### Font Families
- **Sans**: Inter (body text, UI elements)
- **Display**: Space Grotesk (headings, emphasis)
- **Mono**: JetBrains Mono (code, formulas, technical data)

### Font Sizes
```typescript
xs: '0.72rem'   // Labels, badges
sm: '0.84rem'   // Secondary text
base: '0.94rem' // Body text
lg: '1.06rem'   // Emphasized text
xl: '1.24rem'   // Small headings
2xl: '1.5rem'   // Medium headings
3xl: '2rem'     // Large headings
4xl: '2.75rem'  // Hero headings
```

### Font Weights
- **Normal** (400): Body text
- **Medium** (500): Subtle emphasis
- **Semibold** (600): UI labels
- **Bold** (700): Headings, buttons
- **Black** (900): Hero text, primary CTAs

## Spacing System

Use the 8px grid system:
```typescript
xs: '8px'
sm: '12px'
md: '16px'
lg: '24px'
xl: '32px'
2xl: '48px'
```

## Border Radius

```typescript
sm: '12px'   // Small elements
md: '16px'   // Buttons, inputs
lg: '20px'   // Cards
xl: '24px'   // Large panels
2xl: '28px'  // Hero sections
full: '9999px' // Pills, badges
```

## Shadows & Depth

```typescript
sm: '0 4px 12px rgba(0, 0, 0, 0.24)'   // Subtle elevation
md: '0 8px 24px rgba(0, 0, 0, 0.32)'   // Standard cards
lg: '0 12px 40px rgba(0, 0, 0, 0.46)'  // Prominent panels
glow: '0 0 24px rgba(25, 231, 187, 0.18)' // Accent glow
```

## Animation Guidelines

### Durations
- **Fast** (150ms): Hover states, simple transitions
- **Base** (250ms): Standard interactions
- **Slow** (400ms): Complex state changes

### Easing
- **Smooth**: `cubic-bezier(0.4, 0, 0.2, 1)` - Standard transitions
- **Bounce**: `cubic-bezier(0.34, 1.56, 0.64, 1)` - Playful interactions

## Accessibility

### Contrast Ratios
- Text on dark backgrounds: Minimum 7:1 (AAA)
- Interactive elements: Minimum 4.5:1 (AA)
- Accent colors tested for visibility

### Touch Targets
- Minimum 44×44px for all interactive elements
- Adequate spacing between clickable items

### Focus States
- Visible focus rings on all interactive elements
- 2px solid outline with 2px offset
- Color: Primary cyan accent

## Best Practices

### DO
✅ Use cyan as the primary accent throughout
✅ Layer panels with appropriate shadows for depth
✅ Include icons with labels for clarity
✅ Show live data with subtle animations
✅ Use glass panels for overlays and modals
✅ Maintain consistent spacing with the 8px grid
✅ Add formulas/equations for technical credibility

### DON'T
❌ Mix too many accent colors in one view
❌ Use pure white text (use rgba for softer appearance)
❌ Create flat designs without depth
❌ Overuse animations (keep them subtle)
❌ Ignore the spacing system
❌ Use small font sizes below 0.72rem

## Implementation Checklist

- [ ] Import design system: `import { DesignSystem } from './services/designSystem'`
- [ ] Use PageShell for consistent layout
- [ ] Add PageHeader with badge, title, description
- [ ] Include stat cards for key metrics
- [ ] Use appropriate button variants
- [ ] Apply glass panels for elevated content
- [ ] Add icons from lucide-react
- [ ] Test dark mode appearance
- [ ] Verify touch target sizes
- [ ] Check focus states
- [ ] Validate color contrast

## Examples

See the following files for complete implementations:
- `src/features/wallet/WalletDashboardEnhanced.tsx`
- `src/features/rides/RidesPageEnhanced.tsx`
- `src/features/operations/MobilityOSPage.tsx`

## Support

For questions or design system updates, refer to:
- Design tokens: `src/services/designSystem.ts`
- Page components: `src/services/pageComponents.ts`
- Global styles: `src/styles/globals.css`
