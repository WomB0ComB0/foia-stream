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
 * @file Main Application Entry Point
 * @module app
 * @author FOIA Stream Team
 * @description Configures and exports the Hono application with middleware,
 *              routes, and error handling for the FOIA Stream API.
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality), SI-11 (Error Handling)
 */

// ============================================
// FOIA Stream - Main Application Entry
// ============================================

import { bodyLimit } from 'hono/body-limit';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

import { env } from './config/env';
import configureOpenAPI from './lib/configure-open-api';
import createApp from './lib/create-app';
import { logger } from './lib/logger';
import {
  apiRateLimit,
  authRateLimit,
  autoBanProtection,
  passwordResetRateLimit,
  uploadRateLimit,
} from './middleware/rate-limit.middleware';
import { httpsEnforcement, requestId } from './middleware/security.middleware';
import { cacheMiddleware } from './middleware/shared.middleware';
// OpenAPI Routes (all modules now use OpenAPI pattern)
import agenciesOpenAPIRoute from './routes/agencies';
import authOpenAPIRoute from './routes/auth';
import documentsOpenAPIRoute from './routes/documents';
import indexRoute from './routes/index.route';
import redactionOpenAPIRoute from './routes/redaction';
import requestsOpenAPIRoute from './routes/requests';
import templatesOpenAPIRoute from './routes/templates';

// ============================================
// Timing Middleware Configuration
// ============================================

/**
 * Server-Timing header for performance monitoring
 * @compliance NIST 800-53 AU-12 (Audit Generation)
 */
const timingMiddleware = timing({
  total: true,
  enabled: env.NODE_ENV === 'production',
  totalDescription: 'Total API Response Time',
  autoEnd: true,
});

/**
 * Main Hono application instance with OpenAPI support
 *
 * @constant
 * @type {OpenAPIHono<AppBindings>}
 * @description The root application instance that handles all HTTP requests
 *              with OpenAPI documentation capabilities. Uses createApp() factory
 *              which includes pino logger, request ID, and error handling.
 */
const app = createApp();

// ============================================
// Core Middleware Stack
// ============================================

// Context storage for request-scoped data
app.use('*', contextStorage());

// Performance timing headers
app.use('*', timingMiddleware);

// Request ID for tracing
app.use('*', requestId());

// Body size limit (2MB default)
// @compliance NIST 800-53 SI-10 (Information Input Validation)
app.use('*', bodyLimit({ maxSize: env.MAX_FILE_SIZE || 1024 * 1024 * 2 }));

// HTTPS enforcement (redirects HTTP to HTTPS in production)
// @compliance NIST 800-53 SC-8 (Transmission Confidentiality)
app.use('*', httpsEnforcement());

// Enhanced security headers
// @compliance NIST 800-53 SC-8, SC-13 (Cryptographic Protection)
// @compliance OWASP Security Headers
app.use(
  '*',
  secureHeaders({
    // HSTS: 2 years with subdomains and preload (max security)
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',

    // Prevent clickjacking completely
    xFrameOptions: 'DENY',

    // XSS Protection: Modern browsers use CSP, but set to 0 to prevent bypass attacks
    // (mode=block can introduce vulnerabilities in older IE)
    xXssProtection: '0',

    // Prevent MIME type sniffing attacks
    xContentTypeOptions: 'nosniff',

    // Disable DNS prefetching to prevent information leakage
    xDnsPrefetchControl: 'off',

    // Prevent IE from opening downloads directly
    xDownloadOptions: 'noopen',

    // Block Flash/PDF cross-domain policies
    xPermittedCrossDomainPolicies: 'none',

    // Cross-Origin Isolation headers for maximum security
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginResourcePolicy: 'same-origin',
    crossOriginOpenerPolicy: 'same-origin',

    // Enable origin isolation for performance and security
    originAgentCluster: true,

    // Strict referrer policy - only send origin for same-origin, nothing for cross-origin
    referrerPolicy: 'strict-origin-when-cross-origin',

    // Content Security Policy - tight restrictions with docs exception
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      // Scripts: self + Scalar CDN for API docs + inline for Scalar
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      // Styles: self + inline for Scalar + CDN
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://cdn.jsdelivr.net',
        'https://fonts.googleapis.com',
      ],
      // Images: self, data URIs for base64, and HTTPS sources
      imgSrc: ["'self'", 'data:', 'https:'],
      // Connections: same origin plus CDN
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      // Fonts: self, data URIs, Google Fonts, and jsdelivr CDN
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      // Block all object/embed/applet elements
      objectSrc: ["'none'"],
      // Media: self only
      mediaSrc: ["'self'"],
      // Frames: none - prevent embedding
      frameSrc: ["'none'"],
      // Frame ancestors: none - prevent being embedded
      frameAncestors: ["'none'"],
      // Base URI: self only - prevent base tag hijacking
      baseUri: ["'self'"],
      // Form actions: self only
      formAction: ["'self'"],
      // Upgrade insecure requests to HTTPS
      upgradeInsecureRequests: [],
    },

    // Permissions Policy - disable unnecessary browser features
    // Note: Only using standard features recognized by modern browsers
    permissionsPolicy: {
      // Location/sensors - disable completely
      accelerometer: [],
      autoplay: [],
      camera: [],
      displayCapture: [],
      encryptedMedia: [],
      fullscreen: ["'self'"],
      gamepad: [],
      geolocation: [],
      gyroscope: [],
      hid: [],
      idleDetection: [],
      magnetometer: [],
      microphone: [],
      midi: [],
      payment: [],
      pictureInPicture: [],
      publickeyCredentialsGet: [],
      screenWakeLock: [],
      serial: [],
      // Only enable storage access for self
      storageAccess: ["'self'"],
      usb: [],
      xrSpatialTracking: [],
    },
  }),
);

// CORS
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'b3',
      'traceparent',
      'tracestate',
      'X-Request-Id',
    ],
    exposeHeaders: ['Content-Length', 'X-Request-Id', 'Server-Timing'],
    maxAge: 86400,
    credentials: true,
  }),
);

// Pretty JSON responses in development
if (env.NODE_ENV === 'development') {
  app.use('*', prettyJSON());
}

// ============================================
// Global Error Handler
// ============================================

/**
 * Global error handler for unhandled exceptions
 * @compliance NIST 800-53 SI-11 (Error Handling)
 */
app.onError((err, c) => {
  const error = err instanceof Error ? err : new Error(String(err));

  logger.error({ error: error.message, stack: error.stack }, 'Unhandled API error');

  const errorResponse = {
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      code: error.name || 'UNKNOWN_ERROR',
    },
  };

  return c.json(errorResponse, 500);
});

// ============================================
// Health Check (inline for OpenAPI spec)
// ============================================

/**
 * Root endpoint - API information
 *
 * @route GET /
 * @returns {Object} API metadata including name, version, description, status, and timestamp
 */
app.get('/', (c) => {
  return c.json({
    name: 'FOIA Stream API',
    version: '1.0.0',
    description: 'Transparency and Audit Application for Public Records Requests',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Health check endpoint for monitoring and load balancers
 *
 * @route GET /health
 * @returns {Object} Health status with timestamp
 */
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes
// ============================================

// Configure OpenAPI documentation FIRST (before any protected routes)
// This ensures /doc and /reference are accessible without authentication
configureOpenAPI(app);

// ============================================
// OpenAPI Routes (Primary)
// ============================================

// Mount OpenAPI routes with documentation
// These routes use @hono/zod-openapi for type-safe validation and documentation
// All routes are prefixed with /api/v1 for consistency

// Cache middleware for different route types:
// - NoCache for auth (sensitive, user-specific)
// - Short cache for public read-only endpoints
// - Private cache for user-specific data
app.use('/api/v1/auth/*', cacheMiddleware('NoCache'));
app.use('/api/v1/agencies/*', cacheMiddleware('Short'));
app.use('/api/v1/templates/*', cacheMiddleware('Short'));
app.use('/api/v1/requests/*', cacheMiddleware('Private'));
app.use('/api/v1/documents/*', cacheMiddleware('Private'));
app.use('/api/v1/redaction/*', cacheMiddleware('NoCache'));

// ============================================
// Rate Limiting
// ============================================
// @compliance NIST 800-53 SC-5 (Denial of Service Protection)

// Global API rate limit (100 requests/minute)
app.use('/api/v1/*', apiRateLimit);

// Auto-ban protection - bans IPs after repeated rate limit violations
app.use('/api/v1/*', autoBanProtection());

// Strict rate limits for authentication endpoints (5 requests/15 min)
// Prevents brute-force password guessing attacks
app.use('/api/v1/auth/login', authRateLimit);
app.use('/api/v1/auth/register', authRateLimit);

// Very strict limit for password reset (3 requests/hour)
app.use('/api/v1/auth/forgot-password', passwordResetRateLimit);
app.use('/api/v1/auth/reset-password', passwordResetRateLimit);

// Upload rate limit for document endpoints (20 uploads/hour)
app.use('/api/v1/documents/upload', uploadRateLimit);
app.use('/api/v1/redaction/upload', uploadRateLimit);

app.route('/', indexRoute);
app.route('/api/v1', authOpenAPIRoute);
app.route('/api/v1', agenciesOpenAPIRoute);
app.route('/api/v1', requestsOpenAPIRoute);
app.route('/api/v1', templatesOpenAPIRoute);
app.route('/api/v1', documentsOpenAPIRoute);
app.route('/api/v1', redactionOpenAPIRoute);

// ============================================
// Export App
// ============================================

export default app;
export { app };
