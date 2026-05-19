/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when a service is down
 */

import { logger } from './monitoring';
import { sanitizeLogMessage } from './sanitization';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms before attempting recovery
  monitoringPeriod: number; // Time window for failure counting
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: CircuitState;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 1,
  timeout: 10000, // 10 seconds
  monitoringPeriod: 60000, // 1 minute
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private lastStateChange = Date.now();
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker ${sanitizeLogMessage(this.name)} entering HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker ${sanitizeLogMessage(this.name)} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;

      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        this.lastStateChange = Date.now();
        logger.info(`Circuit breaker ${sanitizeLogMessage(this.name)} closed after recovery`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;

    logger.warning(`Circuit breaker ${sanitizeLogMessage(this.name)} failure`, {
      failures: this.failures,
      threshold: this.config.failureThreshold,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      logger.error(
        `Circuit breaker ${sanitizeLogMessage(this.name)} reopened after failed recovery`,
      );
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      logger.error(`Circuit breaker ${sanitizeLogMessage(this.name)} opened due to failures`);
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.config.timeout;
  }

  /**
   * Get current circuit breaker stats
   */
  getStats(): CircuitBreakerStats {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: Date.now(),
      state: this.state,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = Date.now();
    logger.info(`Circuit breaker ${sanitizeLogMessage(this.name)} manually reset`);
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  /**
   * Reset a specific circuit breaker by name
   */
  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
    }
  }
}

export const circuitBreakers = new CircuitBreakerRegistry();

/**
 * Decorator for automatic circuit breaker protection
 */
export function withCircuitBreaker<T>(name: string, config?: Partial<CircuitBreakerConfig>) {
  return (fn: () => Promise<T>): Promise<T> => {
    const breaker = circuitBreakers.get(name, config);
    return breaker.execute(fn);
  };
}
