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

import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { env } from './config/env';
import configureOpenAPI from './lib/configure-open-api';
import createApp from './lib/create-app';
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
// Additional Global Middleware
// ============================================

// Request ID for tracing
app.use('*', requestId());

// HTTPS enforcement (redirects HTTP to HTTPS in production)
// @compliance NIST 800-53 SC-8 (Transmission Confidentiality)
app.use('*', httpsEnforcement());

// Security headers
app.use('*', secureHeaders());

// CORS
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'b3', 'traceparent', 'tracestate'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  }),
);

// Pretty JSON responses in development
if (env.NODE_ENV === 'development') {
  app.use('*', prettyJSON());
}

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
