/**
 * @file Security Middleware
 * @module middleware/security
 * @description Security-related middleware including HTTPS enforcement,
 *              security headers, and request sanitization.
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality), SC-23 (Session Authenticity)
 */

import type { Context, MiddlewareHandler, Next } from 'hono';

import { env } from '@/config/env';

/**
 * HTTPS enforcement middleware
 * Redirects HTTP requests to HTTPS in production environments
 *
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality and Integrity)
 * @returns {MiddlewareHandler} Hono middleware handler
 *
 * @example
 * ```typescript
 * app.use('*', httpsEnforcement());
 * ```
 */
export function httpsEnforcement(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Skip in development/test environments
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      return next();
    }

    // Check for HTTPS via various headers (handles proxies/load balancers)
    const proto = c.req.header('x-forwarded-proto');
    const isSecure =
      proto === 'https' ||
      c.req.header('x-forwarded-ssl') === 'on' ||
      c.req.url.startsWith('https://');

    if (!isSecure) {
      // Redirect to HTTPS
      const url = new URL(c.req.url);
      url.protocol = 'https:';

      return c.redirect(url.toString(), 301);
    }

    return next();
  };
}

/**
 * Security headers middleware
 * Adds security-related HTTP headers to all responses
 *
 * @compliance NIST 800-53 SC-23 (Session Authenticity)
 * @returns {MiddlewareHandler} Hono middleware handler
 *
 * @example
 * ```typescript
 * app.use('*', securityHeaders());
 * ```
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    await next();

    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection in older browsers
    c.header('X-XSS-Protection', '1; mode=block');

    // Referrer policy for privacy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy (formerly Feature-Policy)
    c.header(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );

    // Content Security Policy
    if (env.NODE_ENV === 'production') {
      c.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
      );
    }

    // Strict Transport Security (HSTS)
    // Only set in production with HTTPS
    if (env.NODE_ENV === 'production') {
      // max-age=31536000 (1 year), includeSubDomains, preload
      c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Prevent caching of sensitive data
    if (c.req.path.includes('/auth/') || c.req.path.includes('/api/')) {
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');
    }
  };
}

/**
 * Request ID middleware
 * Adds a unique request ID for tracing and debugging
 *
 * @returns {MiddlewareHandler} Hono middleware handler
 */
export function requestId(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const id = c.req.header('x-request-id') || crypto.randomUUID();
    c.set('requestId', id);
    c.header('X-Request-ID', id);
    await next();
  };
}

/**
 * Combined security middleware
 * Applies all security middleware in the correct order
 *
 * @returns {MiddlewareHandler[]} Array of middleware handlers
 *
 * @example
 * ```typescript
 * app.use('*', ...allSecurityMiddleware());
 * ```
 */
export function allSecurityMiddleware(): MiddlewareHandler[] {
  return [requestId(), httpsEnforcement(), securityHeaders()];
}
