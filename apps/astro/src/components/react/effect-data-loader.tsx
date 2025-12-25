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
 * @file Enhanced DataLoader for React using TanStack Query and Effect
 * @module effect-data-loader
 * @author FOIA Stream Team
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import { FetchHttpClient } from '@effect/platform';
import type { QueryKey } from '@tanstack/react-query';
import {
  type UseSuspenseQueryOptions,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { Effect, pipe, Schema } from 'effect';
import type React from 'react';
import { Suspense, useCallback, useMemo } from 'react';
import { ClientError, Loader } from '@/components/client';
import {
  FetcherError,
  type FetcherOptions,
  get,
  type QueryParams,
  requestQueue,
  ValidationError,
} from '@/lib/http-clients';

/**
 * Enhanced render props with query state and actions.
 * @template T The type of the loaded data.
 */
export interface DataLoaderRenderProps<T> {
  refetch: () => Promise<void>;
  isRefetching: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
  invalidate: () => Promise<void>;
  setQueryData: (data: T | ((prev: T) => T)) => void;
}

/**
 * Props for DataLoader component
 */
export interface DataLoaderProps<T> {
  url: string;
  children:
    | ((data: T) => React.ReactNode)
    | ((data: T, utils: DataLoaderRenderProps<T>) => React.ReactNode);
  queryOptions?: Partial<
    Omit<UseSuspenseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>
  >;
  LoadingComponent?: React.ReactNode;
  ErrorComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  options?: Omit<FetcherOptions<T>, 'schema'>;
  params?: QueryParams;
  queryKey?: QueryKey;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  transform?: (data: unknown) => T;
  staleTime?: number;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  schema?: Schema.Schema<T, unknown, never>;
}

/**
 * DataLoader component with caching, error handling, and Suspense support.
 * @component
 * @template T The type of the loaded data
 */
export function DataLoader<T>({
  children,
  url,
  queryOptions = {},
  LoadingComponent = <Loader />,
  ErrorComponent = ClientError,
  options = {},
  params = {},
  queryKey,
  onSuccess,
  onError,
  transform,
  staleTime = 1_000 * 60 * 5,
  refetchInterval = false,
  refetchOnWindowFocus = false,
  refetchOnReconnect = true,
  schema,
}: DataLoaderProps<T>): React.ReactElement {
  const queryClient = useQueryClient();

  const finalQueryKey = useMemo(() => {
    if (queryKey) return queryKey;
    const headers = options?.headers;
    const timeout = options?.timeout;
    const schemaKey = schema ? `schema:${Schema.format(schema)}` : null;
    return ['dataloader', url, params, headers, timeout, schemaKey].filter(Boolean);
  }, [queryKey, url, params, options, schema]);

  const fetcherOptions = useMemo((): FetcherOptions<T> => {
    const baseOptions: FetcherOptions<T> = {
      retries: 3,
      retryDelay: 1_000,
      timeout: 30_000,
      onError: (err) => {
        if (err instanceof FetcherError) {
          console.error(`[DataLoader]: Status ${err.status}`, err.responseData);
        } else if (err instanceof ValidationError) {
          console.error(`[DataLoader]: Validation failed - ${err.getProblemsString()}`);
        } else {
          console.error('[DataLoader]: Unexpected error', err);
        }
        if (onError && err instanceof Error) onError(err);
      },
      ...options,
    };

    if (schema) {
      return { ...baseOptions, schema } as FetcherOptions<T>;
    }
    return baseOptions;
  }, [options, onError, schema]);

  const queryFn = useCallback(async (): Promise<T> => {
    try {
      const result = await requestQueue.enqueue(
        url,
        'GET',
        async () => {
          const effect = pipe(
            get<T>(url, fetcherOptions as FetcherOptions<T>, params),
            Effect.provide(FetchHttpClient.layer),
          );
          return await Effect.runPromise(effect);
        },
        { headers: fetcherOptions?.headers, bypassDeduplication: false },
      );

      const finalResult = transform ? transform(result) : (result as T);
      if (onSuccess) onSuccess(finalResult);
      return finalResult;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      if (error instanceof FetcherError) throw error;
      throw new FetcherError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        url,
        undefined,
        error,
      );
    }
  }, [url, fetcherOptions, params, transform, onSuccess]);

  const queryOptionsWithDefaults = useMemo(
    () => ({
      queryKey: finalQueryKey,
      queryFn,
      staleTime,
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnReconnect,
      retry: (failureCount: number, error: unknown) => {
        if (
          error instanceof ValidationError ||
          (error instanceof FetcherError &&
            error.status &&
            error.status >= 400 &&
            error.status < 500)
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      ...queryOptions,
    }),
    [
      finalQueryKey,
      queryFn,
      staleTime,
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnReconnect,
      queryOptions,
    ],
  );

  const { data, error, refetch, isRefetching } = useSuspenseQuery<T, Error>(
    queryOptionsWithDefaults,
  );

  const renderProps = useMemo(
    (): DataLoaderRenderProps<T> => ({
      refetch: async () => {
        await refetch();
      },
      isRefetching,
      queryClient,
      invalidate: async () => {
        await queryClient.invalidateQueries({ queryKey: finalQueryKey });
      },
      setQueryData: (newData) => {
        queryClient.setQueryData(finalQueryKey, newData);
      },
    }),
    [refetch, isRefetching, queryClient, finalQueryKey],
  );

  const renderError = useCallback(
    (error: Error) => {
      const Component = ErrorComponent;
      return <Component error={error} retry={() => refetch()} />;
    },
    [ErrorComponent, refetch],
  );

  const renderChildren = useCallback(() => {
    if (typeof children === 'function') {
      return children.length > 1
        ? (children as (data: T, utils: DataLoaderRenderProps<T>) => React.ReactNode)(
            data,
            renderProps,
          )
        : (children as (data: T) => React.ReactNode)(data);
    }
    return null;
  }, [children, data, renderProps]);

  return (
    <Suspense fallback={LoadingComponent}>{error ? renderError(error) : renderChildren()}</Suspense>
  );
}

DataLoader.displayName = 'DataLoader';

/**
 * Hook version of DataLoader for use outside of JSX.
 * @template T The type of the loaded data
 */
export function useDataLoader<T>(
  url: string,
  options: Omit<
    DataLoaderProps<T>,
    'children' | 'LoadingComponent' | 'ErrorComponent' | 'url'
  > = {},
): {
  data: T;
  refetch: () => Promise<void>;
  isRefetching: boolean;
  invalidate: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const {
    queryOptions = {},
    options: fetcherOpts = {},
    params = {},
    queryKey,
    onSuccess,
    onError,
    transform,
    staleTime = 1_000 * 60 * 5,
    refetchInterval = false,
    refetchOnWindowFocus = false,
    refetchOnReconnect = true,
    schema,
  } = options;

  const finalQueryKey = useMemo(() => {
    if (queryKey) return queryKey;
    const headers = fetcherOpts?.headers;
    const timeout = fetcherOpts?.timeout;
    const schemaKey = schema ? `schema:${Schema.format(schema)}` : null;
    return ['dataloader', url, params, headers, timeout, schemaKey].filter(Boolean);
  }, [queryKey, url, params, fetcherOpts, schema]);

  const enhancedFetcherOptions = useMemo((): FetcherOptions<T> => {
    const baseOptions: FetcherOptions<T> = {
      retries: 3,
      retryDelay: 1_000,
      timeout: 30_000,
      onError: (err) => {
        if (err instanceof ValidationError) {
          console.error(`[useDataLoader]: Validation failed - ${err.getProblemsString()}`);
        }
        if (onError && err instanceof Error) onError(err);
      },
      ...fetcherOpts,
    };
    if (schema) {
      return { ...baseOptions, schema } as FetcherOptions<T>;
    }
    return baseOptions;
  }, [fetcherOpts, onError, schema]);

  const queryFn = useCallback(async (): Promise<T> => {
    const result = await requestQueue.enqueue(
      url,
      'GET',
      async () => {
        const effect = pipe(
          get<T>(url, enhancedFetcherOptions as FetcherOptions<T>, params),
          Effect.provide(FetchHttpClient.layer),
        );
        return await Effect.runPromise(effect);
      },
      { headers: enhancedFetcherOptions?.headers, bypassDeduplication: false },
    );
    const finalResult = transform ? transform(result) : (result as T);
    if (onSuccess) onSuccess(finalResult);
    return finalResult;
  }, [url, enhancedFetcherOptions, params, transform, onSuccess]);

  const queryOptionsWithDefaults = useMemo(
    () => ({
      queryKey: finalQueryKey,
      queryFn,
      staleTime,
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnReconnect,
      retry: (failureCount: number, error: unknown) => {
        if (
          error instanceof ValidationError ||
          (error instanceof FetcherError &&
            error.status &&
            error.status >= 400 &&
            error.status < 500)
        ) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      ...queryOptions,
    }),
    [
      finalQueryKey,
      queryFn,
      staleTime,
      refetchInterval,
      refetchOnWindowFocus,
      refetchOnReconnect,
      queryOptions,
    ],
  );

  const { data, refetch, isRefetching } = useSuspenseQuery<T, Error>(queryOptionsWithDefaults);

  return {
    data,
    refetch: async () => {
      await refetch();
    },
    isRefetching,
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: finalQueryKey });
    },
  };
}

export default DataLoader;
