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
 * @file OpenAPI Configuration
 * @module lib/configure-open-api
 * @author FOIA Stream Team
 * @description Configures OpenAPI documentation endpoints and Scalar API reference.
 */

import { Scalar } from '@scalar/hono-api-reference';

import type { AppOpenAPI } from './types';

const API_VERSION = '1.0.0';

/**
 * Configure OpenAPI documentation routes
 *
 * @param {AppOpenAPI} app - The Hono application instance
 *
 * @description Sets up:
 * - GET /doc - OpenAPI JSON specification
 * - GET /reference - Interactive Scalar API documentation
 *
 * @example
 * ```typescript
 * const app = createApp();
 * configureOpenAPI(app);
 * ```
 */
export default function configureOpenAPI(app: AppOpenAPI): void {
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: API_VERSION,
      title: 'FOIA Stream API',
      description: `
# FOIA Stream API

Transparency & Audit Application for Public Records.

## Overview

FOIA Stream helps citizens, journalists, researchers, and attorneys submit and track Freedom of Information Act (FOIA) requests to government agencies.

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Compliance

This API is designed with SOC 2 Type II, NIST 800-53, and GDPR compliance in mind.
      `,
      contact: {
        name: 'FOIA Stream Team',
        url: 'https://github.com/WomB0ComB0/foia-stream',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Index', description: 'API status and health endpoints' },
      { name: 'Auth', description: 'Authentication and user management' },
      { name: 'Agencies', description: 'Government agency management' },
      { name: 'Requests', description: 'FOIA request lifecycle' },
      { name: 'Templates', description: 'Request template management' },
    ],
  });

  // Register security scheme for Bearer token authentication
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT token obtained from /auth/login endpoint',
  });

  app.get(
    '/reference',
    Scalar({
      pageTitle: 'FOIA Stream API Reference',
      url: '/doc',
      theme: 'kepler',
      layout: 'modern',
      darkMode: true,
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
    }),
  );
}
