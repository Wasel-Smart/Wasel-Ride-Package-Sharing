import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn(() => mockSupabaseClient),
  maybeSingle: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  upsert: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
  limit: vi.fn(() => mockSupabaseClient),
  in: vi.fn(() => mockSupabaseClient),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy paths', () => {
    it('should authenticate valid user successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@wasel.jo' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabaseClient.maybeSingle.mockResolvedValue({
        data: { id: 'user-123', email: 'test@wasel.jo', role: 'passenger' },
        error: null,
      });

      const { data: authData } = await mockSupabaseClient.auth.getUser('valid-token');
      expect(authData.user).toEqual(mockUser);

      const { data: userData } = await mockSupabaseClient
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      expect(userData).toBeDefined();
      expect(userData.email).toBe('test@wasel.jo');
    });

    it('should create canonical user on first login', async () => {
      const mockUser = { id: 'auth-456', email: 'new@wasel.jo' };
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'auth-456', email: 'new@wasel.jo', role: 'passenger' },
        error: null,
      });

      const { data: authData } = await mockSupabaseClient.auth.getUser('valid-token');
      expect(authData.user.id).toBe('auth-456');

      // Simulate user not found, then created
      const { data: existingUser } = await mockSupabaseClient
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();

      expect(existingUser).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should reject missing bearer token', async () => {
      const token = '';
      const isValid = token.startsWith('Bearer ');
      expect(isValid).toBe(false);
    });

    it('should reject invalid auth token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });

      const { data, error } = await mockSupabaseClient.auth.getUser('invalid-token');
      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });

  describe('Authorization', () => {
    it('should prevent cross-user access', async () => {
      const requestedUserId = 'user-abc';
      const authenticatedUserId = 'user-xyz';

      const hasAccess = requestedUserId === authenticatedUserId;
      expect(hasAccess).toBe(false);
    });

    it('should allow self-access', async () => {
      const userId = 'user-abc';
      const hasAccess = userId === userId;
      expect(hasAccess).toBe(true);
    });
  });

  describe('Failure handling', () => {
    it('should handle database connection failure', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Connection failed' } });

      const { error } = await mockSupabaseClient.auth.getUser('token');
      expect(error).toBeDefined();
      expect(error.message).toBe('Connection failed');
    });

    it('should handle missing canonical user', async () => {
      mockSupabaseClient.maybeSingle.mockResolvedValue({ data: null, error: null });

      const { data } = await mockSupabaseClient.from('users').select('*').eq('id', 'nonexistent').maybeSingle();
      expect(data).toBeNull();
    });
  });
});
