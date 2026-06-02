import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const rpc = vi.fn();
const signOut = vi.fn();

vi.mock('@/services/core', () => ({
  supabase: {
    auth: {
      getUser,
      signOut,
    },
    rpc,
  },
}));

describe('privacy request service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    rpc.mockResolvedValue({ error: null });
    signOut.mockResolvedValue({ error: null });
  });

  it('submits data export through the service layer', async () => {
    const { requestDataExport } = await import('@/services/privacyRequests');

    await requestDataExport();

    expect(rpc).toHaveBeenCalledWith('request_data_export', {
      p_user_id: 'user-123',
    });
  });

  it('submits account deletion through the service layer', async () => {
    const { requestAccountDeletion } = await import('@/services/privacyRequests');

    await requestAccountDeletion();

    expect(rpc).toHaveBeenCalledWith('request_account_deletion', {
      p_user_id: 'user-123',
    });
  });

  it('rejects unauthenticated requests before calling rpc', async () => {
    const { requestDataExport } = await import('@/services/privacyRequests');
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requestDataExport()).rejects.toThrow('signed in');
    expect(rpc).not.toHaveBeenCalled();
  });
});

