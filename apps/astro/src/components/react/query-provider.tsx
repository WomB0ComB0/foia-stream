/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file TanStack Query Provider wrapper for React components
 * @module query-provider
 * @author FOIA Stream Team
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type React from 'react';
import { useState } from 'react';

/**
 * Props for QueryProvider component
 */
export interface QueryProviderProps {
  /** Child components to wrap */
  children: React.ReactNode;
  /** Whether to show React Query Devtools (default: true in development) */
  showDevtools?: boolean;
}

/**
 * QueryClient configuration with sensible defaults for FOIA Stream
 *
 * @constant
 * @type {() => QueryClient}
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on window focus by default (can be expensive)
        refetchOnWindowFocus: false,
        // Refetch on reconnect for data freshness
        refetchOnReconnect: true,
        // Default stale time of 5 minutes
        staleTime: 1_000 * 60 * 5,
        // Retry failed requests up to 3 times
        retry: 3,
        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

/**
 * QueryProvider component that wraps children with TanStack Query context.
 *
 * @component
 * @param {QueryProviderProps} props - Component props
 * @returns {React.JSX.Element} Provider-wrapped children
 *
 * @example
 * ```tsx
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 * ```
 */
export function QueryProvider({
  children,
  showDevtools = import.meta.env.DEV,
}: QueryProviderProps): React.JSX.Element {
  // Create QueryClient once per component instance
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

QueryProvider.displayName = 'QueryProvider';

export default QueryProvider;
