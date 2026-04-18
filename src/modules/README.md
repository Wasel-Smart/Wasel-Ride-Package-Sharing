# Wasel Modules

This directory contains **first-class domain modules** for the Wasel platform. Each module follows a consistent architecture pattern with clean separation of concerns.

---

## 📁 Module Structure

Each module follows this structure:

```
/modules/{domain}/
├── {domain}.types.ts          # TypeScript interfaces
├── {domain}.service.ts        # Business logic & API calls
├── {domain}.hooks.ts          # React hooks for state management
├── index.ts                   # Clean exports
└── components/                # UI components
    ├── {Component1}.tsx
    ├── {Component2}.tsx
    └── {Component3}.tsx
```

---

## 🎯 Architecture Principles

### 1. Separation of Concerns
- **Types:** Define data structures
- **Service:** Handle business logic and API calls
- **Hooks:** Manage component state
- **Components:** Pure UI presentation

### 2. No Business Logic in UI
- Components receive data via props
- Components emit events via callbacks
- All logic lives in service or hooks

### 3. Consistent Patterns
- All modules follow the same structure
- Same naming conventions
- Same export patterns
- Easy to learn and maintain

---

## 📦 Current Modules

### Rides (`/modules/rides/`)
**Purpose:** Find and book rides across Jordan

**Exports:**
- `rideService` - Search and retrieve rides
- `useRideSearch()` - State management hook
- `RideSearchForm` - Search interface
- `RideCard` - Individual ride display
- `RideResults` - Results grid

**Usage:**
```typescript
import { useRideSearch, RideSearchForm } from '@/modules/rides';

const { state, search } = useRideSearch();
```

**Documentation:**
- [Complete Documentation](../../docs/FIND_RIDE_REFACTOR_COMPLETE.md)
- [Quick Start Guide](../../docs/FIND_RIDE_QUICK_START.md)
- [Testing Checklist](../../docs/FIND_RIDE_TESTING_CHECKLIST.md)

---

## 🚀 Creating a New Module

### Step 1: Create Directory Structure
```bash
mkdir -p src/modules/{domain}/components
```

### Step 2: Create Core Files

#### `{domain}.types.ts`
```typescript
export interface {Domain}Item {
  id: string;
  // ... other fields
}

export interface {Domain}SearchParams {
  // ... search parameters
}

export interface {Domain}State {
  // ... component state
}
```

#### `{domain}.service.ts`
```typescript
export const {domain}Service = {
  async search(params: {Domain}SearchParams) {
    // API calls here
  },
  
  async getById(id: string) {
    // API calls here
  },
};
```

#### `{domain}.hooks.ts`
```typescript
export function use{Domain}Search(initialState) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const search = useCallback(async () => {
    // Search logic
  }, []);
  
  return { state, search };
}
```

#### `index.ts`
```typescript
export * from './{domain}.types';
export * from './{domain}.service';
export * from './{domain}.hooks';
export { Component1 } from './components/Component1';
```

### Step 3: Create Components

Follow the Wasel design system:
```typescript
import { C, F } from '@/styles/wasel-design-system';

export function Component() {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      color: C.text,
      fontFamily: F,
    }}>
      Content
    </div>
  );
}
```

### Step 4: Document

Create documentation:
- Module README
- API documentation
- Usage examples
- Testing guide

---

## 🎨 Design System

All modules MUST use the Wasel design system:

```typescript
import { C, F } from '@/styles/wasel-design-system';

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

**NO custom colors or styles allowed.**

---

## 🧪 Testing

Each module should have:

### Unit Tests
```typescript
describe('{domain}Service', () => {
  it('should search items', async () => {
    const results = await {domain}Service.search(params);
    expect(results).toBeInstanceOf(Array);
  });
});
```

### Component Tests
```typescript
test('renders component', () => {
  render(<Component />);
  expect(screen.getByText('...')).toBeInTheDocument();
});
```

### Integration Tests
```typescript
test('full flow works', async () => {
  // Test complete user flow
});
```

---

## 📚 Best Practices

### ✅ DO
- Follow the module structure exactly
- Use TypeScript for all files
- Import design tokens from `wasel-design-system`
- Keep business logic in service layer
- Use hooks for state management
- Write comprehensive tests
- Document your code

### ❌ DON'T
- Put business logic in components
- Use custom colors or styles
- Make direct API calls from UI
- Skip error handling
- Duplicate code
- Skip documentation

---

## 🔍 Module Checklist

Before considering a module complete:

- [ ] Types are comprehensive
- [ ] Service layer is clean
- [ ] Hooks are optimized
- [ ] Components are pure UI
- [ ] Design system is enforced
- [ ] Tests are written
- [ ] Documentation is complete
- [ ] Examples are provided
- [ ] Code is reviewed
- [ ] Performance is validated

---

## 📖 Reference Modules

### Rides Module
**Location:** `/modules/rides/`  
**Status:** ✅ Production-ready  
**Pattern:** Reference implementation

Use this as a template for new modules:
- Clean architecture
- Proper separation of concerns
- Design system compliance
- Comprehensive documentation

---

## 🤝 Contributing

### Adding a New Module
1. Follow the structure above
2. Use Rides module as reference
3. Enforce design system
4. Write tests
5. Document thoroughly
6. Get code review
7. Update this README

### Modifying Existing Module
1. Understand current architecture
2. Maintain consistency
3. Update tests
4. Update documentation
5. Get code review

---

## 📞 Support

For questions about modules:
1. Check this README
2. Review Rides module
3. Check design system docs
4. Ask the team

---

## 🎯 Goals

The module system aims to:
- **Consistency:** Same patterns everywhere
- **Maintainability:** Easy to understand and modify
- **Scalability:** Easy to add new features
- **Quality:** Production-ready code
- **Speed:** Fast development cycles

---

**Current Modules:** 1 (Rides)  
**Target Modules:** All core domains  
**Status:** Active development
