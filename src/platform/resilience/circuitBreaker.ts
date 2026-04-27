export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  cooldownMs?: number;
  failureThreshold?: number;
  successThreshold?: number;
}

export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private lastFailureAt = 0;
  private state: CircuitState = 'closed';

  constructor(private readonly options: CircuitBreakerOptions = {}) {}

  getSnapshot(): { failures: number; lastFailureAt: number; state: CircuitState } {
    return {
      failures: this.failures,
      lastFailureAt: this.lastFailureAt,
      state: this.state,
    };
  }

  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    const cooldownMs = this.options.cooldownMs ?? 10_000;
    if (this.state === 'open' && Date.now() - this.lastFailureAt >= cooldownMs) {
      this.state = 'half_open';
      this.successes = 0;
      return true;
    }

    return this.state === 'half_open';
  }

  recordSuccess(): void {
    if (this.state === 'half_open') {
      this.successes += 1;
      if (this.successes >= (this.options.successThreshold ?? 2)) {
        this.reset();
      }
      return;
    }

    this.failures = 0;
  }

  recordFailure(): void {
    this.failures += 1;
    this.lastFailureAt = Date.now();
    if (this.failures >= (this.options.failureThreshold ?? 3)) {
      this.state = 'open';
    }
  }

  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.lastFailureAt = 0;
    this.state = 'closed';
  }
}
