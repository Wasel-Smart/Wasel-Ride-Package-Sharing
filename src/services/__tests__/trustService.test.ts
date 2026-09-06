import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockQueryBuilder() {
  const builder: Record<string, unknown> = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    delete: vi.fn(),
    is: vi.fn(),
  };

  Object.keys(builder).forEach((key) => {
    if (typeof builder[key] === 'function') {
      builder[key].mockReturnValue(builder);
    }
  });

  builder.single.mockResolvedValue({ data: null, error: null });
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });

  builder.then = (resolve: (value: { error: null; data: null }) => void) => resolve({ error: null, data: null });

  return builder;
}

vi.mock('../directSupabase/helpers', () => {
  const mockDb = {
    from: vi.fn((_table: string) => createMockQueryBuilder()),
  };

  return {
    getDb: vi.fn(() => mockDb),
  };
});

vi.mock('../directSupabase/userContext', () => ({
  buildUserContext: vi.fn(),
}));

import { getDb } from '../directSupabase/helpers';
import { buildUserContext } from '../directSupabase/userContext';

// getDb is mocked above to return a plain object of vi.fn()s, but its
// production type (PostgrestQueryBuilder overloads, etc.) doesn't expose
// vitest mock methods like `.mockImplementation`. Cast to `any` here so the
// mock's actual (test-only) shape is usable below without re-casting at
// every call site.
const mockDb = getDb() as Record<string, unknown>;
const mockBuildUserContext = buildUserContext as unknown as typeof buildUserContext;

describe('Direct Trust Phone Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts verification with normalized phone and OTP session', async () => {
    const { startDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      phone_number: null,
      role: 'rider',
      verification_level: 'level_0',
      sanad_verified_status: null,
    };

    mockBuildUserContext.mockResolvedValue({ user: mockUser });
    mockDb.from.mockImplementation((_table: string) => createMockQueryBuilder());

    const result = await startDirectTrustPhoneVerification('user-123', '+962 79 123 4567');

    expect(result.started).toBe(true);
    expect(result.phoneNumber).toBe('+962791234567');
    // The OTP code is intentionally not part of the returned shape (it must
    // never be exposed to the client). Cast to `any` since `code` doesn't
    // exist on the typed response — this assertion guards against someone
    // accidentally adding it back.
    expect((result as unknown as { code?: unknown }).code).toBeUndefined();
    expect(result.expiresAt).toBeDefined();
  });

  it('enforces rate limit on repeated OTP start requests', async () => {
    const { startDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    const mockUser = {
      id: 'user-456',
      email: 'test@example.com',
      full_name: 'Test User',
      phone_number: null,
      role: 'rider',
      verification_level: 'level_0',
      sanad_verified_status: null,
    };

    mockBuildUserContext.mockResolvedValue({ user: mockUser });
    mockDb.from.mockImplementation((_table: string) => createMockQueryBuilder());

    await startDirectTrustPhoneVerification('user-456', '+962 79 123 4567');
    await expect(startDirectTrustPhoneVerification('user-456', '+962 79 123 4567')).rejects.toThrow(
      'Too many verification attempts',
    );
  });

  it('rejects invalid phone numbers', async () => {
    const { startDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({ user: { id: 'user-999' } });

    await expect(startDirectTrustPhoneVerification('user-999', 'invalid')).rejects.toThrow(
      'Invalid phone number provided.',
    );
  });

  it('confirms verification with valid code', async () => {
    const { confirmDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    const mockUser = {
      id: 'user-123',
      phone_number: '+962791234567',
      phone_verified_at: null,
    };

    mockBuildUserContext.mockResolvedValue({ user: mockUser });

    const code = '123456';
    const codeHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)),
      ),
    )
      .map((chunk) => chunk.toString(16).padStart(2, '0'))
      .join('');

    const mockOtpSession = {
      otp_session_id: 'session-123',
      phone_number: '+962791234567',
      otp_hash: codeHash,
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      consumed_at: null,
    };

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.single.mockResolvedValue({ data: mockUser, error: null });
      } else if (table === 'otp_sessions') {
        builder.maybeSingle.mockResolvedValue({ data: mockOtpSession, error: null });
      }
      return builder;
    });

    const result = await confirmDirectTrustPhoneVerification('user-123', code);
    expect(result.verified).toBe(true);
    expect(result.phoneNumber).toBe('+962791234567');
  });

  it('rejects confirmation without code', async () => {
    const { confirmDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({ user: { id: 'user-123' } });

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.single.mockResolvedValue({ data: { id: 'user-123' }, error: null });
      }
      return builder;
    });

    await expect(confirmDirectTrustPhoneVerification('user-123', '')).rejects.toThrow(
      'Verification code is required',
    );
  });

  it('rejects expired OTP sessions', async () => {
    const { confirmDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({ user: { id: 'user-123' } });

    const expiredSession = {
      otp_session_id: 'session-123',
      phone_number: '+962791234567',
      otp_hash: 'hash',
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() - 60000).toISOString(),
      consumed_at: null,
    };

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.single.mockResolvedValue({ data: { id: 'user-123' }, error: null });
      } else if (table === 'otp_sessions') {
        builder.maybeSingle.mockResolvedValue({ data: expiredSession, error: null });
      }
      return builder;
    });

    await expect(confirmDirectTrustPhoneVerification('user-123', '123456')).rejects.toThrow(
      'The verification code expired',
    );
  });

  it('rejects after max attempts exceeded', async () => {
    const { confirmDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({ user: { id: 'user-123' } });

    const exhaustedSession = {
      otp_session_id: 'session-123',
      phone_number: '+962791234567',
      otp_hash: 'hash',
      attempts: 5,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      consumed_at: null,
    };

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.single.mockResolvedValue({ data: { id: 'user-123' }, error: null });
      } else if (table === 'otp_sessions') {
        builder.maybeSingle.mockResolvedValue({ data: exhaustedSession, error: null });
      }
      return builder;
    });

    await expect(confirmDirectTrustPhoneVerification('user-123', '123456')).rejects.toThrow(
      'Too many incorrect verification attempts',
    );
  });

  it('rejects consumed OTP sessions', async () => {
    const { confirmDirectTrustPhoneVerification } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({ user: { id: 'user-123' } });

    const consumedSession = {
      otp_session_id: 'session-123',
      phone_number: '+962791234567',
      otp_hash: 'hash',
      attempts: 0,
      max_attempts: 5,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      consumed_at: new Date().toISOString(),
    };

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.single.mockResolvedValue({ data: { id: 'user-123' }, error: null });
      } else if (table === 'otp_sessions') {
        builder.maybeSingle.mockResolvedValue({ data: consumedSession, error: null });
      }
      return builder;
    });

    await expect(confirmDirectTrustPhoneVerification('user-123', '123456')).rejects.toThrow(
      'No active verification session',
    );
  });
});

describe('Direct Trust Driver Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables driver mode', async () => {
    mockBuildUserContext.mockResolvedValue({ user: { id: 'user-123', role: 'rider' } });

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.single.mockResolvedValue({ data: { id: 'user-123', role: 'rider' }, error: null });
      }
      return builder;
    });

    const { enableDirectTrustDriverMode } = await import('../directSupabase/trust');
    const result = await enableDirectTrustDriverMode('user-123');
    expect(result.enabled).toBe(true);
    expect(result.role).toBe('driver');
  });
});

describe('Direct Trust Driver Documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits driver documents for driver role', async () => {
    const { submitDirectTrustDriverDocuments } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({
      user: { id: 'user-123', role: 'driver', verification_level: 'level_2' },
      driver: { driver_id: 'driver-123' },
    });

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.update.mockReturnValue(builder);
      } else if (table === 'drivers') {
        builder.single.mockResolvedValue({ data: { driver_id: 'driver-123' }, error: null });
        builder.update.mockReturnValue(builder);
        builder.insert.mockResolvedValue({ data: { driver_id: 'driver-456' }, error: null });
      } else if (table === 'verification_records') {
        builder.insert.mockResolvedValue({ error: null });
      }
      return builder;
    });

    const result = await submitDirectTrustDriverDocuments('user-123', {
      licenseNumber: 'DL123456',
      documentReference: 'doc-ref-1',
    });

    expect(result.submitted).toBe(true);
    expect(result.driverId).toBe('driver-123');
  });

  it('rejects driver documents for non-driver role', async () => {
    const { submitDirectTrustDriverDocuments } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({
      user: { id: 'user-123', role: 'rider' },
    });

    await expect(
      submitDirectTrustDriverDocuments('user-123', { licenseNumber: 'DL123456' }),
    ).rejects.toThrow('Enable Driver mode before submitting driver documents');
  });

  it('rejects short license numbers', async () => {
    const { submitDirectTrustDriverDocuments } = await import('../directSupabase/trust');
    mockBuildUserContext.mockResolvedValue({
      user: { id: 'user-123', role: 'driver' },
    });

    mockDb.from.mockImplementation((table: string) => {
      const builder = createMockQueryBuilder();
      if (table === 'users') {
        builder.update.mockReturnValue(builder);
      }
      return builder;
    });

    await expect(
      submitDirectTrustDriverDocuments('user-123', { licenseNumber: 'DL' }),
    ).rejects.toThrow('Enter the driver license number before submitting');
  });
});
