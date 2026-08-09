/**
 * Circuit Breaker — lightweight mobile port of the web circuit breaker.
 *
 * Prevents cascading failures by failing fast when a downstream service keeps
 * throwing. After cooldown it lets one probe through; if that probe succeeds
 * the breaker closes, otherwise it reopens.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: CircuitState;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private lastStateChange = Date.now();

  constructor(
    private name: string,
    private failureThreshold = 5,
    private successThreshold = 1,
    private timeout = 5_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastStateChange >= this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        console.info(`[CircuitBreaker] ${this.name} entering HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
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

  private onSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        this.lastStateChange = Date.now();
        console.info(`[CircuitBreaker] ${this.name} closed after recovery`);
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successes = 0;
    console.warn(`[CircuitBreaker] ${this.name} failure`, {
      failures: this.failures,
      threshold: this.failureThreshold,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      console.error(`[CircuitBreaker] ${this.name} reopened after failed recovery`);
    } else if (this.failures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      console.error(`[CircuitBreaker] ${this.name} opened due to failures`);
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.lastStateChange = Date.now();
    console.info(`[CircuitBreaker] ${this.name} manually reset`);
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state,
    };
  }
}
