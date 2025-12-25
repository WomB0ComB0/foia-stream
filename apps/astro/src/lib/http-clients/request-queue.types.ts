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
 * @file Request queue type definitions for API request management
 * @module request-queue.types
 * @author FOIA Stream Team
 */

/**
 * Represents a pending request in the queue
 *
 * @template T The type of the response data
 */
export interface PendingRequest<T> {
  /** The promise that resolves to the response */
  promise: Promise<T>;
  /** Timestamp when the request was initiated */
  timestamp: number;
  /** Reference count for deduplication tracking */
  refCount: number;
}

/**
 * Rate limit configuration for API requests
 */
export interface RateLimitConfig {
  /** Minimum interval between requests to the same endpoint (ms) */
  minInterval: number;
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window for rate limiting (ms) */
  windowMs: number;
}

/**
 * Request timing data for rate limiting
 */
export interface RequestTiming {
  /** Timestamp of the last request */
  lastRequest: number;
  /** Array of request timestamps within the current window */
  requests: number[];
}
