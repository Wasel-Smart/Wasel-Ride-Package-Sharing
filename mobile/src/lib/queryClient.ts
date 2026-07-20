import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 8000),
      staleTime: 60 * 1000,
    },
  },
});
