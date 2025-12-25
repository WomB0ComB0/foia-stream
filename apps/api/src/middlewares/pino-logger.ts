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
 * @file Pino Logger Middleware
 * @module middlewares/pino-logger
 * @author FOIA Stream Team
 * @description Structured logging middleware using Pino for the FOIA Stream API.
 *              Provides JSON logging in production and pretty printing in development.
 *              Includes PII redaction to prevent sensitive data leakage in logs.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 * @compliance NY SHIELD Act - Reasonable Technical Safeguards
 * @compliance GDPR Art. 25 - Privacy by Design
 */

import { pinoLogger as logger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';

import { env } from '../config/env';

/**
 * PII redaction paths for Pino logger
 *
 * @description Paths that contain potentially sensitive information
 *              that should be redacted from logs to prevent PII leakage.
 * @compliance NIST 800-53 AU-3, NY SHIELD Act
 */
const PII_REDACT_PATHS = [
  // Request body fields (common PII)
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.email',
  'req.body.ssn',
  'req.body.socialSecurityNumber',
  'req.body.taxId',
  'req.body.dateOfBirth',
  'req.body.dob',
  'req.body.phoneNumber',
  'req.body.phone',
  'req.body.creditCard',
  'req.body.cardNumber',
  'req.body.cvv',
  'req.body.bankAccount',
  'req.body.routingNumber',
  'req.body.address',
  'req.body.personalAddress',

  // Auth headers
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',

  // Response fields that might contain PII
  'res.body.token',
  'res.body.accessToken',
  'res.body.refreshToken',
  'res.body.data.email',
  'res.body.data.passwordHash',

  // Nested object patterns (wildcard-style coverage)
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.secret',
  '*.twoFactorSecret',
  '*.apiKey',
];

/**
 * Create Pino logger middleware with PII redaction
 *
 * @returns Hono middleware for structured logging with privacy protection
 *
 * @description
 * - In production: JSON output for log aggregation with PII redacted
 * - In development: Pretty printed output for readability with PII redacted
 * - All sensitive fields are replaced with '[REDACTED]' to prevent data leakage
 *
 * @example
 * ```typescript
 * app.use(pinoLogger());
 *
 * // In route handler
 * c.var.logger.info('Processing request');
 * // Any PII in the request will be automatically redacted
 * ```
 *
 * @compliance
 * - NIST 800-53 AU-3: Ensures audit records don't contain excessive PII
 * - NY SHIELD Act: Reasonable technical safeguard for private information
 * - GDPR Art. 25: Privacy by design - minimizing PII in logs
 */
export function pinoLogger() {
  return logger({
    pino: pino(
      {
        level: env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: {
          paths: PII_REDACT_PATHS,
          censor: '[REDACTED]',
        },
        // Ensure timestamps are in ISO format for compliance auditing
        timestamp: pino.stdTimeFunctions.isoTime,
        // Add service name for log aggregation
        base: {
          service: 'foia-stream-api',
          env: env.NODE_ENV,
        },
      },
      env.NODE_ENV === 'production'
        ? undefined
        : pretty({
            colorize: true,
            translateTime: 'SYS:standard',
          }),
    ),
  });
}
