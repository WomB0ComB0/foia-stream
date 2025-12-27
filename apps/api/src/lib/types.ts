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
 * @file Application Types
 * @module lib/types
 * @author FOIA Stream Team
 * @description Core type definitions for the OpenAPI Hono application.
 *              Defines bindings, route handlers, and application types.
 */

import type { JWTPayload } from '@/services/auth/auth.service';
import type { OpenAPIHono, RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { Schema } from 'hono';
import type { PinoLogger } from 'hono-pino';

/**
 * Application context bindings
 * @interface
 */
export interface AppBindings {
  Variables: {
    /** Pino logger instance */
    logger: PinoLogger;
    /** Authenticated user payload (set by auth middleware) */
    user: JWTPayload;
  };
}

/**
 * OpenAPI Hono application type
 * @template S - Schema type
 */
export type AppOpenAPI<S extends Schema = NonNullable<unknown>> = OpenAPIHono<AppBindings, S>;

/**
 * Route handler type for OpenAPI routes
 * @template R - Route configuration type
 */
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
