# Find Ride Module — Quick Start Guide

## 🚀 For Developers

### Module Location
```
/src/modules/rides/
```

### Usage Example

```typescript
// 1. Import the hook
import { useRideSearch } from '../../modules/rides/ride.hooks';

// 2. Initialize with optional state
const { state, setFrom, setTo, search } = useRideSearch({
  from: 'Amman',
  to: 'Aqaba',
  searched: false,
});

// 3. Use in your component
<RideSearchForm
  from={state.from}
  to={state.to}
  onFromChange={setFrom}
  onToChange={setTo}
  onSearch={search}
/>

// 4. Display results
<RideResults
  results={state.results}
  onSelectRide={handleSelectRide}
/>
```

---

## 📦 Module Exports

### Types
```typescript
import type {
  RideDriver,
  RideSearchParams,
  RideResult,
  RideBookingPayload,
  RideSearchState,
} from '@/modules/rides';
```

### Service
```typescript
import { rideService } from '@/modules/rides';

// Search for rides
const results = await rideService.searchRides({
  from: 'Amman',
  to: 'Aqaba',
  date: '2024-01-15',
  seats: 2,
});

// Get single ride
const ride = await rideService.getRideById('ride-123');
```

### Hook
```typescript
import { useRideSearch } from '@/modules/rides';

const {
  state,        // Current state
  setFrom,      // Update origin
  setTo,        // Update destination
  setDate,      // Update date
  setTime,      // Update time mode
  search,       // Execute search
  clearError,   // Clear error state
} = useRideSearch();
```

### Components
```typescript
import {
  RideSearchForm,
  RideCard,
  RideResults,
} from '@/modules/rides';
```

---

## 🎨 Design System

### Import Tokens
```typescript
import { C, F } from '@/styles/wasel-design-system';
```

### Available Tokens
```typescript
// Colors
C.card          // Card background
C.border        // Border color
C.text          // Primary text
C.textMuted     // Secondary text
C.cyan          // Primary accent
C.green         // Success
C.gold          // Warning
C.error         // Error

// Typography
F               // Font family
```

### Usage Example
```typescript
<div
  style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: 24,
    color: C.text,
    fontFamily: F,
  }}
>
  Content
</div>
```

---

## 🔧 Common Patterns

### 1. Search Flow
```typescript
// Initialize
const { state, setFrom, setTo, search } = useRideSearch();

// Update search params
setFrom('Amman');
setTo('Aqaba');

// Execute search
await search();

// Access results
console.log(state.results);
```

### 2. Booking Flow
```typescript
import { createRideBooking } from '@/services/rideLifecycle';

const handleBook = async (ride: RideResult) => {
  const booking = await createRideBooking({
    rideId: ride.id,
    passengerId: user.id,
    from: ride.from,
    to: ride.to,
    date: ride.date,
    time: ride.time,
    seatsRequested: 1,
    pricePerSeatJod: ride.pricePerSeat,
  });
  
  console.log('Booking created:', booking);
};
```

### 3. Error Handling
```typescript
const { state, search, clearError } = useRideSearch();

// Check for errors
if (state.error) {
  console.error('Search error:', state.error);
  
  // Clear error
  clearError();
}
```

---

## 🧪 Testing

### Unit Tests
```typescript
import { rideService } from '@/modules/rides';

describe('rideService', () => {
  it('should search rides', async () => {
    const results = await rideService.searchRides({
      from: 'Amman',
      to: 'Aqaba',
    });
    
    expect(results).toBeInstanceOf(Array);
  });
});
```

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { RideSearchForm } from '@/modules/rides';

test('renders search form', () => {
  render(
    <RideSearchForm
      from="Amman"
      to="Aqaba"
      cities={['Amman', 'Aqaba']}
      onSearch={() => {}}
    />
  );
  
  expect(screen.getByText('Search Rides')).toBeInTheDocument();
});
```

---

## 📝 Best Practices

### ✅ DO
- Use the `useRideSearch` hook for state management
- Import design tokens from `wasel-design-system`
- Keep business logic in `ride.service.ts`
- Use TypeScript types from `ride.types.ts`
- Follow the same pattern as Trips/Bus modules

### ❌ DON'T
- Put business logic in components
- Use custom colors outside design system
- Make direct API calls from UI
- Duplicate code from other modules
- Skip error handling

---

## 🔍 Debugging

### Check State
```typescript
const { state } = useRideSearch();

console.log('Current state:', {
  from: state.from,
  to: state.to,
  loading: state.loading,
  searched: state.searched,
  results: state.results.length,
  error: state.error,
});
```

### Monitor API Calls
```typescript
// Service layer logs all API calls
// Check browser console for:
// - Request parameters
// - Response data
// - Error messages
```

### Inspect Design Tokens
```typescript
import { C } from '@/styles/wasel-design-system';

console.log('Design tokens:', {
  card: C.card,
  border: C.border,
  text: C.text,
  cyan: C.cyan,
});
```

---

## 🚦 Common Issues

### Issue: Search not working
**Solution:** Check that `from` and `to` are different cities
```typescript
if (state.error === 'Choose different cities') {
  // User selected same city for origin and destination
}
```

### Issue: Results not displaying
**Solution:** Ensure `searched` is true
```typescript
if (!state.searched) {
  // Search hasn't been executed yet
  await search();
}
```

### Issue: Booking fails
**Solution:** Check user authentication
```typescript
if (!user) {
  navigate('/app/auth');
  return;
}
```

---

## 📚 Related Documentation

- **Full Documentation:** `/docs/FIND_RIDE_REFACTOR_COMPLETE.md`
- **Executive Summary:** `/docs/FIND_RIDE_REFACTOR_SUMMARY.md`
- **Design System:** `/src/styles/wasel-design-system.ts`
- **Trips Service:** `/src/services/trips.ts` (reference pattern)
- **Bus Service:** `/src/services/bus.ts` (reference pattern)

---

## 🤝 Contributing

### Adding New Features
1. Add types to `ride.types.ts`
2. Add service methods to `ride.service.ts`
3. Update hook in `ride.hooks.ts` if needed
4. Create UI components in `components/`
5. Update documentation

### Modifying Existing Features
1. Check if change affects types
2. Update service layer if needed
3. Update hook if state changes
4. Update UI components
5. Test thoroughly

---

## 💬 Support

For questions or issues:
1. Check this guide
2. Review full documentation
3. Compare with Trips/Bus modules
4. Check design system tokens
5. Ask the team

---

**Happy coding! 🚀**
