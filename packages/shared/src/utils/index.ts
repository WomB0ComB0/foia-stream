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

// @foia-stream/shared - Shared utilities
export * from './errors';
// Fetcher exports (ValidationError and FetcherError are fetch-specific)
export {
  FetcherError,
  ValidationError as FetcherValidationError,
  createApiResponseSchema,
  createPaginatedSchema,
  del,
  fetcher,
  get,
  head,
  options,
  patch,
  post,
  put,
  type Headers as FetcherHeaders,
  type FetcherOptions,
  type HttpMethod,
  type QueryParams,
  type RequestBody,
} from './fetcher';
// Redaction and sanitization utilities
export * from './redacted';
export * from './sanitize';
export * from './throttle.utils';
