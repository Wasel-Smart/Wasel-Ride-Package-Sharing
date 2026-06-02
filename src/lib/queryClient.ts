import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { DEFAULT_QUERY_OPTIONS } from '@/utils/performance/cacheStrategy';
import { logger } from '@/utils/monitoring';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function reportAsyncError(error: unknown, source: 'query' | 'mutation'): void {
  logger.error(`${source} failed`, error, { source });
}

export const queryClient = new QueryClient({
  defaultOptions: DEFAULT_QUERY_OPTIONS,
  queryCache: new QueryCache({
    onError: error => {
      reportAsyncError(error, 'query');
    },
  }),
  mutationCache: new MutationCache({
    onError: error => {
      reportAsyncError(error, 'mutation');
      toast.error('Request failed', {
        description: getErrorMessage(error),
      });
    },
  }),
});
