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
 * @file Shared Middleware Utilities
 * @module middleware/shared
 * @author FOIA Stream Team
 * @description Provides centralized cache headers and error handling utilities
 *              for consistent behavior across all API routes.
 * @compliance NIST 800-53 SI-11 (Error Handling)
 */

import type { Context, MiddlewareHandler } from 'hono';

import { logger } from '@/lib/logger';

// ============================================
// Cache Configuration Types
// ============================================

/**
 * Cache configuration for request/response handling
 */
export interface CacheConfig {
  /** Content-Type header value */
  contentType?: string;
  /** Cache-Control header value */
  cacheControl?: string;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Context name for logging (e.g., 'fetching documents') */
  context: string;
  /** Custom error message generator */
  customMessage?: (error: unknown) => string;
  /** Whether to include error details in response (dev only) */
  includeErrorDetails?: boolean;
}

// ============================================
// Cache Presets
// ============================================

/**
 * Preset cache configurations for common patterns
 *
 * @example
 * ```typescript
 * // Use preset directly
 * const headers = CachePresets.Medium;
 *
 * // Or with factory
 * const getHeaders = createCacheHeaders('Short');
 * ```
 */
export const CachePresets = {
  /** No caching, always revalidate */
  NoCache: {
    contentType: 'application/json',
    cacheControl: 'no-cache, no-store, must-revalidate, max-age=0',
  },
  /** Short cache: 1 minute with 30s stale-while-revalidate */
  Short: {
    contentType: 'application/json',
    cacheControl: 'public, s-maxage=60, stale-while-revalidate=30',
  },
  /** Medium cache: 1 hour with 30 min stale-while-revalidate */
  Medium: {
    contentType: 'application/json',
    cacheControl: 'public, s-maxage=3600, stale-while-revalidate=1800',
  },
  /** Long cache: 24 hours with 12 hour stale-while-revalidate */
  Long: {
    contentType: 'application/json',
    cacheControl: 'public, s-maxage=86400, stale-while-revalidate=43200',
  },
  /** JSON only, no cache control specified */
  JsonOnly: {
    contentType: 'application/json',
  },
  /** Private cache: user-specific data, 5 min cache */
  Private: {
    contentType: 'application/json',
    cacheControl: 'private, max-age=300',
  },
} as const;

export type CachePresetName = keyof typeof CachePresets;

// ============================================
// Cache Header Utilities
// ============================================

/**
 * Creates a function that returns cache-related HTTP headers
 *
 * @param config - Cache configuration or preset name
 * @returns Function that returns headers object
 *
 * @example
 * ```typescript
 * const getHeaders = createCacheHeaders('Short');
 * const headers = getHeaders();
 * // { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=60, ...' }
 * ```
 */
export function createCacheHeaders(
  config: CacheConfig | CachePresetName = 'JsonOnly',
): () => Record<string, string> {
  const actualConfig: CacheConfig = typeof config === 'string' ? CachePresets[config] : config;

  return () => {
    const headers: Record<string, string> = {};

    if (actualConfig.contentType) {
      headers['Content-Type'] = actualConfig.contentType;
    }

    if (actualConfig.cacheControl) {
      headers['Cache-Control'] = actualConfig.cacheControl;
    }

    return headers;
  };
}

/**
 * Hono middleware for applying cache headers to responses
 *
 * @param config - Cache configuration or preset name
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * // Apply to specific routes
 * router.use('/public/*', cacheMiddleware('Medium'));
 *
 * // Or with custom config
 * router.use('/api/*', cacheMiddleware({ cacheControl: 'private, max-age=120' }));
 * ```
 */
export function cacheMiddleware(
  config: CacheConfig | CachePresetName = 'JsonOnly',
): MiddlewareHandler {
  const getHeaders = createCacheHeaders(config);

  return async (c, next) => {
    await next();

    const headers = getHeaders();
    for (const [key, value] of Object.entries(headers)) {
      c.res.headers.set(key, value);
    }
  };
}

// ============================================
// Error Handling Utilities
// ============================================

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Creates a reusable error handler for route handlers
 *
 * @param config - Error handler configuration
 * @returns Error handling function
 *
 * @example
 * ```typescript
 * const handleError = createErrorHandler({ context: 'fetching documents' });
 *
 * // In route handler
 * try {
 *   // ... route logic
 * } catch (error) {
 *   const { message, status } = handleError(error);
 *   return c.json({ success: false, error: message }, status);
 * }
 * ```
 */
export function createErrorHandler(config: ErrorHandlerConfig) {
  return (error: unknown): { message: string; status: number; code?: string } => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log the error with context
    logger.error(
      {
        context: config.context,
        error: errorMessage,
        stack: config.includeErrorDetails ? errorStack : undefined,
      },
      `Error ${config.context}`,
    );

    // Determine response message
    let message: string;
    if (config.customMessage) {
      message = config.customMessage(error);
    } else if (config.includeErrorDetails && error instanceof Error) {
      message = error.message;
    } else {
      message = `Failed to ${config.context}`;
    }

    // Determine status code
    const status = getErrorStatusCode(error);

    return {
      message,
      status,
      code: getErrorCode(error),
    };
  };
}

/**
 * Creates an error handler that returns default data on failure
 * Useful for endpoints that should always return data (e.g., analytics)
 *
 * @param config - Error handler configuration
 * @param defaultData - Default data to return on error
 * @returns Error handler that includes default data
 *
 * @example
 * ```typescript
 * const handleError = createErrorHandlerWithDefault(
 *   { context: 'fetching stats' },
 *   { totalRequests: 0, avgResponseTime: 0 }
 * );
 * ```
 */
export function createErrorHandlerWithDefault<T extends Record<string, unknown>>(
  config: ErrorHandlerConfig,
  defaultData: T,
) {
  return (error: unknown): T & { error: string } => {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        context: config.context,
        error: errorMessage,
      },
      `Error ${config.context} (returning default)`,
    );

    return {
      ...defaultData,
      error: config.customMessage ? config.customMessage(error) : errorMessage,
    };
  };
}

/**
 * Standardized route error handler - wraps try/catch logic
 *
 * @param c - Hono context
 * @param error - The caught error
 * @param context - Error context for logging
 * @returns JSON error response
 *
 * @example
 * ```typescript
 * try {
 *   // ... route logic
 * } catch (error) {
 *   return handleRouteError(c, error, 'creating document');
 * }
 * ```
 */
export function handleRouteError(c: Context, error: unknown, context: string) {
  const handler = createErrorHandler({ context });
  const { message, status } = handler(error);

  return c.json({ success: false, error: message }, status as 400 | 401 | 403 | 404 | 500);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract HTTP status code from error
 */
function getErrorStatusCode(error: unknown): number {
  if (error && typeof error === 'object') {
    // Check for common status code properties
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    if ('code' in error) {
      // Map common error codes
      const code = error.code;
      if (code === 'UNAUTHORIZED' || code === 'INVALID_TOKEN') return 401;
      if (code === 'FORBIDDEN' || code === 'ACCESS_DENIED') return 403;
      if (code === 'NOT_FOUND') return 404;
      if (code === 'CONFLICT' || code === 'DUPLICATE') return 409;
      if (code === 'VALIDATION_ERROR') return 400;
    }
  }
  return 500;
}

/**
 * Extract error code from error object
 */
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return undefined;
}
