# Testing

Wasel uses a three-layer testing strategy:

| Layer | Tool | Purpose | Command |
|-------|------|---------|---------|
| Unit | Vitest | Pure functions, utilities, domain logic | `npm run test:unit` |
| Integration | Vitest | Service contracts, data flow | `npm run test:unit -- tests/integration` |
| E2E | Playwright | User journeys, browser verification | `npm run test:e2e` |
| Load | k6 | Performance under load | `npm run test:load:smoke` |

## Coverage Requirements

```
Branches:  70%
Functions: 75%
Lines:     80%
Statements: 80%
```

Run with coverage: `npm run test:coverage`

## Writing Tests

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('feature: featureName', () => {
  it('handles normal case', () => {
    expect(fn('input')).toBe('output');
  });

  it('handles edge case', () => {
    expect(fn('')).toBe('');
  });

  it('throws on invalid input', () => {
    expect(() => fn(null)).toThrow();
  });
});
```

## Test File Organization

```
tests/
  unit/          # Unit tests for pure logic
  integration/   # Service integration tests
  e2e/           # Playwright browser tests
  load/          # k6 performance tests
  utils/         # Test utilities and helpers
```

## Mocking

Global mocks are in `tests/setup.ts`:
- Web Crypto API
- localStorage/sessionStorage
- requestIdleCallback

Mock services using `vi.mock()`:

```typescript
vi.mock('@/services/supabase', () => ({
  supabase: { from: vi.fn() },
}));
```
