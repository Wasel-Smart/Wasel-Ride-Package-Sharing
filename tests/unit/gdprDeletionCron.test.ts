import { afterEach, describe, expect, it, vi } from 'vitest';

import handler from '../../api/cron/gdpr-deletion-scheduler';

function createResponse() {
  const response = {
    status: vi.fn(),
    setHeader: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe('GDPR deletion cron bridge', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects requests without the cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = createResponse();

    await handler({ method: 'GET', headers: {} }, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards an authorized trigger to the Supabase scheduler', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.example.test/');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ processed: 2, failed: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    const response = createResponse();

    await handler({ method: 'GET', headers: { authorization: 'Bearer test-cron-secret' } }, response);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://supabase.example.test/functions/v1/gdpr-deletion-scheduler',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-cron-secret' }),
      }),
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ processed: 2, failed: 0 });
  });
});
