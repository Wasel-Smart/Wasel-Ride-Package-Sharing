/**
 * API Error Recovery
 * Implements retry logic, exponential backoff, and circuit breaker pattern
 */

import { NetworkError, TimeoutError, ConfigError } from './errors';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
};

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const randomJitter = Math.random() * 0.1 * delay; // Add 0-10% jitter
  return Math.min(delay + randomJitter, config.maxDelayMs);
}

/**
 * Sleep helper for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }

  return false;
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new TimeoutError(`Request timeout after ${mergedConfig.timeoutMs}ms`)),
            mergedConfig.timeoutMs,
          ),
        ),
      ]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt === mergedConfig.maxRetries) {
        break;
      }

      // Wait before retrying
      const delay = calculateBackoffDelay(attempt, mergedConfig);
      await sleep(delay);
    }
  }

  throw lastError || new NetworkError('Request failed after all retries');
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly successThreshold: number = 2,
    private readonly resetTimeoutMs: number = 60000,
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should try to recover
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - request rejected');
      }
    }

    try {
      const result = await fn();

      // Success - update state
      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.reset();
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record failure and update state
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }

    if (this.state === 'half-open') {
      // Fail fast if half-open and we get a failure
      this.state = 'open';
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * Get current state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Manual reset
   */
  manualReset(): void {
    this.reset();
  }
}

/**
 * API client with built-in retry and circuit breaker
 */
export class ResilientAPIClient {
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  constructor(
    private baseUrl: string,
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerThreshold?: number,
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.circuitBreaker = new CircuitBreaker(circuitBreakerThreshold || 5);
  }

  /**
   * Make resilient API request
   */
  async request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await this.circuitBreaker.execute(() =>
      retryWithBackoff(
        () => fetch(url, options),
        this.retryConfig,
      ),
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Reset circuit breaker (for testing or manual recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.manualReset();
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }
}

/**
 * Export singleton resilient client
 */
export const apiClient = new ResilientAPIClient(
  import.meta.env.VITE_API_URL || '/api',
);
