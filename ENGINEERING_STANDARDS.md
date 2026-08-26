# Wasel Engineering Standards

## Testing Requirements

### Test Coverage Thresholds
- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 80%
- **Statements**: 80%

### Unit Tests
Every utility function and pure module must have unit tests covering:
- Happy path
- Edge cases (null, undefined, empty)
- Error conditions
- Boundary values

```typescript
// Example test structure
describe('feature: functionName', () => {
  it('handles normal input correctly', () => { ... });
  it('handles empty input', () => { ... });
  it('throws on invalid input', () => { ... });
});
```

### Integration Tests
Service modules must include integration tests that verify:
- API contract compliance
- Error handling chains
- Data transformation correctness

### E2E Tests
Critical user journeys must be covered:
- Authentication flow
- Ride booking flow
- Package tracking flow
- Payment flow

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types without justification
- Consistent type imports: `import type { ... }`
- Explicit return types on public functions

### Function Design
- Maximum 150 lines per function
- Maximum 4 parameters (use options object)
- Maximum cyclomatic complexity: 20
- Single responsibility principle

### Naming Conventions
- Files: `kebab-case.ts` or `PascalCase.tsx`
- Functions: `camelCase`, verb-first
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Import Order
1. External dependencies
2. Internal aliases (`@/...`)
3. Relative imports (`../`, `./`)
4. Type-only imports

## Git Workflow

### Branch Naming
- `feature/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code refactoring
- `docs/description` — documentation

### Commit Messages
```
<type>: <description>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### PR Requirements
- All CI checks pass
- Test coverage meets thresholds
- No lint warnings
- At least one reviewer approval

## Performance Guidelines

### React Optimization
- Use `React.memo` for expensive components
- Use `useMemo`/`useCallback` for expensive computations
- Implement virtual scrolling for long lists
- Lazy load route components

### Bundle Size
- Route-level code splitting
- Dynamic imports for heavy dependencies
- Monitor bundle size with `npm run bundle:analyze`
- Keep chunk size under 1200KB (warning threshold)

### API Optimization
- Implement request deduplication
- Use caching where appropriate
- Debounce user input handlers
- Batch related requests

## Security Requirements

### Input Validation
- Sanitize all user input on client side
- Validate with Zod schemas
- Never trust client-side validation alone

### Authentication
- Store tokens securely (httpOnly cookies preferred)
- Implement proper session timeout
- Use CSRF protection for state-changing requests

### Data Protection
- Never log sensitive data
- Encrypt PII at rest
- Implement proper access controls
