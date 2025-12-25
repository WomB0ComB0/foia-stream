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
 * @file Index Route
 * @module routes/index
 * @author FOIA Stream Team
 * @description Root API routes for health checks and API information.
 */

import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRouter } from '../lib/create-app';

const tags = ['Index'];

/**
 * API Info Response Schema
 */
const ApiInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  documentation: z.string(),
  endpoints: z.object({
    auth: z.string(),
    agencies: z.string(),
    requests: z.string(),
    templates: z.string(),
  }),
});

/**
 * Health Check Response Schema
 */
const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  uptime: z.number(),
  version: z.string(),
});

/**
 * GET / - API Information
 */
const infoRoute = createRoute({
  path: '/',
  method: 'get',
  tags,
  summary: 'API Information',
  description: 'Returns basic information about the FOIA Stream API',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ApiInfoSchema, 'API information'),
  },
});

/**
 * GET /health - Health Check
 */
const healthRoute = createRoute({
  path: '/health',
  method: 'get',
  tags,
  summary: 'Health Check',
  description: 'Returns the health status of the API',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(HealthCheckSchema, 'Health status'),
  },
});

const startTime = Date.now();

const router = createRouter()
  .openapi(infoRoute, (c) => {
    return c.json(
      {
        name: 'FOIA Stream API',
        version: '1.0.0',
        description: 'Transparency & Audit Application for Public Records',
        documentation: '/reference',
        endpoints: {
          auth: '/api/v1/auth',
          agencies: '/api/v1/agencies',
          requests: '/api/v1/requests',
          templates: '/api/v1/templates',
        },
      },
      HttpStatusCodes.OK,
    );
  })
  .openapi(healthRoute, (c) => {
    return c.json(
      {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: '1.0.0',
      },
      HttpStatusCodes.OK,
    );
  });

export default router;
