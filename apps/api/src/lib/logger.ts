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
 * @file Standalone Logger
 * @module lib/logger
 * @description Provides a Pino logger instance for use in services and utilities
 *              outside of Hono request context.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */

import pino from 'pino';
import pretty from 'pino-pretty';

import { env } from '@/config/env';

/**
 * Standalone Pino logger instance
 *
 * @description
 * - In production: JSON output for log aggregation
 * - In development: Pretty printed output for readability
 *
 * @example
 * ```typescript
 * import { logger } from '../lib/logger';
 *
 * logger.info({ userId }, 'Processing MFA verification');
 * logger.debug({ code, expected }, 'TOTP verification attempt');
 * logger.error({ error }, 'MFA verification failed');
 * ```
 */
export const logger = pino(
  {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    name: 'foia-stream-api',
  },
  env.NODE_ENV === 'production'
    ? undefined
    : pretty({
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      }),
);
