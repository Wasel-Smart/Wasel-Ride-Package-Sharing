# ADR-002: Supabase as Backend Platform

**Status**: Accepted

**Date**: 2024-01-15

**Deciders**: Engineering Team, CTO

---

## Context

We needed a backend platform that:
- Provides PostgreSQL database with real-time subscriptions
- Handles authentication (OAuth, magic links, phone)
- Offers file storage for profile photos and documents
- Scales automatically without DevOps overhead
- Supports edge functions for server-side logic

## Decision

Use Supabase as the primary backend platform for:
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Auth**: Built-in authentication with multiple providers
- **Storage**: S3-compatible object storage
- **Realtime**: WebSocket subscriptions for live updates
- **Edge Functions**: Deno-based serverless functions

## Consequences

### Positive

- **Rapid development**: Auth, database, and storage out of the box
- **Type safety**: Auto-generated TypeScript types from database schema
- **Real-time**: Built-in WebSocket support for live trip tracking
- **Security**: Row-Level Security enforces data access at database level
- **Cost-effective**: Generous free tier, predictable pricing
- **Local development**: Full local stack via Docker

### Negative

- **Vendor lock-in**: Migrating away would require significant refactoring
- **PostgreSQL only**: Can't use other databases without custom setup
- **Edge function limitations**: Deno runtime, not Node.js
- **Cold starts**: Edge functions can have 1-2s cold start latency

### Neutral

- Learning curve for RLS policies
- Need to manage migrations manually

## Alternatives Considered

1. **Firebase**: Less SQL flexibility, more expensive at scale
2. **AWS Amplify**: More complex setup, steeper learning curve
3. **Custom Node.js + PostgreSQL**: Full control but high DevOps burden
4. **PlanetScale + Clerk**: Great but more expensive, multiple vendors

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- Schema: `src/supabase/schema.sql`
- Migrations: `src/supabase/migrations/`
