import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../../src/utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

vi.mock('../../../src/services/directSupabase/helpers', () => ({
  getDb: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
  getWalletByCanonicalUserId: vi.fn(),
}));

import { ensureCanonicalUser } from '../../../src/services/directSupabase/userContext';

describe('ensureCanonicalUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults new canonical users to passenger instead of trusting editable auth metadata roles', async () => {
    let insertedPayload: Record<string, unknown> | null = null;

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-1',
          email: 'sara@example.com',
          phone: '+962790000123',
          user_metadata: {
            full_name: 'Sara Ali',
            role: 'admin',
          },
        },
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'users') {
        throw new Error(`Unexpected table lookup: ${table}`);
      }

      return {
        select: () => ({
          eq: (column: string) => ({
            maybeSingle: async () => ({
              data: null,
              error: column === 'id' ? null : undefined,
            }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: 'canonical-user-1',
                  ...payload,
                },
                error: null,
              }),
            }),
          };
        },
      };
    });

    const result = await ensureCanonicalUser('auth-user-1');

    expect(result.role).toBe('passenger');
    expect(insertedPayload).toMatchObject({
      auth_user_id: 'auth-user-1',
      role: 'passenger',
    });
  });
});
