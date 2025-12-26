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
 *              Supports both legacy routes and new OpenAPI routes.
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality), SI-11 (Error Handling)
 */

// ============================================
// FOIA Stream - Main Application Entry
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { env } from './config/env';
import configureOpenAPI from './lib/configure-open-api';
import createApp from './lib/create-app';
import { httpsEnforcement, requestId } from './middleware/security.middleware';
<<<<<<< HEAD
import { agencyRoutes, authRoutes, documentRoutes, redactionRoutes, requestRoutes, templateRoutes } from './routes';
=======
import {
  agencyRoutes,
  authRoutes,
  redactionRoutes,
  requestRoutes,
  templateRoutes,
  uploadRoutes,
} from './routes';
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
import agenciesOpenAPIRoute from './routes/agencies';
import authOpenAPIRoute from './routes/auth';
import indexRoute from './routes/index.route';
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

/**
 * API v1 router instance (legacy routes)
 *
 * @constant
 * @type {Hono}
 * @description Sub-router for all v1 API endpoints (legacy pattern)
 * @deprecated Use OpenAPI routes instead
 */
const api = new Hono();

api.route('/auth', authRoutes);
api.route('/requests', requestRoutes);
api.route('/agencies', agencyRoutes);
api.route('/templates', templateRoutes);
api.route('/redaction', redactionRoutes);
<<<<<<< HEAD
api.route('/documents', documentRoutes);
=======
api.route('/upload', uploadRoutes);
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)

app.route('/api/v1', api);

// ============================================
// OpenAPI Routes (New Pattern)
// ============================================

/**
 * Mount OpenAPI routes with documentation
 * These routes use @hono/zod-openapi for type-safe validation
 * All routes are prefixed with /api/v1 for consistency
 */
app.route('/', indexRoute);
app.route('/api/v1', authOpenAPIRoute);
app.route('/api/v1', agenciesOpenAPIRoute);
app.route('/api/v1', requestsOpenAPIRoute);
app.route('/api/v1', templatesOpenAPIRoute);

// ============================================
// Export App
// ============================================

export default app;
export { app };
