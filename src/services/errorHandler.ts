import { logger } from '../utils/monitoring';
import { handleError, getUserMessage, isRetryableError } from '../utils/errors';
import { withRetry, RetryPresets } from '../utils/retry';

export interface ErrorHandlingOptions<T> {
  operation: string;
  userId?: string;
  fallback?: T;
  silent?: boolean;
  retry?: boolean;
  notifyUser?: boolean;
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlingOptions<T>
): Promise<T> {
  const executeOperation = async (): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const waselError = handleError(error, {
        operation: options.operation,
        userId: options.userId,
        timestamp: Date.now(),
      });

      if (!options.silent) {
        logger.error(
          `Operation failed: ${options.operation}`,
          waselError,
          waselError.context
        );
      }

      if (options.notifyUser && typeof window !== 'undefined') {
        const message = getUserMessage(waselError);
        console.error(`[Wasel] ${message}`);
      }

      if (options.fallback !== undefined) {
        logger.info(`Using fallback for ${options.operation}`, {
          operation: options.operation,
          userId: options.userId,
        });
        return options.fallback;
      }

      throw waselError;
    }
  };

  if (options.retry) {
    return withRetry(executeOperation, {
      ...RetryPresets.STANDARD,
      retryableErrors: isRetryableError,
      onRetry: (attempt, error) => {
        logger.warning(`Retrying ${options.operation}`, {
          attempt,
          operation: options.operation,
          error: error instanceof Error ? error.message : String(error),
        });
      },
    });
  }

  return executeOperation();
}

export function createErrorHandler<T>(defaultOptions: Partial<ErrorHandlingOptions<T>>) {
  return (operation: () => Promise<T>, options?: Partial<ErrorHandlingOptions<T>>) =>
    withErrorHandling(operation, { ...defaultOptions, ...options } as ErrorHandlingOptions<T>);
}
