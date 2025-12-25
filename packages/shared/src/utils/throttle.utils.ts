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
 * @file Throttle and Debounce Utilities
 * @module utils/throttle
 * @author FOIA Stream Team
 * @description Provides functions to limit the rate at which functions can be called.
 *              Useful for preventing excessive API calls and managing request frequency.
 *              Includes throttle, debounce, rate limiter, and queue utilities.
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection)
 */

import { Schema as S } from 'effect';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Throttle Options Schema
 */
const ThrottleOptionsSchema = S.Struct({
  /** Whether to call the function on the leading edge */
  leading: S.optional(S.Boolean),
  /** Whether to call the function on the trailing edge */
  trailing: S.optional(S.Boolean),
});

export type ThrottleOptions = typeof ThrottleOptionsSchema.Type;

/**
 * Debounce Options Schema
 */
const DebounceOptionsSchema = S.Struct({
  /** Whether to call the function on the leading edge */
  leading: S.optional(S.Boolean),
  /** Maximum time to wait before forcing execution */
  maxWait: S.optional(S.Number),
});

export type DebounceOptions = typeof DebounceOptionsSchema.Type;

/**
 * Rate Limiter Stats Schema
 */
const RateLimiterStatsSchema = S.Struct({
  availableTokens: S.Number,
  queueSize: S.Number,
  capacity: S.Number,
});

export type RateLimiterStats = typeof RateLimiterStatsSchema.Type;

/**
 * Keyed Stats Schema
 */
const KeyedStatsSchema = S.Struct({
  activeKeys: S.Number,
  keys: S.Array(S.String),
});

export type KeyedStats = typeof KeyedStatsSchema.Type;

// ============================================
// Generic Function Type
// ============================================

/** Generic callable function type */
type AnyFunction = (...args: never[]) => unknown;

// ============================================
// Throttle Function
// ============================================

/**
 * Throttle a function to only execute once per specified interval
 *
 * @param func Function to throttle
 * @param wait Wait time in milliseconds
 * @param options Throttle options
 * @returns Throttled function
 *
 * @example
 * ```ts
 * const fetchData = throttle(() => fetch('/api/data'), 1000);
 * fetchData(); // Executes immediately
 * fetchData(); // Ignored
 * fetchData(); // Ignored
 * // After 1000ms, next call will execute
 * ```
 */
export function throttle<T extends AnyFunction>(
  func: T,
  wait: number,
  options: ThrottleOptions = {},
): ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  let result: ReturnType<T> | undefined;

  const { leading = true, trailing = true } = options;

  const later = (context: unknown, args: Parameters<T>) => {
    previous = leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args) as ReturnType<T>;
  };

  const throttled = function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();

    if (!previous && leading === false) {
      previous = now;
    }

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(this, args) as ReturnType<T>;
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => later(this, args), remaining);
    }

    return result;
  } as ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void };

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
  };

  return throttled;
}

// ============================================
// Debounce Function
// ============================================

/**
 * Debounce a function to only execute after it stops being called for specified time
 *
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @param options Debounce options
 * @returns Debounced function
 *
 * @example
 * ```ts
 * const search = debounce((query) => fetchSearchResults(query), 300);
 * search('a'); // Waiting...
 * search('ab'); // Waiting...
 * search('abc'); // Executes after 300ms of no calls
 * ```
 */
export function debounce<T extends AnyFunction>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;

  const { leading = false, maxWait } = options;

  const invokeFunc = (context: unknown, args: Parameters<T>) => {
    lastInvokeTime = Date.now();
    func.apply(context, args);
  };

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };

  const timerExpired = function (this: unknown, args: Parameters<T>) {
    timeout = null;
    invokeFunc(this, args);
  };

  const debounced = function (this: unknown, ...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastCallTime = time;

    if (isInvoking && timeout === null && leading) {
      invokeFunc(this, args);
      timeout = setTimeout(() => timerExpired.call(this, args), wait);
      return;
    }

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => timerExpired.call(this, args), wait);
  } as ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastCallTime = 0;
    lastInvokeTime = 0;
  };

  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

// ============================================
// Keyed Throttle Manager
// ============================================

/**
 * Per-key throttle manager for throttling by specific keys
 * Useful for throttling per-endpoint or per-user
 */
export class KeyedThrottle<T extends AnyFunction> {
  private throttles = new Map<
    string,
    ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void }
  >();
  private readonly func: T;
  private readonly wait: number;
  private readonly options: ThrottleOptions;

  constructor(func: T, wait: number, options: ThrottleOptions = {}) {
    this.func = func;
    this.wait = wait;
    this.options = options;
  }

  /**
   * Execute function with throttling per key
   */
  public execute(key: string, ...args: Parameters<T>): ReturnType<T> | undefined {
    let throttled = this.throttles.get(key);

    if (!throttled) {
      throttled = throttle(this.func, this.wait, this.options);
      this.throttles.set(key, throttled);
    }

    return throttled(...args);
  }

  /**
   * Cancel throttle for specific key
   */
  public cancel(key: string): void {
    const throttled = this.throttles.get(key);
    if (throttled) {
      throttled.cancel();
    }
    this.throttles.delete(key);
  }

  /**
   * Cancel all throttles
   */
  public cancelAll(): void {
    for (const throttled of this.throttles.values()) {
      throttled.cancel();
    }
    this.throttles.clear();
  }

  /**
   * Get stats
   */
  public getStats(): KeyedStats {
    return {
      activeKeys: this.throttles.size,
      keys: Array.from(this.throttles.keys()),
    };
  }
}

// ============================================
// Keyed Debounce Manager
// ============================================

/**
 * Per-key debounce manager for debouncing by specific keys
 * Useful for debouncing per-endpoint or per-user
 */
export class KeyedDebounce<T extends AnyFunction> {
  private debounces = new Map<
    string,
    ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void }
  >();
  private readonly func: T;
  private readonly wait: number;
  private readonly options: DebounceOptions;

  constructor(func: T, wait: number, options: DebounceOptions = {}) {
    this.func = func;
    this.wait = wait;
    this.options = options;
  }

  /**
   * Execute function with debouncing per key
   */
  public execute(key: string, ...args: Parameters<T>): void {
    let debounced = this.debounces.get(key);

    if (!debounced) {
      debounced = debounce(this.func, this.wait, this.options);
      this.debounces.set(key, debounced);
    }

    debounced(...args);
  }

  /**
   * Cancel debounce for specific key
   */
  public cancel(key: string): void {
    const debounced = this.debounces.get(key);
    if (debounced) {
      debounced.cancel();
    }
    this.debounces.delete(key);
  }

  /**
   * Flush debounce for specific key (execute immediately)
   */
  public flush(key: string): void {
    const debounced = this.debounces.get(key);
    if (debounced) {
      debounced.flush();
    }
  }

  /**
   * Cancel all debounces
   */
  public cancelAll(): void {
    for (const debounced of this.debounces.values()) {
      debounced.cancel();
    }
    this.debounces.clear();
  }

  /**
   * Get stats
   */
  public getStats(): KeyedStats {
    return {
      activeKeys: this.debounces.size,
      keys: Array.from(this.debounces.keys()),
    };
  }
}

// ============================================
// Token Bucket Rate Limiter
// ============================================

/**
 * Rate limiter using token bucket algorithm
 *
 * @example
 * ```ts
 * const limiter = new TokenBucketLimiter(5, 60000); // 5 requests per minute
 *
 * async function fetchData() {
 *   await limiter.acquire();
 *   return fetch('/api/data');
 * }
 * ```
 */
export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;
  private queue: Array<() => void> = [];

  /**
   * @param capacity Maximum number of tokens (requests)
   * @param windowMs Time window in milliseconds
   */
  constructor(capacity: number, windowMs: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillRate = capacity;
    this.refillInterval = windowMs;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Acquire a token (wait if none available)
   */
  public async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    // Wait for token to become available
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.scheduleNextRelease();
    });
  }

  /**
   * Try to acquire a token without waiting
   */
  public tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Schedule next token release
   */
  private scheduleNextRelease(): void {
    if (this.queue.length === 0) return;

    const waitTime = this.refillInterval / this.refillRate;

    setTimeout(() => {
      this.refill();
      const resolve = this.queue.shift();
      if (resolve && this.tokens >= 1) {
        this.tokens -= 1;
        resolve();
      }
      this.scheduleNextRelease();
    }, waitTime);
  }

  /**
   * Get rate limiter stats
   */
  public getStats(): RateLimiterStats {
    this.refill();
    return {
      availableTokens: Math.floor(this.tokens),
      queueSize: this.queue.length,
      capacity: this.capacity,
    };
  }

  /**
   * Reset the rate limiter
   */
  public reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.queue = [];
  }
}

// ============================================
// Leaky Bucket Rate Limiter
// ============================================

/**
 * Leaky bucket algorithm - requests "leak" out at a constant rate
 * Provides smoother rate limiting than token bucket
 */
export class LeakyBucketLimiter {
  private queue: Array<{ resolve: () => void; timestamp: number }> = [];
  private readonly capacity: number;
  private readonly leakRate: number; // requests per second
  private processing = false;

  /**
   * @param capacity Maximum queue size
   * @param requestsPerSecond How many requests to process per second
   */
  constructor(capacity: number, requestsPerSecond: number) {
    this.capacity = capacity;
    this.leakRate = 1000 / requestsPerSecond; // ms between requests
  }

  /**
   * Add a request to the bucket
   */
  public async acquire(): Promise<void> {
    if (this.queue.length >= this.capacity) {
      throw new Error('Rate limit exceeded: queue full');
    }

    return new Promise<void>((resolve) => {
      this.queue.push({ resolve, timestamp: Date.now() });
      this.processQueue();
    });
  }

  /**
   * Try to acquire without blocking
   */
  public tryAcquire(): boolean {
    if (this.queue.length >= this.capacity) {
      return false;
    }

    // Check if we can process immediately
    if (!this.processing && this.queue.length === 0) {
      return true;
    }

    return false;
  }

  /**
   * Process the queue at the leak rate
   */
  private processQueue(): void {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    const processNext = () => {
      const item = this.queue.shift();
      if (item) {
        item.resolve();
      }

      if (this.queue.length > 0) {
        setTimeout(processNext, this.leakRate);
      } else {
        this.processing = false;
      }
    };

    processNext();
  }

  /**
   * Get stats
   */
  public getStats(): RateLimiterStats {
    return {
      availableTokens: this.capacity - this.queue.length,
      queueSize: this.queue.length,
      capacity: this.capacity,
    };
  }

  /**
   * Clear the queue
   */
  public reset(): void {
    this.queue = [];
    this.processing = false;
  }
}

// ============================================
// Sliding Window Counter
// ============================================

/**
 * Sliding window counter for accurate rate limiting
 */
export class SlidingWindowCounter {
  private counters = new Map<string, { current: number; previous: number; windowStart: number }>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), windowMs);
  }

  /**
   * Check and increment counter for a key
   */
  public check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const previousWindowStart = windowStart - this.windowMs;

    let counter = this.counters.get(key);

    if (!counter) {
      counter = { current: 0, previous: 0, windowStart };
      this.counters.set(key, counter);
    }

    // Roll over to new window if needed
    if (counter.windowStart < previousWindowStart) {
      counter.previous = 0;
      counter.current = 0;
      counter.windowStart = windowStart;
    } else if (counter.windowStart < windowStart) {
      counter.previous = counter.current;
      counter.current = 0;
      counter.windowStart = windowStart;
    }

    // Calculate weighted count
    const windowPosition = (now - windowStart) / this.windowMs;
    const weightedCount = counter.previous * (1 - windowPosition) + counter.current;

    const allowed = weightedCount < this.maxRequests;

    if (allowed) {
      counter.current++;
    }

    return {
      allowed,
      remaining: Math.max(0, Math.floor(this.maxRequests - weightedCount - (allowed ? 1 : 0))),
      resetAt: windowStart + this.windowMs,
    };
  }

  /**
   * Reset counter for a key
   */
  public reset(key: string): void {
    this.counters.delete(key);
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, counter] of this.counters.entries()) {
      if (counter.windowStart < cutoff) {
        this.counters.delete(key);
      }
    }
  }

  /**
   * Get stats
   */
  public getStats(): KeyedStats {
    return {
      activeKeys: this.counters.size,
      keys: Array.from(this.counters.keys()),
    };
  }
}

// ============================================
// Exports
// ============================================

export { DebounceOptionsSchema, KeyedStatsSchema, RateLimiterStatsSchema, ThrottleOptionsSchema };
