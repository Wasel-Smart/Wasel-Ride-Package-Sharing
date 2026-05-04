/**
 * Retry Logic with Exponential Backoff and Jitter
 * Implements resilient retry patterns for API calls
 */

import { logger } from './monitoring';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableErrors?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxDelayMs
  );

  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * config.jitterFactor * (Math.random() - 0.5);
  return Math.max(0, exponentialDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default retryable error checker
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return true;
    }
  }

  // HTTP errors
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on 5xx errors and 429 (rate limit)
    return status >= 500 || status === 429 || status === 408;
  }

  return false;
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
    retryableErrors: config.retryableErrors ?? isRetryableError,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!finalConfig.retryableErrors!(error)) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      const delay = calculateDelay(attempt, finalConfig);
      
      logger.warning('Retrying after error', {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
        delayMs: delay,
        error: error instanceof Error ? error.message : String(error),
      });

      // Call onRetry callback if provided
      finalConfig.onRetry?.(attempt, error);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  /**
   * Quick retry for fast operations
   */
  QUICK: {
    maxAttempts: 2,
    initialDelayMs: 500,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as Partial<RetryConfig>,

  /**
   * Standard retry for most operations
   */
  STANDARD: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  } as Partial<RetryConfig>,

  /**
   * Aggressive retry for critical operations
   */
  AGGRESSIVE: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  } as Partial<RetryConfig>,

  /**
   * Patient retry for long-running operations
   */
  PATIENT: {
    maxAttempts: 3,
    initialDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 3,
    jitterFactor: 0.15,
  } as Partial<RetryConfig>,
};

/**
 * Retry with timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  return Promise.race([
    withRetry(fn, retryConfig),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Batch retry - retry multiple operations with shared config
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {}
): Promise<T[]> {
  return Promise.all(operations.map(op => withRetry(op, config)));
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}
