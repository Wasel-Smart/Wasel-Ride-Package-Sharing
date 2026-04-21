# Design System Migration Guide

## Quick Start: Updating Existing Pages

This guide shows how to migrate existing pages to the new operational dashboard design system.

## Step 1: Import the Design System

Replace old imports with:

```typescript
import { DesignSystem, panel, glassPanel, button, backdrop } from '../../services/designSystem';
import { 
  PageShell, 
  PageHeader, 
  StatCard, 
  DataPanel, 
  ActionButton,
  InfoCard,
  MetricRow,
  GlassCard 
} from '../../services/pageComponents';
```

## Step 2: Replace Page Container

### Before:
```typescript
<div style={{ minHeight: '100vh', background: '#0b0b0c', padding: '20px' }}>
  <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
    {/* content */}
  </div>
</div>
```

### After:
```typescript
<PageShell maxWidth={1320} padding="24px 16px 44px">
  {/* content */}
</PageShell>
```

## Step 3: Update Page Headers

### Before:
```typescript
<div>
  <h1>My Page Title</h1>
  <p>Description text</p>
  <button onClick={handleAction}>Action</button>
</div>
```

### After:
```typescript
<PageHeader
  badge="Feature Category"
  title="My Page Title"
  description="Clear description of functionality and purpose"
  formulas={['key_metric = value × factor', 'score = weighted_sum']}
  actions={
    <>
      <ActionButton
        label="Primary Action"
        onClick={handleAction}
        variant="primary"
        icon={<Icon size={16} />}
      />
      <ActionButton
        label="Secondary"
        onClick={handleSecondary}
        variant="outline"
      />
    </>
  }
/>
```

## Step 4: Convert Stats/Metrics

### Before:
```typescript
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
  <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
    <div>Total Users</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>1,234</div>
  </div>
  {/* more stats */}
</div>
```

### After:
```typescript
<section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
  <StatCard
    label="Total Users"
    value="1,234"
    detail="Active users across all services this month"
    accent={DesignSystem.colors.cyan.base}
  />
  <StatCard
    label="Growth Rate"
    value="+18%"
    detail="Month-over-month user acquisition increase"
    accent={DesignSystem.colors.green.base}
  />
  {/* more stats */}
</section>
```

## Step 5: Update Cards/Panels

### Before:
```typescript
<div style={{ 
  background: '#1a1a1a', 
  padding: '20px', 
  borderRadius: '12px',
  border: '1px solid #333'
}}>
  <h3>Section Title</h3>
  {/* content */}
</div>
```

### After:
```typescript
<DataPanel
  title="Section Title"
  icon={<Icon size={18} color={DesignSystem.colors.cyan.base} />}
  accent={DesignSystem.colors.cyan.base}
>
  {/* content */}
</DataPanel>
```

## Step 6: Update Buttons

### Before:
```typescript
<button 
  onClick={handleClick}
  style={{
    background: '#f59e0b',
    color: '#000',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  }}
>
  Click Me
</button>
```

### After:
```typescript
<ActionButton
  label="Click Me"
  onClick={handleClick}
  variant="primary"
  icon={<Icon size={16} />}
/>
```

## Step 7: Update Form Inputs

### Before:
```typescript
<input
  type="text"
  placeholder="Enter value"
  style={{
    background: '#1a1a1a',
    border: '1px solid #333',
    padding: '10px',
    borderRadius: '8px',
    color: '#fff'
  }}
/>
```

### After:
```typescript
<input
  type="text"
  placeholder="Enter value"
  style={{
    width: '100%',
    height: 44,
    padding: '0 14px',
    borderRadius: DesignSystem.radius.md,
    border: `1px solid ${DesignSystem.colors.border.base}`,
    background: 'rgba(0, 0, 0, 0.22)',
    color: DesignSystem.colors.text.primary,
    fontSize: DesignSystem.typography.fontSize.base,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  }}
  onFocus={(e) => e.target.style.borderColor = DesignSystem.colors.cyan.border}
  onBlur={(e) => e.target.style.borderColor = DesignSystem.colors.border.base}
/>
```

## Step 8: Add Progress/Metric Bars

### Before:
```typescript
<div>
  <span>Completion: 75%</span>
  <div style={{ background: '#333', height: '8px', borderRadius: '4px' }}>
    <div style={{ background: '#f59e0b', width: '75%', height: '100%', borderRadius: '4px' }} />
  </div>
</div>
```

### After:
```typescript
<MetricRow
  label="Completion"
  value={0.75}
  color={DesignSystem.colors.cyan.base}
/>
```

## Step 9: Update Color References

Replace hardcoded colors with design system tokens:

```typescript
// Before
background: '#1a1a1a'
color: '#fff'
border: '1px solid #333'

// After
background: DesignSystem.colors.bg.secondary
color: DesignSystem.colors.text.primary
border: `1px solid ${DesignSystem.colors.border.base}`
```

## Step 10: Add Glass Effects for Overlays

### Before:
```typescript
<div style={{
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  zIndex: 100
}}>
  <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '12px' }}>
    {/* modal content */}
  </div>
</div>
```

### After:
```typescript
<div style={{
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 5, 12, 0.84)',
  backdropFilter: 'blur(8px)',
  zIndex: 100
}}>
  <GlassCard padding={30} borderRadius={20}>
    {/* modal content */}
  </GlassCard>
</div>
```

## Common Patterns

### Two-Column Layout
```typescript
<section style={{ 
  display: 'grid', 
  gap: 18, 
  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)' 
}}>
  <DataPanel title="Main Content" icon={<Icon />}>
    {/* Primary content */}
  </DataPanel>
  
  <DataPanel title="Sidebar" icon={<Icon />}>
    {/* Secondary content */}
  </DataPanel>
</section>
```

### Responsive Grid
```typescript
<section style={{ 
  display: 'grid', 
  gap: 14, 
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' 
}}>
  {items.map(item => (
    <StatCard key={item.id} {...item} />
  ))}
</section>
```

### Tab Navigation
```typescript
const [activeTab, setActiveTab] = useState('overview');

<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
  {tabs.map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{
        height: 38,
        padding: '0 18px',
        borderRadius: DesignSystem.radius.full,
        border: `1px solid ${activeTab === tab ? DesignSystem.colors.cyan.base : DesignSystem.colors.border.base}`,
        background: activeTab === tab ? DesignSystem.colors.cyan.dim : 'rgba(255,255,255,0.03)',
        color: activeTab === tab ? DesignSystem.colors.cyan.base : DesignSystem.colors.text.muted,
        cursor: 'pointer',
        fontWeight: DesignSystem.typography.fontWeight.black,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontSize: DesignSystem.typography.fontSize.xs,
        transition: 'all 0.2s ease',
      }}
    >
      {tab}
    </button>
  ))}
</div>
```

## Migration Checklist

For each page you migrate:

- [ ] Replace page container with `PageShell`
- [ ] Add `PageHeader` with badge, title, description
- [ ] Convert metrics to `StatCard` components
- [ ] Replace custom cards with `DataPanel`
- [ ] Update all buttons to `ActionButton`
- [ ] Replace hardcoded colors with design system tokens
- [ ] Add icons from lucide-react
- [ ] Update form inputs with proper styling
- [ ] Add progress bars using `MetricRow`
- [ ] Test responsive behavior
- [ ] Verify accessibility (focus states, contrast)
- [ ] Check dark mode appearance

## Priority Order

Migrate pages in this order for maximum impact:

1. **Dashboard/Home** - Most visible page
2. **Wallet** - Financial trust is critical
3. **Rides/Find Ride** - Core user flow
4. **My Trips** - Frequent user touchpoint
5. **Profile/Settings** - User management
6. **Operations/Admin** - Internal tools
7. **Legal/Static** - Lower priority

## Testing After Migration

1. **Visual Check**: Compare with reference screenshots
2. **Responsive**: Test on mobile, tablet, desktop
3. **Interactions**: Verify hover states, clicks, focus
4. **Performance**: Check for layout shifts
5. **Accessibility**: Test keyboard navigation, screen readers
6. **Dark Mode**: Ensure proper contrast and visibility

## Getting Help

- Review example implementations in:
  - `src/features/wallet/WalletDashboardEnhanced.tsx`
  - `src/features/rides/RidesPageEnhanced.tsx`
- Check design system documentation: `docs/DESIGN_SYSTEM_GUIDE.md`
- Reference design tokens: `src/services/designSystem.ts`
