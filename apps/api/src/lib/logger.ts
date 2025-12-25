/**
 * @file Standalone Logger
 * @module lib/logger
 * @description Provides a Pino logger instance for use in services and utilities
 *              outside of Hono request context.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */

import pino from 'pino';
import pretty from 'pino-pretty';

import { env } from '../config/env';

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
  env.NODE_ENV === 'production' ? undefined : pretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  }),
);
