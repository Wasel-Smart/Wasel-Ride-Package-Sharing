// Shared mock setup for auth service tests using Vitest
// This file provides a mock Supabase client that mimics the
// supabase-js API used in the production code.

import { vi } from 'vitest';

// Helper to create a mock query builder that resolves a response.
export const createMockQueryBuilder = ( response: unknown ) => ( {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue( response ),
  maybeSingle: vi.fn().mockResolvedValue( response ),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
} );

// Base mock supabase client used across tests.
export const mockSupabaseClient = {
  // Auth namespace – will be stubbed per test.
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
  },
  // Generic table query builder – default to a successful empty response.
  from: vi.fn( () => createMockQueryBuilder( { data: null, error: null } ) ),
};

// Mock the supabase-js module to return our mock client.
vi.mock( '@supabase/supabase-js', () => ( {
  createClient: () => mockSupabaseClient,
} ) );

// Export a reset helper for convenience.
export const resetAuthMocks = () => {
  vi.clearAllMocks();
};
