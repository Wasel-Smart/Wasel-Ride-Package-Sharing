# WASEL PATTERN LIBRARY

**Version**: 2.0  
**Last Updated**: January 2025  
**Status**: Production Standard

---

## OVERVIEW

This document defines the **standard patterns** for building components in the Wasel application. All new code MUST follow these patterns.

---

## PATTERN 1: COMPONENT ARCHITECTURE

### Container/Presentational Pattern

**ALWAYS separate logic from presentation.**

#### Container Component (Logic)

```typescript
// features/rides/FindRidePage.tsx
import { FindRideView } from './components/FindRideView';
import { useFindRideController } from './hooks/useFindRideController';

export function FindRidePage() {
  const controller = useFindRideController();
  return <FindRideView {...controller} />;
}
```

#### Presentational Component (UI)

```typescript
// features/rides/components/FindRideView.tsx
import { tokens } from '@/design-system';

interface FindRideViewProps {
  rides: Ride[];
  loading: boolean;
  onSearch: (params: SearchParams) => void;
}

export function FindRideView({ rides, loading, onSearch }: FindRideViewProps) {
  return <div style={{ padding: tokens.spacing[6] }}>{/* UI */}</div>;
}
```

---

## PATTERN 2: STYLING

### ALWAYS Use Design Tokens

```typescript
import { tokens } from '@/design-system';

// ✅ GOOD
<div style={{
  padding: tokens.spacing[4],
  color: tokens.colors.text.primary,
  borderRadius: tokens.borderRadius.lg,
}}>

// ❌ BAD
<div style={{ padding: '16px', color: '#EFF6FF' }}>
```

---

## PATTERN 3: STATE MANAGEMENT

### Local State (Simple)
```typescript
const [isOpen, setIsOpen] = useState(false);
```

### Custom Hook (Complex)
```typescript
const { state, actions } = useFeatureController();
```

### Context (Global)
```typescript
const { user } = useAuth();
```

---

## ANTI-PATTERNS TO AVOID

### ❌ God Components
```typescript
// BAD: 500+ lines, mixed concerns
export function OfferRidePage() {
  // ... 50 state variables
  // ... 100 lines of effects
  // ... 300 lines of JSX
}
```

### ❌ Inline Styles with Magic Numbers
```typescript
// BAD
<div style={{ padding: '18px', marginTop: 22 }}>
```

---

## CHECKLIST FOR NEW COMPONENTS

- [ ] Follows container/presentational pattern
- [ ] Uses design tokens (no magic numbers)
- [ ] Has proper TypeScript types
- [ ] Includes error boundary
- [ ] Has loading/error/empty states
- [ ] Implements proper accessibility
- [ ] Uses memoization where appropriate
- [ ] Has unit tests

---

**Pattern Library Version**: 2.0  
**Status**: Production Standard ✅
