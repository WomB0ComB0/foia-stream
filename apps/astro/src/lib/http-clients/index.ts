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
 * @file HTTP clients module exports
 * @module http-clients
 * @author FOIA Stream Team
 *
 * @description
 * Central export point for HTTP client utilities including the Effect-based fetcher,
 * request queue manager, and related types.
 */

// Re-export fetcher utilities from shared package
export {
  createApiResponseSchema,
  createPaginatedSchema,
  del,
  FetcherError,
  type FetcherHeaders,
  type FetcherOptions,
  FetcherValidationError as ValidationError,
  fetcher,
  get,
  type HttpMethod,
  head,
  options,
  patch,
  post,
  put,
  type QueryParams,
  type RequestBody,
} from '@foia-stream/shared';

// Export request queue
export { requestQueue } from './request-queue';
export type {
  PendingRequest,
  RateLimitConfig,
  RequestTiming,
} from './request-queue.types';
