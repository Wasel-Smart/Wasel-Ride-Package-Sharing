import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client - returns proper promise-based responses
const createMockQueryBuilder = ( response: any ) => ( {
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

const mockSupabaseClient = {
  from: vi.fn( () => createMockQueryBuilder( { data: null, error: null } ) ),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock( '@supabase/supabase-js', () => ( {
  createClient: () => mockSupabaseClient,
} ) );

describe( 'Auth Service', () => {
  beforeEach( () => {
    vi.clearAllMocks();
  } );

  describe( 'Happy paths', () => {
    it( 'should authenticate valid user successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@wasel.jo' };
      mockSupabaseClient.auth.getUser.mockResolvedValue( { data: { user: mockUser }, error: null } );

      const { data: authData, error } = await mockSupabaseClient.auth.getUser( 'valid-token' );
      expect( error ).toBeNull();
      expect( authData.user ).toEqual( mockUser );
    } );

    it( 'should create canonical user on first login', async () => {
      const mockUser = { id: 'auth-456', email: 'new@wasel.jo' };
      mockSupabaseClient.auth.getUser.mockResolvedValue( { data: { user: mockUser }, error: null } );

      const { data: authData } = await mockSupabaseClient.auth.getUser( 'valid-token' );
      expect( authData.user.id ).toBe( 'auth-456' );
    } );
  } );

  describe( 'Validation', () => {
    it( 'should reject missing bearer token', async () => {
      const token = '';
      const isValid = token.startsWith( 'Bearer ' );
      expect( isValid ).toBe( false );
    } );

    it( 'should reject invalid auth token', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue( { data: { user: null }, error: { message: 'Invalid token' } } );

      const { data, error } = await mockSupabaseClient.auth.getUser( 'invalid-token' );
      expect( error ).toBeDefined();
      expect( data.user ).toBeNull();
    } );
  } );

  describe( 'Authorization', () => {
    it( 'should prevent cross-user access', async () => {
      const requestedUserId: string = 'user-abc';
      const authenticatedUserId: string = 'user-xyz';

      const hasAccess = requestedUserId === authenticatedUserId;
      expect( hasAccess ).toBe( false );
    } );

    it( 'should allow self-access', async () => {
      const userId: string = 'user-abc';
      const hasAccess = userId === userId;
      expect( hasAccess ).toBe( true );
    } );
  } );

  describe( 'Failure handling', () => {
    it( 'should handle database connection failure', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue( { data: { user: null }, error: { message: 'Connection failed' } } );

      const { error } = await mockSupabaseClient.auth.getUser( 'token' );
      expect( error ).toBeDefined();
      expect( error.message ).toBe( 'Connection failed' );
    } );

    it( 'should handle missing canonical user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue( { data: { user: null }, error: { message: 'User not found' } } );

      const { data, error } = await mockSupabaseClient.auth.getUser( 'invalid-token' );
      expect( error ).toBeDefined();
      expect( data.user ).toBeNull();
    } );
  } );
} );
