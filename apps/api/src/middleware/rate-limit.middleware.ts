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
 * @file Rate Limiting Middleware
 * @module middleware/rate-limit
 * @author FOIA Stream Team
 * @description Provides protection against brute force and DDoS attacks.
 *              Integrates with banlist service for IP blocking and slowmode.
 *              Implements multiple rate limiting strategies including fixed window
 *              and sliding window algorithms.
 * @compliance NIST 800-53 SC-5 (Denial of Service Protection)
 *
 * Addresses: GAP-007 (Rate Limiting)
 * Controls: SC-5, A.8.6, 3.13.13
 */

import {
  banIdentifier,
  getMatchingBannedCIDR,
  getSlowmodeMultiplier,
  isIdentifierBanned,
  isIdentifierSlowed,
  isIPInBannedCIDR,
} from '@/services';
import { Schema as S } from 'effect';
import type { Context, MiddlewareHandler, Next } from 'hono';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Rate Limit Config Schema
 */
const RateLimitConfigSchema = S.Struct({
  /** Window size in milliseconds */
  windowMs: S.Number,
  /** Maximum requests per window */
  maxRequests: S.Number,
  /** Whether to include path in the key */
  perRoute: S.optional(S.Boolean),
  /** Headers to include in response */
  headers: S.optional(S.Boolean),
});

export type RateLimitConfig = typeof RateLimitConfigSchema.Type;

/**
 * Extended config with function types (non-serializable)
 */
export interface ExtendedRateLimitConfig extends RateLimitConfig {
  /** Custom key generator (defaults to IP address) */
  keyGenerator?: (c: Context) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (c: Context) => boolean;
  /** Custom response when rate limited */
  handler?: (c: Context) => Response;
}

/**
 * Rate Limit State Schema
 */
const RateLimitStateSchema = S.Struct({
  count: S.Number,
  resetTime: S.Number,
});

/**
 * Rate Limit State (mutable for internal use)
 */
interface MutableRateLimitState {
  count: number;
  resetTime: number;
}

export type RateLimitState = typeof RateLimitStateSchema.Type;

/**
 * Rate Limit Check Result Schema
 */
const RateLimitCheckResultSchema = S.Struct({
  limited: S.Boolean,
  remaining: S.Number,
  resetTime: S.Number,
  total: S.Number,
});

export type RateLimitCheckResult = typeof RateLimitCheckResultSchema.Type;

/**
 * Sliding Window Check Result Schema
 */
const SlidingWindowCheckResultSchema = S.Struct({
  limited: S.Boolean,
  remaining: S.Number,
  oldestRequest: S.optional(S.Number),
});

export type SlidingWindowCheckResult = typeof SlidingWindowCheckResultSchema.Type;

/**
 * Rate Limit Error Response Schema
 */
const RateLimitErrorResponseSchema = S.Struct({
  error: S.String,
  message: S.String,
  retryAfter: S.optional(S.Number),
});

export type RateLimitErrorResponse = typeof RateLimitErrorResponseSchema.Type;

/**
 * Rate Limit Preset Schema
 */
const RateLimitPresetSchema = S.Struct({
  windowMs: S.Number,
  maxRequests: S.Number,
  perRoute: S.optional(S.Boolean),
});

export type RateLimitPreset = typeof RateLimitPresetSchema.Type;

/**
 * Rate Limit Stats Schema
 */
const RateLimitStatsSchema = S.Struct({
  activeKeys: S.Number,
  totalRequests: S.Number,
  totalBlocked: S.Number,
});

export type RateLimitStats = typeof RateLimitStatsSchema.Type;

// ============================================
// Rate Limit Store Implementation
// ============================================

/**
 * In-memory rate limit store
 */
class RateLimitStore {
  private store = new Map<string, MutableRateLimitState>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = { totalRequests: 0, totalBlocked: 0 };

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check and increment rate limit for a key
   */
  check(key: string, windowMs: number, maxRequests: number): RateLimitCheckResult {
    const now = Date.now();
    const state = this.store.get(key);
    this.stats.totalRequests++;

    if (!state || state.resetTime <= now) {
      const newState: MutableRateLimitState = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.store.set(key, newState);
      return {
        limited: false,
        remaining: maxRequests - 1,
        resetTime: newState.resetTime,
        total: maxRequests,
      };
    }

    state.count++;
    this.store.set(key, state);

    const limited = state.count > maxRequests;
    const remaining = Math.max(0, maxRequests - state.count);

    if (limited) {
      this.stats.totalBlocked++;
    }

    return {
      limited,
      remaining,
      resetTime: state.resetTime,
      total: maxRequests,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get store statistics
   */
  getStats(): RateLimitStats {
    return {
      activeKeys: this.store.size,
      ...this.stats,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.store.entries()) {
      if (state.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global store instance
const globalStore = new RateLimitStore();

// ============================================
// Rate Limit Presets
// ============================================

/**
 * Default rate limit configurations for different use cases
 */
export const RATE_LIMIT_PRESETS: Record<string, RateLimitPreset> = {
  /** Strict limit for authentication endpoints */
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    perRoute: true,
  },
  /** Standard API rate limit */
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  /** Relaxed limit for read operations */
  read: {
    windowMs: 60 * 1000,
    maxRequests: 200,
  },
  /** Very strict for password reset */
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    perRoute: true,
  },
  /** Limit for file uploads */
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get client IP address from request
 */
function getClientIP(c: Context): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIP = c.req.header('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

// ============================================
// Rate Limit Middleware
// ============================================

// Default values
const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 100;

/**
 * Create a rate limiting middleware with banlist integration
 */
export function rateLimit(config: Partial<ExtendedRateLimitConfig> = {}): MiddlewareHandler {
  const {
    windowMs = RATE_LIMIT_PRESETS.api?.windowMs ?? DEFAULT_WINDOW_MS,
    maxRequests = RATE_LIMIT_PRESETS.api?.maxRequests ?? DEFAULT_MAX_REQUESTS,
    keyGenerator = getClientIP,
    perRoute = false,
    skip,
    handler,
    headers = true,
  } = config;

  return async (c: Context, next: Next) => {
    if (skip?.(c)) {
      return next();
    }

    const ip = getClientIP(c);

    // Check if IP is banned (individual or CIDR range)
    if (isIdentifierBanned(ip)) {
      return c.json(
        {
          error: 'Forbidden',
          message: 'Your IP address has been banned.',
        } satisfies RateLimitErrorResponse,
        403,
      );
    }

    if (isIPInBannedCIDR(ip)) {
      const matchedCIDR = getMatchingBannedCIDR(ip);
      return c.json(
        {
          error: 'Forbidden',
          message: 'Your IP range has been blocked.',
          blockedRange: matchedCIDR,
        },
        403,
      );
    }

    let key = keyGenerator(c);
    if (perRoute) {
      key = `${key}:${c.req.method}:${c.req.path}`;
    }

    // Apply slowmode multiplier if IP is in slowmode
    let effectiveMaxRequests = maxRequests;
    if (isIdentifierSlowed(ip)) {
      const multiplier = getSlowmodeMultiplier(ip);
      effectiveMaxRequests = Math.max(1, Math.floor(maxRequests / multiplier));
    }

    const result = globalStore.check(key, windowMs, effectiveMaxRequests);

    if (headers) {
      c.header('X-RateLimit-Limit', result.total.toString());
      c.header('X-RateLimit-Remaining', result.remaining.toString());
      c.header('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    }

    if (result.limited) {
      if (headers) {
        c.header('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
      }

      if (handler) {
        return handler(c);
      }

      const errorResponse: RateLimitErrorResponse = {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      };

      return c.json(errorResponse, 429);
    }

    return next();
  };
}

// ============================================
// Pre-configured Middleware
// ============================================

/**
 * Rate limit specifically for login attempts
 */
export const authRateLimit = rateLimit({
  ...RATE_LIMIT_PRESETS.auth,
  handler: (c) =>
    c.json(
      {
        error: 'Too many login attempts',
        message: 'Please wait before trying again.',
      } satisfies RateLimitErrorResponse,
      429,
    ),
});

/**
 * Rate limit for password reset endpoints
 */
export const passwordResetRateLimit = rateLimit({
  ...RATE_LIMIT_PRESETS.passwordReset,
  handler: (c) =>
    c.json(
      {
        error: 'Too many password reset attempts',
        message: 'Please wait before requesting another password reset.',
      } satisfies RateLimitErrorResponse,
      429,
    ),
});

/**
 * Rate limit for file uploads
 */
export const uploadRateLimit = rateLimit({
  ...RATE_LIMIT_PRESETS.upload,
  handler: (c) =>
    c.json(
      {
        error: 'Upload limit exceeded',
        message: 'You have exceeded the file upload limit. Please try again later.',
      } satisfies RateLimitErrorResponse,
      429,
    ),
});

/**
 * Rate limit for general API endpoints
 */
export const apiRateLimit = rateLimit(RATE_LIMIT_PRESETS.api);

/**
 * Rate limit for read-heavy endpoints
 */
export const readRateLimit = rateLimit(RATE_LIMIT_PRESETS.read);

// ============================================
// Sliding Window Rate Limiter
// ============================================

/**
 * Sliding window rate limiter store
 */
class SlidingWindowStore {
  private store = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  check(key: string, windowMs: number, maxRequests: number): SlidingWindowCheckResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.store.get(key) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    const limited = timestamps.length >= maxRequests;

    if (!limited) {
      timestamps.push(now);
      this.store.set(key, timestamps);
    }

    return {
      limited,
      remaining: Math.max(0, maxRequests - timestamps.length),
      oldestRequest: timestamps[0],
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - 3600000;

    for (const [key, timestamps] of this.store.entries()) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, filtered);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const slidingWindowStore = new SlidingWindowStore();

/**
 * Create a sliding window rate limiter
 */
export function slidingWindowRateLimit(
  config: Partial<ExtendedRateLimitConfig> = {},
): MiddlewareHandler {
  const {
    windowMs = RATE_LIMIT_PRESETS.api?.windowMs ?? DEFAULT_WINDOW_MS,
    maxRequests = RATE_LIMIT_PRESETS.api?.maxRequests ?? DEFAULT_MAX_REQUESTS,
    keyGenerator = getClientIP,
    perRoute = false,
    skip,
    handler,
    headers = true,
  } = config;

  return async (c: Context, next: Next) => {
    if (skip?.(c)) {
      return next();
    }

    let key = keyGenerator(c);
    if (perRoute) {
      key = `${key}:${c.req.method}:${c.req.path}`;
    }

    const result = slidingWindowStore.check(key, windowMs, maxRequests);

    if (headers) {
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', result.remaining.toString());
      if (result.oldestRequest) {
        c.header(
          'X-RateLimit-Reset',
          Math.ceil((result.oldestRequest + windowMs) / 1000).toString(),
        );
      }
    }

    if (result.limited) {
      const retryAfter = result.oldestRequest
        ? Math.ceil((result.oldestRequest + windowMs - Date.now()) / 1000)
        : windowMs / 1000;

      if (headers) {
        c.header('Retry-After', retryAfter.toString());
      }

      if (handler) {
        return handler(c);
      }

      const errorResponse: RateLimitErrorResponse = {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      };

      return c.json(errorResponse, 429);
    }

    return next();
  };
}

// ============================================
// Auto-Ban Protection Middleware
// ============================================

/**
 * Auto-Ban Config Schema
 */
const AutoBanConfigSchema = S.Struct({
  /** Number of rate limit violations before ban */
  violationsBeforeBan: S.Number,
  /** Time window to track violations (ms) */
  violationWindowMs: S.Number,
  /** Ban duration (ms) */
  banDurationMs: S.Number,
  /** Whether to use slowmode before full ban */
  useSlowmode: S.optional(S.Boolean),
});

export type AutoBanConfig = typeof AutoBanConfigSchema.Type;

/**
 * Track rate limit violations per IP
 */
const violationTracker = new Map<string, { count: number; firstViolation: number }>();

/**
 * Create middleware that auto-bans IPs after repeated violations
 */
export function autoBanProtection(config: Partial<AutoBanConfig> = {}): MiddlewareHandler {
  const {
    violationsBeforeBan = 10,
    violationWindowMs = 15 * 60 * 1000, // 15 minutes
    banDurationMs = 60 * 60 * 1000, // 1 hour
    useSlowmode = true,
  } = config;

  // Cleanup old violations periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of violationTracker.entries()) {
      if (now - data.firstViolation > violationWindowMs) {
        violationTracker.delete(ip);
      }
    }
  }, 60000);

  return async (c: Context, next: Next) => {
    const response = await next();

    // Track 429 responses as violations
    if (c.res.status === 429) {
      const ip = getClientIP(c);
      const now = Date.now();
      const existing = violationTracker.get(ip);

      if (existing && now - existing.firstViolation < violationWindowMs) {
        existing.count++;
        violationTracker.set(ip, existing);

        // Check if we should ban
        if (existing.count >= violationsBeforeBan) {
          banIdentifier(ip, {
            reason: 'Auto-ban: repeated rate limit violations',
            durationMs: banDurationMs,
          });
          violationTracker.delete(ip);
        } else if (useSlowmode && existing.count >= violationsBeforeBan / 2) {
          // Apply slowmode at half the violation threshold
          const { slowIdentifier } = await import('@/services/security/banlist.service');
          slowIdentifier(ip, {
            reason: 'Auto-slowmode: rate limit violations',
            multiplier: Math.min(5, 1 + existing.count / 2),
          });
        }
      } else {
        violationTracker.set(ip, { count: 1, firstViolation: now });
      }
    }

    return response;
  };
}

/**
 * Combined rate limit + auto-ban middleware
 */
export function protectedRateLimit(
  rateLimitConfig: Partial<ExtendedRateLimitConfig> = {},
  autoBanConfig: Partial<AutoBanConfig> = {},
): MiddlewareHandler {
  const rateLimiter = rateLimit(rateLimitConfig);
  const autoBanner = autoBanProtection(autoBanConfig);

  return async (c: Context, next: Next) => {
    // Apply rate limiting first
    await rateLimiter(c, async () => {
      // Then apply auto-ban tracking
      await autoBanner(c, next);
    });
  };
}

// Export schemas for external validation
export {
  AutoBanConfigSchema,
  RateLimitCheckResultSchema,
  RateLimitConfigSchema,
  RateLimitErrorResponseSchema,
  RateLimitPresetSchema,
  RateLimitStateSchema,
  RateLimitStatsSchema,
  SlidingWindowCheckResultSchema,
};

// Re-export throttle utilities for advanced rate limiting scenarios
export {
  debounce,
  KeyedDebounce,
  KeyedThrottle,
  LeakyBucketLimiter,
  SlidingWindowCounter,
  throttle,
  TokenBucketLimiter,
} from '@foia-stream/shared';
// Re-export banlist functions for convenience
export {
  banIdentifier,
  getSlowmodeMultiplier,
  isIdentifierBanned,
  isIdentifierSlowed,
} from '@/services/security/banlist.service';
export {
  banCIDRRange,
  getMatchingBannedCIDR,
  isIPInBannedCIDR,
} from '@/services/security/cidr-banlist.service';
