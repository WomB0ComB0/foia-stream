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
 * @file Application Factory
 * @module lib/create-app
 * @author FOIA Stream Team
 * @description Factory functions for creating Hono OpenAPI applications
 *              and routers with standardized middleware and error handling.
 */

import { pinoLogger } from '@/middleware/pino-logger';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { Schema } from 'hono';
import { requestId } from 'hono/request-id';
import { notFound, onError, serveEmojiFavicon } from 'stoker/middlewares';
import { defaultHook } from 'stoker/openapi';
import type { AppBindings, AppOpenAPI } from './types';

/**
 * Create a new OpenAPI router instance
 *
 * @returns {OpenAPIHono<AppBindings>} New router instance with default hook
 *
 * @example
 * ```typescript
 * const router = createRouter();
 * router.openapi(route, handler);
 * ```
 */
export function createRouter(): OpenAPIHono<AppBindings> {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

/**
 * Create the main application with all middleware configured
 *
 * @returns {OpenAPIHono<AppBindings>} Configured Hono application
 *
 * @example
 * ```typescript
 * const app = createApp();
 * configureOpenAPI(app);
 * ```
 */
export default function createApp(): OpenAPIHono<AppBindings> {
  const app = createRouter();

  app.use(requestId()).use(serveEmojiFavicon('📋')).use(pinoLogger());

  app.notFound(notFound);
  app.onError(onError);

  return app;
}

/**
 * Create a test application with a router mounted
 *
 * @template S - Schema type
 * @param {AppOpenAPI<S>} router - Router to mount for testing
 * @returns {OpenAPIHono<AppBindings>} Test application with router
 *
 * @example
 * ```typescript
 * const client = testClient(createTestApp(authRouter));
 * ```
 */
export function createTestApp<S extends Schema>(router: AppOpenAPI<S>): OpenAPIHono<AppBindings> {
  return createApp().route('/', router);
}
