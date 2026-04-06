# Architecture Decision Records (ADRs)

This directory contains architecture decisions for the Wasel application.

## Index

1. [ADR-001: Feature-Based Module Organization](#adr-001-feature-based-module-organization)
2. [ADR-002: Error Handling Hierarchy](#adr-002-error-handling-hierarchy)
3. [ADR-003: Type Safety and TypeScript Strict Mode](#adr-003-type-safety-and-typescript-strict-mode)
4. [ADR-004: Performance Monitoring and Web Vitals](#adr-004-performance-monitoring-and-web-vitals)
5. [ADR-005: Feature Flags for Gradual Rollout](#adr-005-feature-flags-for-gradual-rollout)
6. [ADR-006: API Response Validation with Zod](#adr-006-api-response-validation-with-zod)
7. [ADR-007: Service Layer Organization](#adr-007-service-layer-organization)
8. [ADR-008: Testing Strategy](#adr-008-testing-strategy)

---

## ADR-001: Feature-Based Module Organization

**Date**: 2024-01-01  
**Status**: Accepted  
**Deciders**: Architecture Team

### Context
The application needed a scalable project structure that would accommodate growth from single developer to team environment.

### Decision
Adopt **feature-based module organization** with the following structure:
```
src/
├── features/          # Feature modules (independent feature bundles)
│   ├── rides/
│   ├── bookings/
│   ├── payments/
│   └── ...
├── components/        # Shared components (design system primitives)
├── services/          # Shared business logic (API, auth, etc.)
├── hooks/             # Shared custom hooks
├── contexts/          # Global state (Auth, Language, etc.)
└── utils/             # Shared utilities and helpers
```

### Rationale
- **Scalability**: Each feature is independently developed and tested
- **Isolation**: Feature bugs don't cascade to other features
- **Code reuse**: Shared components/services prevent duplication
- **Developer experience**: Clear mental model for new team members
- **CI/CD optimization**: Can build/test features independently

### Consequences
- Need discipline to keep features decoupled
- Requires clear dependency boundaries
- Must establish shared component versioning strategy

---

## ADR-002: Error Handling Hierarchy

**Date**: 2024-01-02  
**Status**: Accepted  
**Deciders**: Architecture Team

### Context
Previous error handling used regex pattern matching in error boundaries, which was brittle and prone to breaking with refactoring.

### Decision
Implement **typed error hierarchy** with specific error classes:

```typescript
WaselError (base)
├── AuthenticationError
├── AuthorizationError
├── NetworkError
├── ValidationError
├── PaymentError
├── TimeoutError
├── ConfigError
└── IgnorableSystemError
```

Each error has:
- `code`: Machine-readable error identifier
- `isIgnorable`: Whether error should be shown to user
- `context`: Additional data for debugging

### Rationale
- **Type safety**: Compiler ensures error handling is comprehensive
- **Maintainability**: Centralized error logic in one place
- **User experience**: Consistent, translated error messages
- **Debugging**: Rich context for error investigation

### Consequences
- All external errors must be normalized
- Error handling code requires maintenance as new error types emerge
- Developers must use correct error class for each scenario

---

## ADR-003: Type Safety and TypeScript Strict Mode

**Date**: 2024-01-03  
**Status**: Accepted  
**Deciders**: Architecture Team

### Context
Codebase initially had permissive TypeScript + ESLint configuration, allowing `any` types and unsafe assertions.

### Decision
Enable **TypeScript strict mode** with ESLint warnings for:
- `no-explicit-any` - Catch loose typing
- `no-unused-vars` - Dead code detection
- `no-non-null-assertion` - Force safe null handling
- `exhaustive-deps` - Prevent hook dependency bugs
- `explicit-function-return-types` - Return type clarity

### Rationale
- **Bug prevention**: Catch type errors at compile time
- **Code clarity**: Return types act as contracts
- **Refactoring safety**: Compiler warns of breaking changes
- **Team efficiency**: Less runtime debugging

### Consequences
- Requires discipline to maintain type coverage
- Slightly more verbose code
- Learning curve for new team members

---

## ADR-004: Performance Monitoring and Web Vitals

**Date**: 2024-01-04  
**Status**: Accepted  
**Deciders**: Architecture Team

### Context
Application needed to track real-world performance to catch regressions early.

### Decision
Implement **Web Vitals monitoring** with:
- LCP, FID, CLS, TTFB, FCP, INP tracking
- Sentry integration for performance replay sampling
- In-dashboard aggregate metrics
- CI/CD performance budgets (tested on every PR)

### Rationale
- **User experience**: Track actual user experience metrics
- **Early detection**: Catch performance regressions before production
- **Debugging context**: Replays help reproduce user issues
- **Accountability**: Metrics tracked and reported regularly

### Consequences
- Requires ongoing monitoring and report review
- May need frontend optimizations to meet budgets
- Performance budgets must be updated as codebase grows

---

## ADR-005: Feature Flags for Gradual Rollout

**Date**: 2024-01-05  
**Status**: Accepted  
**Deciders**: Product + Engineering

### Context
Features needed to be deployed without risking all users, and A/B testing was needed for validation.

### Decision
Implement **centralized feature flags** with:
- Deterministic rollout based on user ID (consistent experience)
- Percentage-based rollout (gradual deployment)
- Environment-specific flags (dev, staging, production)
- Override capability in development

### Rationale
- **Risk mitigation**: Can roll back features without deployment
- **A/B testing**: Test features with percentage of users
- **Staging validation**: Full feature validation before production
- **Developer experience**: Easy feature toggling in dev

### Consequences
- Must maintain feature flag configuration
- Need process for flag cleanup (remove old flags)
- Development requires awareness of feature availability

---

## ADR-006: API Response Validation with Zod

**Date**: 2024-01-06  
**Status**: Accepted  
**Deciders**: Architecture Team

### Context
Backend API responses were not validated before use, risking type errors from breaking changes.

### Decision
Implement **Zod schemas for all API responses**:
- Define schema for each API endpoint
- Validate responses at service layer
- Throw typed errors on validation failure
- Use schema types as source of truth

### Rationale
- **Breaking change detection**: Catch API changes immediately
- **Runtime safety**: Ensure response shape before using
- **Single source of truth**: Schema defines both validation and types
- **Debugging**: Clear error messages on validation failure

### Consequences
- Schemas must be kept in sync with backend
- Schema definition overhead (but pays off in safety)
- May catch real breaking changes that need fixing

---

## ADR-007: Service Layer Organization

**Date**: 2024-01-07  
**Status**: In Review  
**Deciders**: Architecture Team

### Context
Service layer grew to 30+ files with unclear separation of concerns.

### Decision
Reorganize services by domain:
```
services/
├── api/           # HTTP client configuration
├── auth/          # Authentication logic
├── bookings/      # Booking domain services
├── payments/      # Payment processing
├── trips/         # Trip search & management
├── notifications/ # Push, email, SMS, WhatsApp
└── core/          # Core utilities (caching, error handling)
```

Each domain service:
- Exports single responsibility functions
- Has comprehensive JSDoc
- Uses consistent error handling
- Includes retry/timeout logic where appropriate

### Rationale
- **Clarity**: Clear domain boundaries
- **Maintainability**: Easier to find related code
- **Testing**: Services can be tested independently
- **Reusability**: Clear interfaces encourage reuse

---

## ADR-008: Testing Strategy

**Date**: 2024-01-08  
**Status**: Accepted  
**Deciders**: QA + Engineering

### Context
Test coverage was low (55-60%) and critical user flows were not tested.

### Decision
Implement **multi-layer testing strategy**:
- **Unit tests** (75%+ coverage): Functions, utilities, schemas
- **Component tests**: Rendering, user interactions, accessibility
- **Integration tests**: Critical user flows (booking, payment)
- **E2E tests**: Full user journeys in real browser
- **Visual regression** (future): Catch UI regressions

### Coverage Targets
- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

### Rationale
- **Regression prevention**: Catch bugs before production
- **Confidence**: Team can refactor with safety net
- **Documentation**: Tests serve as living documentation
- **Debugging**: Failures point directly to problem area

### Consequences
- Requires discipline and time investment
- Must maintain tests as code evolves
- CI/CD pipelines need performance optimization for test runs

---

## References

- [TypeScript Handbook - Type Safety](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)
- [Web Vitals - Google](https://web.dev/vitals/)
- [Feature Flags Best Practices](https://launchdarkly.com/feature-flags/best-practices/)
- [Testing Library Documentation](https://testing-library.com/)
- [Zod Documentation](https://zod.dev/)
