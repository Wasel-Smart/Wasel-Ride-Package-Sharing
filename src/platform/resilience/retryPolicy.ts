export interface RetryPolicyOptions {
  attempts?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  retryDecider?: (error: unknown, attemptNumber: number) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryPolicyOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const initialBackoff = Math.max(50, options.backoffMs ?? 250);
  const maxBackoff = Math.max(initialBackoff, options.maxBackoffMs ?? 2_000);
  let attemptNumber = 0;

  while (attemptNumber < attempts) {
    attemptNumber += 1;
    try {
      return await operation();
    } catch (error) {
      const shouldRetry = attemptNumber < attempts && (
        options.retryDecider ? options.retryDecider(error, attemptNumber) : true
      );

      if (!shouldRetry) {
        throw error;
      }

      const backoff = Math.min(maxBackoff, initialBackoff * attemptNumber);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw new Error('Retry policy exhausted without returning a result.');
}
