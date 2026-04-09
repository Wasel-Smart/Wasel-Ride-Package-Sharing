import {
  logger,
  registerMonitoringSink,
  trackAPICall,
  type MonitoringSink,
} from '@/utils/logging';

describe('logging utilities', () => {
  const sink: MonitoringSink = {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    registerMonitoringSink(sink);
  });

  afterEach(() => {
    registerMonitoringSink(null);
  });

  it('redacts sensitive fields before forwarding errors', () => {
    logger.error('Request failed', new Error('boom'), {
      token: 'super-secret-token',
      userId: 'user-1',
    });

    expect(sink.captureException).toHaveBeenCalledTimes(1);
    expect(sink.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        userId: 'user-1',
        token: expect.stringContaining('[REDACTED]'),
      }),
    );
    expect(sink.captureException).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ token: 'super-secret-token' }),
    );
  });

  it('records breadcrumbs and warns on slow API calls', () => {
    trackAPICall('/rides/search', 'GET', 3500, 200);

    expect(sink.addBreadcrumb).toHaveBeenCalledWith(
      'API GET /rides/search',
      'api',
      expect.objectContaining({
        endpoint: '/rides/search',
        method: 'GET',
        duration: 3500,
        status: 200,
      }),
    );
    expect(sink.captureMessage).toHaveBeenCalledWith(
      'Slow API call: GET /rides/search',
      'warning',
      expect.objectContaining({
        endpoint: '/rides/search',
        duration: 3500,
        status: 200,
      }),
    );
  });

  it('only forwards info logs marked as important', () => {
    logger.info('skip this');
    logger.info('capture this', { important: true, feature: 'wallet' });

    expect(sink.captureMessage).toHaveBeenCalledTimes(1);
    expect(sink.captureMessage).toHaveBeenCalledWith(
      'capture this',
      'info',
      expect.objectContaining({
        important: true,
        feature: 'wallet',
      }),
    );
  });
});
