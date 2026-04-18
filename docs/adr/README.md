# Architecture Decision Records (ADRs)

This directory contains records of architectural decisions made for the Wasel platform.

## Format

Each ADR follows this structure:
- **Title**: Short descriptive name
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What is the issue we're facing?
- **Decision**: What did we decide?
- **Consequences**: What are the trade-offs?

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-react-router-7-lazy-loading.md) | React Router 7 with Lazy Loading | Accepted | 2024-01 |
| [002](./002-supabase-backend.md) | Supabase as Backend Platform | Accepted | 2024-01 |
| [003](./003-tanstack-query-state.md) | TanStack Query for Server State | Accepted | 2024-01 |
| [004](./004-radix-ui-primitives.md) | Radix UI for Accessible Components | Accepted | 2024-01 |
| [005](./005-manual-code-splitting.md) | Manual Code Splitting Strategy | Accepted | 2024-02 |
| [006](./006-stripe-payments.md) | Stripe for Payment Processing | Accepted | 2024-02 |

## Creating New ADRs

```bash
# Copy the template
cp docs/adr/000-template.md docs/adr/007-your-decision.md

# Edit and commit
git add docs/adr/007-your-decision.md
git commit -m "docs: add ADR 007 - Your Decision"
```
