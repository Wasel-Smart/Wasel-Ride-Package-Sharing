import { describe, it, expect } from 'vitest';

// ─── Event Broker Unit Tests ─────────────────────────────────────────────────

describe('Event Broker — contract', () => {
  it('exports eventBroker singleton', async () => {
    const { eventBroker } = await import('../../src/platform/event-broker');
    expect(eventBroker).toBeDefined();
    expect(['memory', 'supabase']).toContain(eventBroker.kind);
  });

  it('publishDomainEvent is exported', async () => {
    const { publishDomainEvent } = await import('../../src/platform/event-broker');
    expect(typeof publishDomainEvent).toBe('function');
  });

  it('startEventBroker and stopEventBroker are exported', async () => {
    const { startEventBroker, stopEventBroker } = await import('../../src/platform/event-broker');
    expect(typeof startEventBroker).toBe('function');
    expect(typeof stopEventBroker).toBe('function');
  });

  it('getBrokerHealth is exported', async () => {
    const { getBrokerHealth } = await import('../../src/platform/event-broker');
    expect(typeof getBrokerHealth).toBe('function');
  });
});

// ─── API Envelope Unit Tests ──────────────────────────────────────────────────

describe('API Envelope', () => {
  it('createSuccessEnvelope wraps data correctly', async () => {
    const { createSuccessEnvelope } = await import('../../src/platform/api-envelope');
    const envelope = createSuccessEnvelope({ id: '123' }, { requestId: 'req-1' });

    expect(envelope).toEqual({
      success: true,
      data: { id: '123' },
      metadata: { requestId: 'req-1' },
    });
  });

  it('createErrorEnvelope wraps error correctly', async () => {
    const { createErrorEnvelope } = await import('../../src/platform/api-envelope');
    const envelope = createErrorEnvelope('Not found', 'NOT_FOUND', { resource: 'user' });

    expect(envelope).toEqual({
      success: false,
      error: {
        message: 'Not found',
        code: 'NOT_FOUND',
        details: { resource: 'user' },
      },
      metadata: undefined,
    });
  });

  it('isApiEnvelope detects valid envelopes', async () => {
    const { isApiEnvelope } = await import('../../src/platform/api-envelope');

    expect(isApiEnvelope({ success: true, data: {} })).toBe(true);
    expect(isApiEnvelope({ success: false, error: { message: 'err' } })).toBe(true);
    expect(isApiEnvelope(null)).toBe(false);
    expect(isApiEnvelope({})).toBe(false);
    expect(isApiEnvelope('string')).toBe(false);
  });

  it('unwrapApiEnvelope extracts data from success', async () => {
    const { unwrapApiEnvelope, createSuccessEnvelope } = await import('../../src/platform/api-envelope');
    const envelope = createSuccessEnvelope({ value: 42 });

    expect(unwrapApiEnvelope(envelope)).toEqual({ value: 42 });
  });

  it('unwrapApiEnvelope throws on error envelope', async () => {
    const { unwrapApiEnvelope, createErrorEnvelope } = await import('../../src/platform/api-envelope');
    const envelope = createErrorEnvelope('Failed', 'ERR_CODE');

    expect(() => unwrapApiEnvelope(envelope)).toThrow('Failed');
  });

  it('unwrapApiEnvelope passes through non-envelope values', async () => {
    const { unwrapApiEnvelope } = await import('../../src/platform/api-envelope');

    expect(unwrapApiEnvelope({ arbitrary: 'data' })).toEqual({ arbitrary: 'data' });
  });
});

// ─── Circuit Breaker Unit Tests ───────────────────────────────────────────────

describe('Circuit Breaker', () => {
  it('starts in CLOSED state', async () => {
    const { CircuitBreaker, CircuitState } = await import('../../src/utils/circuitBreaker');
    const cb = new CircuitBreaker('test');

    expect((cb as unknown as { state: string }).state).toBe(CircuitState.CLOSED);
  });

  it('executes function successfully when CLOSED', async () => {
    const { CircuitBreaker } = await import('../../src/utils/circuitBreaker');
    const cb = new CircuitBreaker('test');

    const result = await cb.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('opens after failure threshold', async () => {
    const { CircuitBreaker, CircuitState } = await import('../../src/utils/circuitBreaker');
    const cb = new CircuitBreaker('test', { failureThreshold: 2, timeout: 100 });

    await cb.execute(async () => { throw new Error('fail 1'); }).catch(() => {});
    await cb.execute(async () => { throw new Error('fail 2'); }).catch(() => {});

    expect((cb as unknown as { state: string }).state).toBe(CircuitState.OPEN);
  });

  it('throws immediately when OPEN', async () => {
    const { CircuitBreaker } = await import('../../src/utils/circuitBreaker');
    const cb = new CircuitBreaker('test', { failureThreshold: 1, timeout: 10_000 });

    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    await expect(cb.execute(async () => 'should not run')).rejects.toThrow('Circuit breaker test is OPEN');
  });

  it('transitions to HALF_OPEN after timeout', async () => {
    const { CircuitBreaker } = await import('../../src/utils/circuitBreaker');
    const cb = new CircuitBreaker('test', { failureThreshold: 1, timeout: 10 });

    await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});

    await new Promise(resolve => setTimeout(resolve, 20));

    // Should attempt reset — execute a successful call
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
  });
});

// ─── Retry Utility Unit Tests ─────────────────────────────────────────────────

describe('Retry Utility', () => {
  it('returns result on first success', async () => {
    const { withRetry } = await import('../../src/utils/retry');

    const result = await withRetry(async () => 'ok', { maxAttempts: 3 });
    expect(result).toBe('ok');
  });

  it('retries on failure then succeeds', async () => {
    const { withRetry } = await import('../../src/utils/retry');
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) throw new TypeError('network error');
      return 'success';
    }, { maxAttempts: 3, initialDelayMs: 1 });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('throws after max attempts exceeded', async () => {
    const { withRetry } = await import('../../src/utils/retry');

    await expect(
      withRetry(async () => { throw new TypeError('network fails'); }, { maxAttempts: 2, initialDelayMs: 1 })
    ).rejects.toThrow('network fails');
  });
});

// ─── Sanitization Unit Tests ──────────────────────────────────────────────────

describe('Sanitization', () => {
  it('sanitizeString removes control characters', async () => {
    const { sanitizeString } = await import('../../src/utils/sanitization');

    expect(sanitizeString('hello\x00world')).toBe('helloworld');
    expect(sanitizeString('hello\x1Fworld')).toBe('helloworld');
    expect(sanitizeString('hello\x7Fworld')).toBe('helloworld');
  });

  it('sanitizeHtml encodes special characters', async () => {
    const { sanitizeHtml } = await import('../../src/utils/sanitization');

    // Note: forward slash is also encoded as &#x2F;
    expect(sanitizeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('sanitizeLogMessage removes control chars and newlines', async () => {
    const { sanitizeLogMessage } = await import('../../src/utils/sanitization');

    // First removes non-printable chars, then replaces newlines with spaces
    expect(sanitizeLogMessage('line1\nline2\rline3')).toBe('line1line2line3');
    expect(sanitizeLogMessage('hello\x00world')).toBe('helloworld');
  });

  it('sanitizePhone preserves + and digits only', async () => {
    const { sanitizePhone } = await import('../../src/utils/sanitization');

    expect(sanitizePhone('+962 79-123-4567')).toBe('+962791234567');
    expect(sanitizePhone('abc+123')).toBe('+123');
  });

  it('sanitizeFilename prevents directory traversal', async () => {
    const { sanitizeFilename } = await import('../../src/utils/sanitization');

    // Leading dot gets prefixed with underscore
    expect(sanitizeFilename('../../../etc/passwd')).toBe('_.._.._.._etc_passwd');
    // Invalid characters get replaced with underscore, and dot-runs are normalized
    expect(sanitizeFilename('file<script>.txt')).toBe('file_script___.txt');
  });

  it('sanitizeURL blocks dangerous protocols', async () => {
    const { sanitizeURL } = await import('../../src/utils/sanitization');

    expect(sanitizeURL('javascript:alert(1)')).toBe('');
    expect(sanitizeURL('data:text/html,<script>')).toBe('');
    expect(sanitizeURL('https://example.com')).toBe('https://example.com');
  });
});

// ─── Error Handling Unit Tests ────────────────────────────────────────────────

describe('Error Handling', () => {
  it('WaselError has all required properties', async () => {
    const { WaselError, ErrorCategory, ErrorSeverity } = await import('../../src/utils/errors');

    const error = new WaselError({
      code: 'TEST_ERROR',
      message: 'Test error message',
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      context: { userId: 'user-1' },
      retryable: true,
    });

    expect(error.code).toBe('TEST_ERROR');
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.retryable).toBe(true);
    expect(error.context.userId).toBe('user-1');
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it('WaselError generates default user message', async () => {
    const { WaselError, ErrorCategory, ErrorSeverity } = await import('../../src/utils/errors');

    const authError = new WaselError({
      code: 'AUTH_FAILED',
      message: 'Internal auth failure',
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.HIGH,
    });

    expect(authError.userMessage).toBe('Authentication failed. Please try again.');
  });
});

// ─── Currency Utilities Unit Tests ────────────────────────────────────────────

describe('Currency Utilities', () => {
  it('converts to minor units correctly', async () => {
    const { toMinorUnits } = await import('../../src/shared/currency/currency');

    expect(toMinorUnits(10, 'JOD')).toBe(10000);
    expect(toMinorUnits(10, 'USD')).toBe(1000);
  });

  it('converts from minor units correctly', async () => {
    const { fromMinorUnits } = await import('../../src/shared/currency/currency');

    expect(fromMinorUnits(10000, 'JOD')).toBe(10);
    expect(fromMinorUnits(1000, 'USD')).toBe(10);
  });

  it('normalizeAmount rejects out-of-range values', async () => {
    const { normalizeAmount } = await import('../../src/shared/currency/currency');

    expect(normalizeAmount(10)).toBeNull();
    expect(normalizeAmount(600_000)).toBeNull();
    expect(normalizeAmount(NaN)).toBeNull();
    expect(normalizeAmount(500)).toBe(500);
  });
});
