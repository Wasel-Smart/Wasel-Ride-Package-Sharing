# Find a Ride - Redesign Implementation Plan

**Priority**: P0 - Critical  
**Timeline**: 2 sprints (4 weeks)  
**Goal**: Increase booking completion rate from 65% to 85%+

---

## Sprint 1: Foundation & Critical Fixes (Week 1-2)

### Week 1: Information Architecture & Accessibility

#### Day 1-2: Restructure Page Layout
**File**: `src/features/rides/FindRidePage.tsx`

```typescript
// NEW STRUCTURE
export function FindRidePage() {
  return (
    <Protected>
      <PageShell>
        {/* 1. Compact Header - 60px */}
        <CompactPageHeader />
        
        {/* 2. Search Form - Above fold, 200px */}
        <SearchFormSection
          from={from}
          to={to}
          date={date}
          onSearch={handleSearch}
        />
        
        {/* 3. Results - Primary content */}
        <ResultsSection
          results={results}
          loading={loading}
          onOpenRide={handleOpenRide}
        />
        
        {/* 4. Context - Collapsed by default */}
        <Collapsible>
          <RouteIntelligencePanel />
          <RecentSearchesPanel />
        </Collapsible>
        
        {/* 5. Detail Modal */}
        <RideDetailModal
          ride={selected}
          onBook={handleBook}
          onClose={() => setSelected(null)}
        />
      </PageShell>
    </Protected>
  );
}
```

**Changes**:
- Remove `FindRideHero` (move to marketing page)
- Remove `ServiceFlowPlaybook` (move to help center)
- Simplify to 4 main sections
- Search form is first interactive element

#### Day 3-4: Accessibility Fixes
**Files**: All component files

**1. Add ARIA Labels**
```typescript
// Search Form
<form
  role="search"
  aria-label="Search for rides"
  onSubmit={handleSearch}
>
  <label htmlFor="from-city">From</label>
  <select
    id="from-city"
    aria-label="Departure city"
    value={from}
    onChange={(e) => setFrom(e.target.value)}
  >
    {/* options */}
  </select>
  
  <label htmlFor="to-city">To</label>
  <select
    id="to-city"
    aria-label="Destination city"
    value={to}
    onChange={(e) => setTo(e.target.value)}
  >
    {/* options */}
  </select>
  
  <button
    type="submit"
    aria-label="Search for rides"
    aria-busy={loading}
  >
    {loading ? 'Searching...' : 'Search rides'}
  </button>
</form>
```

**2. Fix Contrast Issues**
```typescript
// Replace low-contrast colors
// OLD: color: 'rgba(214,238,255,0.78)'
// NEW: color: '#1e293b' (dark mode: '#f1f5f9')

const ACCESSIBLE_COLORS = {
  text: {
    primary: '#0f172a',      // 16:1 contrast on white
    secondary: '#475569',    // 7:1 contrast on white
    tertiary: '#64748b',     // 4.5:1 contrast on white
  },
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },
  interactive: {
    primary: '#0f766e',      // Teal 700
    hover: '#0d9488',        // Teal 600
    active: '#14b8a6',       // Teal 500
  },
};
```

**3. Keyboard Navigation**
```typescript
// Add focus trap to modal
import { FocusTrap } from '@radix-ui/react-focus-scope';

function RideDetailModal({ ride, onClose }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    // Focus close button when modal opens
    closeButtonRef.current?.focus();
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  return (
    <FocusTrap>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close ride details"
        >
          ×
        </button>
        {/* modal content */}
      </div>
    </FocusTrap>
  );
}
```

**4. Screen Reader Announcements**
```typescript
// Add live regions for dynamic content
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {loading && 'Searching for rides...'}
  {results.length > 0 && `Found ${results.length} rides`}
  {searchError && searchError}
</div>
```

#### Day 5: Mobile-First Search Form
**File**: `src/features/rides/components/SearchForm.tsx`

```typescript
export function SearchForm({ from, to, date, onSearch, loading }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      style={{
        display: 'grid',
        gap: '16px',
        padding: '20px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* From City */}
      <div>
        <label
          htmlFor="from-city"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '8px',
          }}
        >
          From
        </label>
        <select
          id="from-city"
          value={from}
          onChange={(e) => onSetFrom(e.target.value)}
          style={{
            width: '100%',
            height: '56px', // Touch-friendly
            padding: '0 16px',
            fontSize: '16px', // Prevents zoom on iOS
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            background: '#ffffff',
          }}
        >
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      
      {/* To City */}
      <div>
        <label
          htmlFor="to-city"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '8px',
          }}
        >
          To
        </label>
        <select
          id="to-city"
          value={to}
          onChange={(e) => onSetTo(e.target.value)}
          style={{
            width: '100%',
            height: '56px',
            padding: '0 16px',
            fontSize: '16px',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            background: '#ffffff',
          }}
        >
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      
      {/* Date (Optional) */}
      <div>
        <label
          htmlFor="travel-date"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '8px',
          }}
        >
          Date <span style={{ color: '#94a3b8' }}>(optional)</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="travel-date"
            type="date"
            value={date}
            onChange={(e) => onSetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              height: '56px',
              padding: '0 16px',
              fontSize: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              background: '#ffffff',
            }}
          />
          {date && (
            <button
              type="button"
              onClick={() => onSetDate('')}
              aria-label="Clear date"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* Quick Routes */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Quick routes
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {QUICK_ROUTES.map((route) => (
            <button
              key={`${route.from}-${route.to}`}
              type="button"
              onClick={() => {
                onSetFrom(route.from);
                onSetTo(route.to);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                border: '2px solid #e2e8f0',
                borderRadius: '999px',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              {route.from} → {route.to}
            </button>
          ))}
        </div>
      </div>
      
      {/* Search Button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          height: '56px',
          fontSize: '16px',
          fontWeight: 700,
          border: 'none',
          borderRadius: '12px',
          background: loading ? '#94a3b8' : '#0f766e',
          color: '#ffffff',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {loading ? 'Searching...' : 'Search rides'}
      </button>
    </form>
  );
}

const QUICK_ROUTES = [
  { from: 'Amman', to: 'Aqaba' },
  { from: 'Amman', to: 'Irbid' },
  { from: 'Irbid', to: 'Amman' },
];
```

### Week 2: Simplified Components & Performance

#### Day 6-7: Simplified Ride Card
**File**: `src/features/rides/components/SimplifiedRideCard.tsx`

```typescript
export function SimplifiedRideCard({ ride, onOpen, booked, pending }) {
  const soldOut = ride.seatsAvailable <= 0;
  
  return (
    <article
      onClick={onOpen}
      style={{
        display: 'grid',
        gap: '16px',
        padding: '20px',
        background: '#ffffff',
        border: '2px solid #e2e8f0',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#0f766e';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Driver & Price */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            {ride.driver.avatar}
          </div>
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {ride.driver.name}
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              ⭐ {ride.driver.rating} • {ride.driver.trips} trips
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#0f766e',
              lineHeight: 1,
            }}
          >
            {ride.pricePerSeat}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            JOD
          </div>
        </div>
      </div>
      
      {/* Route */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '12px',
          alignItems: 'center',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {ride.from}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {ride.time}
          </div>
        </div>
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#0f766e',
            }}
          />
          <div
            style={{
              width: '2px',
              height: '24px',
              background: 'linear-gradient(180deg, #0f766e, #14b8a6)',
            }}
          />
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#14b8a6',
            }}
          />
          <div
            style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 600,
            }}
          >
            {ride.duration}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {ride.to}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {ride.distance} km
          </div>
        </div>
      </div>
      
      {/* Amenities & Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '999px',
              background: soldOut ? '#fef3c7' : '#d1fae5',
              color: soldOut ? '#92400e' : '#065f46',
            }}
          >
            {soldOut ? 'Sold out' : `${ride.seatsAvailable} seats`}
          </span>
          <span
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '999px',
              background: '#f1f5f9',
              color: '#475569',
            }}
          >
            {ride.genderPref === 'mixed' ? '👥 Mixed' : ride.genderPref === 'female' ? '👩 Women' : '👨 Men'}
          </span>
          {ride.prayerStops && (
            <span
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '999px',
                background: '#f1f5f9',
                color: '#475569',
              }}
            >
              🕌 Prayer
            </span>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          disabled={booked || pending || soldOut}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 700,
            border: 'none',
            borderRadius: '999px',
            background: booked
              ? '#10b981'
              : pending
                ? '#f59e0b'
                : soldOut
                  ? '#e2e8f0'
                  : '#0f766e',
            color: soldOut ? '#94a3b8' : '#ffffff',
            cursor: booked || pending || soldOut ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {booked ? 'Booked' : pending ? 'Pending' : soldOut ? 'Full' : 'View details'}
        </button>
      </div>
    </article>
  );
}
```

#### Day 8-9: Performance Optimization

**1. Memoize Expensive Computations**
```typescript
// FindRidePage.tsx
const filteredResults = useMemo(() => {
  if (!searched) return allAvailableRides.slice(0, 4);
  
  return allAvailableRides
    .filter((ride) => {
      if (from && !routeMatchesLocationPair(ride.from, ride.to, from, ride.to)) {
        return false;
      }
      if (to && !routeMatchesLocationPair(ride.from, ride.to, ride.from, to)) {
        return false;
      }
      if (date && ride.date !== date) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'price':
          return a.pricePerSeat - b.pricePerSeat;
        case 'time':
          return a.time.localeCompare(b.time);
        case 'rating':
          return b.driver.rating - a.driver.rating;
        default:
          return 0;
      }
    });
}, [allAvailableRides, searched, from, to, date, sort]);
```

**2. Lazy Load Components**
```typescript
// Lazy load heavy components
const RideDetailModal = lazy(() => import('./components/RideDetailModal'));
const RouteIntelligencePanel = lazy(() => import('./components/RouteIntelligencePanel'));

// Use Suspense
<Suspense fallback={<LoadingSpinner />}>
  {selected && (
    <RideDetailModal
      ride={selected}
      onClose={() => setSelected(null)}
    />
  )}
</Suspense>
```

**3. Reduce Animation Complexity**
```typescript
// Remove aurora animations
// Keep only essential animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  variants={prefersReducedMotion ? {} : cardVariants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.3 }}
>
  {/* content */}
</motion.div>
```

#### Day 10: Testing

**1. Add Unit Tests**
```typescript
// SimplifiedRideCard.test.tsx
describe('SimplifiedRideCard', () => {
  it('renders driver info correctly', () => {
    const ride = createMockRide();
    render(<SimplifiedRideCard ride={ride} onOpen={vi.fn()} />);
    
    expect(screen.getByText(ride.driver.name)).toBeInTheDocument();
    expect(screen.getByText(`⭐ ${ride.driver.rating}`)).toBeInTheDocument();
  });
  
  it('shows sold out state when no seats available', () => {
    const ride = createMockRide({ seatsAvailable: 0 });
    render(<SimplifiedRideCard ride={ride} onOpen={vi.fn()} />);
    
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full/i })).toBeDisabled();
  });
  
  it('calls onOpen when card is clicked', () => {
    const ride = createMockRide();
    const onOpen = vi.fn();
    render(<SimplifiedRideCard ride={ride} onOpen={onOpen} />);
    
    fireEvent.click(screen.getByRole('article'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
```

**2. Add Accessibility Tests**
```typescript
// SearchForm.test.tsx
import { axe } from 'jest-axe';

describe('SearchForm Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <SearchForm
        from="Amman"
        to="Aqaba"
        date=""
        onSearch={vi.fn()}
        loading={false}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('has proper labels for all inputs', () => {
    render(<SearchForm {...props} />);
    
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
  });
});
```

---

## Sprint 2: Polish & Advanced Features (Week 3-4)

### Week 3: Booking Flow & Error Handling

#### Day 11-12: Multi-Step Booking Wizard
**File**: `src/features/rides/components/BookingWizard.tsx`

```typescript
type BookingStep = 'review' | 'payment' | 'confirmation';

export function BookingWizard({ ride, onClose, onComplete }) {
  const [step, setStep] = useState<BookingStep>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  return (
    <div role="dialog" aria-labelledby="booking-title">
      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['Review', 'Payment', 'Confirmation'].map((label, index) => (
          <div
            key={label}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background:
                index === 0 && step === 'review'
                  ? '#0f766e'
                  : index === 1 && step === 'payment'
                    ? '#0f766e'
                    : index === 2 && step === 'confirmation'
                      ? '#0f766e'
                      : '#e2e8f0',
            }}
          />
        ))}
      </div>
      
      {/* Step Content */}
      {step === 'review' && (
        <ReviewStep
          ride={ride}
          onNext={() => setStep('payment')}
          onCancel={onClose}
        />
      )}
      
      {step === 'payment' && (
        <PaymentStep
          ride={ride}
          onNext={() => setStep('confirmation')}
          onBack={() => setStep('review')}
          loading={loading}
          error={error}
        />
      )}
      
      {step === 'confirmation' && (
        <ConfirmationStep
          ride={ride}
          onClose={onComplete}
        />
      )}
    </div>
  );
}
```

#### Day 13-14: Error Handling & Recovery

```typescript
// Enhanced error handling
function handleBookingError(error: Error) {
  if (error.message.includes('sold out')) {
    return {
      title: 'Ride is full',
      message: 'This ride just filled up. Try the bus or another departure.',
      actions: [
        { label: 'View bus options', onClick: () => nav('/app/bus') },
        { label: 'Search again', onClick: () => setSearched(false) },
      ],
    };
  }
  
  if (error.message.includes('network')) {
    return {
      title: 'Connection issue',
      message: 'Check your internet and try again.',
      actions: [
        { label: 'Retry', onClick: () => handleBook(ride) },
        { label: 'Cancel', onClick: () => setSelected(null) },
      ],
    };
  }
  
  return {
    title: 'Booking failed',
    message: 'Something went wrong. Please try again.',
    actions: [
      { label: 'Try again', onClick: () => handleBook(ride) },
      { label: 'Contact support', onClick: () => nav('/app/support') },
    ],
  };
}
```

### Week 4: Final Polish & Launch

#### Day 15-16: Visual Polish
- Refine spacing and typography
- Ensure consistent border radius
- Optimize color palette
- Add subtle hover states

#### Day 17-18: Performance Audit
- Run Lighthouse audit (target: 90+)
- Optimize images and fonts
- Implement code splitting
- Add service worker caching

#### Day 19-20: User Testing & Iteration
- Conduct usability testing with 5-10 users
- Gather feedback on new design
- Make final adjustments
- Prepare for launch

---

## Success Criteria

### Metrics to Track
- [ ] Accessibility score: 95+ (Lighthouse)
- [ ] Performance score: 90+ (Lighthouse)
- [ ] Mobile usability: 100 (Google Search Console)
- [ ] Task completion rate: 85%+
- [ ] Time to first booking: <2 minutes
- [ ] Bounce rate: <25%

### Code Quality
- [ ] All components <300 lines
- [ ] Test coverage: 80%+
- [ ] Zero accessibility violations (axe)
- [ ] Bundle size: <200KB per chunk

### User Feedback
- [ ] 90%+ users find search form easily
- [ ] 85%+ users understand booking flow
- [ ] 95%+ users can complete booking without help

---

## Rollout Plan

### Phase 1: Internal Testing (Week 5)
- Deploy to staging
- Internal team testing
- Fix critical bugs

### Phase 2: Beta Testing (Week 6)
- 10% of users see new design
- Monitor metrics closely
- Gather user feedback

### Phase 3: Full Rollout (Week 7)
- 100% of users see new design
- Monitor for issues
- Iterate based on feedback

---

## Rollback Plan

If metrics decline:
1. Immediately rollback to old design
2. Analyze what went wrong
3. Fix issues in staging
4. Re-test before next rollout

---

**Owner**: Frontend Team  
**Stakeholders**: Product, Design, Engineering  
**Review Date**: End of Sprint 2
