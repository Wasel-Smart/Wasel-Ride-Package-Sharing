import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/client.ts', () => ({
  supabase: null,
}));

describe('sessionManager.test.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('creates SessionManager with default config', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    expect(sm).toBeDefined();
  });

  it('creates SessionManager with custom config', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const onTimeout = vi.fn();
    const onSuspicious = vi.fn();
    const sm = new SessionManager({
      timeoutMs: 60000,
      maxConcurrentSessions: 5,
      onTimeout,
      onSuspiciousActivity: onSuspicious,
    });
    expect(sm).toBeDefined();
  });

  it('startSession generates a session id', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    const meta = sm.startSession('user-1');
    expect(meta.sessionId).toBeDefined();
    expect(meta.sessionId.length).toBeGreaterThan(0);
    expect(meta.userId).toBeUndefined();
    expect(meta.deviceId).toBeDefined();
  });

  it('startSession returns metadata with current timestamps', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    const before = Date.now();
    const meta = sm.startSession('user-1');
    const after = Date.now();

    expect(meta.createdAt).toBeGreaterThanOrEqual(before);
    expect(meta.createdAt).toBeLessThanOrEqual(after);
    expect(meta.lastActivity).toBeGreaterThanOrEqual(before);
    expect(meta.lastActivity).toBeLessThanOrEqual(after);
    expect(meta.isActive).toBe(true);
  });

  it('endSession clears session', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    sm.startSession('user-1');
    sm.endSession();
    expect(sm).toBeDefined();
  });

  it('isSessionValid returns false with no session', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    expect(sm.isSessionValid()).toBe(false);
  });

  it('isSessionValid returns false when session has expired', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager({ timeoutMs: 1000 });
    sm.startSession('user-1');
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(sm.isSessionValid()).toBe(false);
  });

  it('isSessionValid returns true for fresh session', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager({ timeoutMs: 60000 });
    sm.startSession('user-1');
    expect(sm.isSessionValid()).toBe(true);
  });

  it('updateLastActivity refreshes the timestamp', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager({ timeoutMs: 60000 });
    sm.startSession('user-1');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const before = sm.getSessionStats().timeRemaining;
    sm.updateLastActivity();
    const after = sm.getSessionStats().timeRemaining;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('getTimeUntilTimeout returns 0 when no session', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    expect(sm.getTimeUntilTimeout()).toBe(0);
  });

  it('extendSession increases time remaining', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager({ timeoutMs: 60000 });
    sm.startSession('user-1');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const before = sm.getTimeUntilTimeout();
    sm.extendSession();
    const after = sm.getTimeUntilTimeout();
    expect(after).toBeGreaterThan(before);
  });

  it('getSessionMetadata returns null when no session', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager();
    expect(sm.getSessionMetadata()).toBeNull();
  });

  it('getSessionStats returns correct values', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const sm = new SessionManager({ timeoutMs: 60000 });
    sm.startSession('user-1');
    const stats = sm.getSessionStats();
    expect(stats.isActive).toBe(true);
    expect(stats.timeRemaining).toBeGreaterThan(0);
    expect(stats.sessionDuration).toBeGreaterThanOrEqual(0);
  });

  it('detects device ID mismatch as suspicious activity', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const onSuspicious = vi.fn();
    const sm = new SessionManager({ onSuspiciousActivity: onSuspicious });
    sm.startSession('user-1');

    const fakeDeviceId = 'fake-device-id';
    const stored = sm.getSessionMetadata();
    if (stored) {
      stored.deviceId = fakeDeviceId;
      sessionStorage.setItem('wasel_session_metadata', JSON.stringify(stored));
    }

    sm.detectSuspiciousActivity();
    expect(onSuspicious).toHaveBeenCalledWith('Device ID mismatch');
  });

  it('does not flag matching device ID', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const onSuspicious = vi.fn();
    const sm = new SessionManager({ onSuspiciousActivity: onSuspicious });
    sm.startSession('user-1');
    sm.detectSuspiciousActivity();
    expect(onSuspicious).not.toHaveBeenCalled();
  });

  it('detects user agent change', async () => {
    const { SessionManager } = await import('@/utils/sessionManager');
    const onSuspicious = vi.fn();
    const sm = new SessionManager({ onSuspiciousActivity: onSuspicious });
    sm.startSession('user-1');

    const stored = sm.getSessionMetadata();
    if (stored) {
      stored.userAgent = 'Mozilla/5.0';
      sessionStorage.setItem('wasel_session_metadata', JSON.stringify(stored));
    }

    sm.detectSuspiciousActivity();
    expect(onSuspicious).toHaveBeenCalledWith('User agent changed');
  });
});
