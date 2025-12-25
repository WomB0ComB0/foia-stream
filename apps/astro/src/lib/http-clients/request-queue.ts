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
 * @file Request queue manager for preventing concurrent API requests
 * @module request-queue
 * @author FOIA Stream Team
 *
 * @description
 * Implements request deduplication, queuing, and throttling to prevent
 * rate limiting from external APIs. Ensures only one request per unique
 * endpoint is in flight at a time.
 *
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection)
 */

import type { PendingRequest, RateLimitConfig, RequestTiming } from './request-queue.types';

/**
 * Default rate limit configuration
 *
 * @constant
 * @type {RateLimitConfig}
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  minInterval: 100, // 100ms between same endpoint requests
  maxRequests: 10, // Max 10 requests per window
  windowMs: 60_000, // 1 minute window
};

/**
 * Singleton request queue manager
 *
 * Features:
 * - Automatic request deduplication
 * - Request queuing with timing control
 * - Per-endpoint rate limiting
 * - Exponential backoff on 429 responses
 * - Automatic cleanup of stale requests
 *
 * @class
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection)
 *
 * @example
 * ```typescript
 * const result = await requestQueue.enqueue(
 *   '/api/v1/requests',
 *   'GET',
 *   async () => {
 *     const response = await fetch('/api/v1/requests');
 *     return response.json();
 *   }
 * );
 * ```
 */
class RequestQueueManager {
  /** Map of endpoint URLs to pending requests */
  private pendingRequests = new Map<string, PendingRequest<unknown>>();

  /** Map of endpoint URLs to request timing data */
  private requestTimings = new Map<string, RequestTiming>();

  /** Map of endpoint patterns to rate limit configs */
  private rateLimits = new Map<string | RegExp, RateLimitConfig>();

  /** Global rate limit applied to all requests */
  private globalRateLimit: RateLimitConfig = DEFAULT_RATE_LIMIT;

  /** Cleanup interval ID */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start cleanup job to remove stale requests every 30 seconds
    if (typeof window !== 'undefined') {
      this.startCleanupJob();
    }
  }

  /**
   * Configure rate limit for a specific endpoint or pattern
   *
   * @param {string | RegExp} pattern - The endpoint pattern to match
   * @param {Partial<RateLimitConfig>} config - The rate limit configuration
   */
  public setRateLimit(pattern: string | RegExp, config: Partial<RateLimitConfig>): void {
    this.rateLimits.set(pattern, {
      ...DEFAULT_RATE_LIMIT,
      ...config,
    });
  }

  /**
   * Configure global rate limit
   *
   * @param {Partial<RateLimitConfig>} config - The rate limit configuration
   */
  public setGlobalRateLimit(config: Partial<RateLimitConfig>): void {
    this.globalRateLimit = {
      ...this.globalRateLimit,
      ...config,
    };
  }

  /**
   * Get rate limit config for a specific endpoint
   *
   * @param {string} url - The URL to get rate limit config for
   * @returns {RateLimitConfig} The rate limit configuration
   * @private
   */
  private getRateLimitConfig(url: string): RateLimitConfig {
    // Check for matching pattern
    for (const [pattern, config] of this.rateLimits.entries()) {
      if (pattern instanceof RegExp) {
        if (pattern.test(url)) return config;
      } else if (url.includes(pattern)) {
        return config;
      }
    }

    return this.globalRateLimit;
  }

  /**
   * Check if a request can be made based on rate limits
   *
   * @param {string} url - The URL to check
   * @returns {{ allowed: boolean; waitTime?: number }} Whether the request is allowed
   * @private
   */
  private canMakeRequest(url: string): { allowed: boolean; waitTime?: number } {
    const config = this.getRateLimitConfig(url);
    const timing = this.requestTimings.get(url);
    const now = Date.now();

    if (!timing) {
      return { allowed: true };
    }

    // Check minimum interval between requests
    const timeSinceLastRequest = now - timing.lastRequest;
    if (timeSinceLastRequest < config.minInterval) {
      return {
        allowed: false,
        waitTime: config.minInterval - timeSinceLastRequest,
      };
    }

    // Check max requests per window
    const recentRequests = timing.requests.filter((timestamp) => now - timestamp < config.windowMs);

    if (recentRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = config.windowMs - (now - oldestRequest);
      return {
        allowed: false,
        waitTime: Math.max(waitTime, 0),
      };
    }

    return { allowed: true };
  }

  /**
   * Record a request for rate limiting tracking
   *
   * @param {string} url - The URL that was requested
   * @private
   */
  private recordRequest(url: string): void {
    const now = Date.now();
    const config = this.getRateLimitConfig(url);

    const timing = this.requestTimings.get(url) || {
      lastRequest: 0,
      requests: [],
    };

    // Add current request
    timing.lastRequest = now;
    timing.requests.push(now);

    // Clean up old requests outside the window
    timing.requests = timing.requests.filter((timestamp) => now - timestamp < config.windowMs);

    this.requestTimings.set(url, timing);
  }

  /**
   * Generate a cache key for request deduplication
   *
   * @param {string} url - The URL
   * @param {string} method - The HTTP method
   * @param {unknown} body - The request body
   * @param {Record<string, string>} headers - The request headers
   * @returns {string} The cache key
   * @private
   */
  private getCacheKey(
    url: string,
    method: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): string {
    const parts = [method, url];

    if (body) {
      parts.push(JSON.stringify(body));
    }

    // Include relevant headers that affect response (e.g., Authorization)
    if (headers) {
      const relevantHeaders = ['authorization', 'content-type'];
      for (const key of relevantHeaders) {
        const value = headers[key.toLowerCase()];
        if (value) parts.push(`${key}:${value}`);
      }
    }

    return parts.join('|');
  }

  /**
   * Execute a request with deduplication, queueing, and rate limiting
   *
   * @template T The type of the response data
   * @param {string} url - The URL to request
   * @param {string} method - The HTTP method
   * @param {() => Promise<T>} executor - The function that executes the request
   * @param {Object} options - Additional options
   * @param {unknown} options.body - The request body
   * @param {Record<string, string>} options.headers - The request headers
   * @param {boolean} options.bypassDeduplication - Whether to bypass deduplication
   * @returns {Promise<T>} The response data
   *
   * @example
   * ```typescript
   * const data = await requestQueue.enqueue(
   *   '/api/v1/users',
   *   'GET',
   *   async () => {
   *     const res = await fetch('/api/v1/users');
   *     return res.json();
   *   },
   *   { bypassDeduplication: false }
   * );
   * ```
   */
  public async enqueue<T>(
    url: string,
    method: string,
    executor: () => Promise<T>,
    options?: {
      body?: unknown;
      headers?: Record<string, string>;
      bypassDeduplication?: boolean;
    },
  ): Promise<T> {
    const cacheKey = this.getCacheKey(url, method, options?.body, options?.headers);

    // Check if there's already a pending request for this exact call
    if (!options?.bypassDeduplication) {
      const pending = this.pendingRequests.get(cacheKey);
      if (pending) {
        pending.refCount++;
        console.info(
          `[RequestQueue] Deduplicating request to ${url} (${pending.refCount} consumers)`,
        );
        return pending.promise as Promise<T>;
      }
    }

    // Check rate limits
    const rateCheck = this.canMakeRequest(url);
    if (!rateCheck.allowed && rateCheck.waitTime) {
      console.info(`[RequestQueue] Rate limit reached for ${url}, waiting ${rateCheck.waitTime}ms`);
      await this.sleep(rateCheck.waitTime);
    }

    // Record the request
    this.recordRequest(url);

    // Create and store the pending request
    const promise = executor()
      .then((result) => {
        this.pendingRequests.delete(cacheKey);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(cacheKey);

        // Handle 429 rate limit responses
        if (this.is429Error(error)) {
          console.warn(`[RequestQueue] 429 Rate Limit hit for ${url}`);
          // Increase minimum interval for this endpoint
          const currentConfig = this.getRateLimitConfig(url);
          this.setRateLimit(url, {
            minInterval: Math.min(currentConfig.minInterval * 2, 5000),
          });
        }

        throw error;
      });

    this.pendingRequests.set(cacheKey, {
      promise,
      timestamp: Date.now(),
      refCount: 1,
    });

    console.info(`[RequestQueue] Executing request to ${url}`);
    return promise;
  }

  /**
   * Check if an error is a 429 rate limit error
   *
   * @param {unknown} error - The error to check
   * @returns {boolean} Whether the error is a 429 error
   * @private
   */
  private is429Error(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as Record<string, unknown>;
    return (
      err.status === 429 ||
      (err.response as Record<string, unknown> | undefined)?.status === 429 ||
      (typeof err.message === 'string' && err.message.includes('429')) ||
      (typeof err.message === 'string' && err.message.toLowerCase().includes('rate limit'))
    );
  }

  /**
   * Sleep for a specified number of milliseconds
   *
   * @param {number} ms - The number of milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Start cleanup job to remove stale requests
   *
   * @private
   */
  private startCleanupJob(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      // Clean up stale pending requests
      for (const [key, pending] of this.pendingRequests.entries()) {
        if (now - pending.timestamp > staleThreshold) {
          this.pendingRequests.delete(key);
          console.warn(`[RequestQueue] Cleaned up stale request: ${key}`);
        }
      }

      // Clean up old timing data
      for (const [url, timing] of this.requestTimings.entries()) {
        if (now - timing.lastRequest > staleThreshold) {
          this.requestTimings.delete(url);
        }
      }
    }, 30_000); // Run every 30 seconds
  }

  /**
   * Stop cleanup job (for testing or shutdown)
   */
  public stopCleanupJob(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all pending requests (for testing)
   */
  public clear(): void {
    this.pendingRequests.clear();
    this.requestTimings.clear();
  }

  /**
   * Get statistics about current queue state
   *
   * @returns {{ pendingRequests: number; trackedEndpoints: number; rateLimitConfigs: number }}
   */
  public getStats(): {
    pendingRequests: number;
    trackedEndpoints: number;
    rateLimitConfigs: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      trackedEndpoints: this.requestTimings.size,
      rateLimitConfigs: this.rateLimits.size,
    };
  }
}

// Export singleton instance
export const requestQueue = new RequestQueueManager();

// Configure rate limits for FOIA Stream endpoints
requestQueue.setRateLimit('/api/v1/requests', {
  minInterval: 200,
  maxRequests: 20,
  windowMs: 60_000,
});

requestQueue.setRateLimit('/api/v1/agencies', {
  minInterval: 100,
  maxRequests: 30,
  windowMs: 60_000,
});

requestQueue.setRateLimit('/api/v1/templates', {
  minInterval: 200,
  maxRequests: 15,
  windowMs: 60_000,
});

requestQueue.setRateLimit('/api/v1/auth', {
  minInterval: 500,
  maxRequests: 10,
  windowMs: 60_000,
});

// Global default for all other endpoints
requestQueue.setGlobalRateLimit({
  minInterval: 100,
  maxRequests: 20,
  windowMs: 60_000,
});
