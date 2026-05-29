'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

/**
 * React Query provider wrapper
 * Creates a QueryClient instance per app instance (singleton pattern)
 * Provides query client to all child components
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  // Create QueryClient instance using useState to ensure singleton per app instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 30 seconds
            staleTime: 30 * 1000,
            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests 1 time
            retry: 1,
            // Refetch on window focus in production
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Don't refetch on mount if data exists
            refetchOnMount: false,
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  // Dynamically import devtools only on client side and in development
  const [Devtools, setDevtools] = useState<React.ComponentType<{ initialIsOpen?: boolean }> | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      import('@tanstack/react-query-devtools').then((mod) => {
        setDevtools(() => mod.ReactQueryDevtools);
      }).catch(() => {
        // Devtools not available, that's okay
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {Devtools && <Devtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
