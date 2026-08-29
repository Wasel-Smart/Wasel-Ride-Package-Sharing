# Wasel Mobile — Testing Guide

## Overview

The Wasel mobile client uses three testing layers:

- **Unit tests** — Jest + React Native Testing Library for services, stores, and components
- **E2E tests** — Detox for full user-flow verification on physical devices and emulators
- **Performance** — Sentry tracing for runtime performance monitoring and cold-start metrics

## Running Tests

```bash
cd mobile

# Unit tests with coverage
yarn test -- --coverage

# E2E tests (requires built native app)
yarn test:e2e

# Lint
yarn lint

# Type check
yarn type-check
```

## Unit Test Structure

```
mobile/src/
├── components/
│   ├── Button.test.tsx          # Component snapshot/interaction tests
│   ├── MobilePrimitives.test.tsx # Design-system component tests
│   └── MobileErrorBoundary.test.tsx
├── services/
│   ├── auth.test.ts
│   ├── chat.test.ts
│   ├── payments.test.ts
│   └── ride.test.ts
├── stores/
│   └── useAppStore.test.ts
└── test/
    └── mocks/
        └── Platform.js
```

## Component Testing Pattern

Use `@testing-library/react-native` for component tests. Prefer user-centric queries:

```tsx
import { render } from '@testing-library/react-native';
import { Button } from '../Button';

it('renders primary button with title', () => {
  const { getByText } = render(<Button title="Press me" onPress={() => {}} />);
  expect(getByText('Press me')).toBeTruthy();
});
```

## E2E Test Structure

```
mobile/e2e/
├── authFlow.test.ts       # Sign-in, sign-up, forgot password, phone auth
├── rideFlow.test.ts       # Login → home → ride request → safety
├── packageFlow.test.ts    # Login → packages tab → package creation form
├── login.e2e.ts           # Legacy login flow (being phased into rideFlow)
├── setup.ts               # Detox global setup
└── jest.config.js         # Detox-compatible Jest config
```

## E2E Best Practices

- Always use `newInstance: true` for isolated test runs
- Grant required permissions in `beforeAll`
- Use `waitFor(...).withTimeout()` for async UI transitions
- Use `testID` props on all interactive elements for reliable selectors
- Keep each spec focused on one critical user flow

## Coverage Targets

| Layer | Target | Current |
|-------|--------|---------|
| Services | 90% | Growing |
| Stores | 80% | Growing |
| Components | All primitives | 100% (Button, MobilePrimitives, ErrorBoundary) |
| E2E critical flows | 80% | Auth, Ride, Package, Wallet covered |

## CI Integration

E2E tests require a built native binary. CI pipelines should:

1. Build debug APK/IPA via `eas build --profile preview`
2. Install on emulator/simulator
3. Run `yarn test:e2e`
4. Upload artifacts on failure
