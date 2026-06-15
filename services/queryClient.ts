import { QueryCache, QueryClient, MutationCache, type QueryClientConfig } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DEFAULT_QUERY_OPTIONS } from '../utils/performance/cacheStrategy';
import { normalizeError } from '../utils/errors';
import { logger } from '../utils/logging';

export interface QueryClientFactoryOptions {
  notifyOnError?: boolean;
}

function getErrorMessage(error: unknown): string {
  return normalizeError(error).message || 'Request failed. Please try again.';
}

function reportAsyncFailure(scope: 'query' | 'mutation', error: unknown, metadata?: Record<string, unknown>) {
  const normalizedError = normalizeError(error, metadata);
  logger.error(`React Query ${scope} failed`, {
    error: normalizedError,
    scope,
    ...metadata,
  });

  return normalizedError;
}

export function createWaselQueryClient(options: QueryClientFactoryOptions = {}): QueryClient {
  const notifyOnError = options.notifyOnError ?? true;

  const config: QueryClientConfig = {
    defaultOptions: DEFAULT_QUERY_OPTIONS,
    queryCache: new QueryCache({
      onError: (error, query) => {
        const normalizedError = reportAsyncFailure('query', error, {
          queryHash: query.queryHash,
          queryKey: query.queryKey,
        });

        if (notifyOnError && query.state.data !== undefined) {
          toast.error(getErrorMessage(normalizedError));
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const normalizedError = reportAsyncFailure('mutation', error, {
          mutationKey: mutation.options.mutationKey,
        });

        if (notifyOnError) {
          toast.error(getErrorMessage(normalizedError));
        }
      },
    }),
  };

  return new QueryClient(config);
}
