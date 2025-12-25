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
 *              Uses Effect Schema for type-safe configuration validation.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 * @compliance NY SHIELD Act - Reasonable Technical Safeguards
 * @compliance GDPR Art. 25 - Privacy by Design
 */

import { REDACTED_MARKER } from '@foia-stream/shared';
import { Schema as S } from 'effect';
import { pinoLogger as logger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';

import { env } from '../config/env';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Schema for log levels
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const LogLevelSchema = S.Literal('trace', 'debug', 'info', 'warn', 'error', 'fatal');
type LogLevel = S.Schema.Type<typeof LogLevelSchema>;

/**
 * Schema for PII field categories that should be redacted
 * @compliance NIST 800-53 AU-3, NY SHIELD Act
 */
const PIIFieldCategorySchema = S.Literal(
  'authentication',
  'personal',
  'financial',
  'contact',
  'headers',
  'response',
);
type PIIFieldCategory = S.Schema.Type<typeof PIIFieldCategorySchema>;

/**
 * Schema for a single redaction path configuration
 */
const RedactionPathSchema = S.Struct({
  path: S.String.pipe(S.minLength(1)),
  category: PIIFieldCategorySchema,
  description: S.optional(S.String),
});
type RedactionPath = S.Schema.Type<typeof RedactionPathSchema>;

/**
 * Schema for logger configuration
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const LoggerConfigSchema = S.Struct({
  level: LogLevelSchema,
  serviceName: S.String.pipe(S.minLength(1)),
  environment: S.Literal('development', 'test', 'production'),
  enablePrettyPrint: S.Boolean,
  redactPaths: S.Array(S.String),
  censorValue: S.String.pipe(S.minLength(1)),
  includeTimestamp: S.Boolean,
});
type LoggerConfig = S.Schema.Type<typeof LoggerConfigSchema>;

// ============================================
// PII Redaction Configuration
// ============================================

/**
 * Structured PII redaction paths organized by category
 *
 * @constant
 * @description Paths that contain potentially sensitive information
 *              that should be redacted from logs to prevent PII leakage.
 * @compliance NIST 800-53 AU-3, NY SHIELD Act
 */
const PII_REDACTION_PATHS: readonly RedactionPath[] = [
  // Authentication fields
  { path: 'req.body.password', category: 'authentication', description: 'User password' },
  {
    path: 'req.body.currentPassword',
    category: 'authentication',
    description: 'Current password for change',
  },
  {
    path: 'req.body.newPassword',
    category: 'authentication',
    description: 'New password for change',
  },
  {
    path: 'req.body.confirmPassword',
    category: 'authentication',
    description: 'Password confirmation',
  },
  {
    path: 'req.body.twoFactorCode',
    category: 'authentication',
    description: '2FA verification code',
  },
  {
    path: 'req.body.recoveryCode',
    category: 'authentication',
    description: 'Account recovery code',
  },

  // Personal information
  { path: 'req.body.email', category: 'personal', description: 'Email address' },
  { path: 'req.body.ssn', category: 'personal', description: 'Social Security Number' },
  {
    path: 'req.body.socialSecurityNumber',
    category: 'personal',
    description: 'Social Security Number (full)',
  },
  { path: 'req.body.taxId', category: 'personal', description: 'Tax identification number' },
  { path: 'req.body.dateOfBirth', category: 'personal', description: 'Date of birth' },
  { path: 'req.body.dob', category: 'personal', description: 'Date of birth (short)' },
  { path: 'req.body.firstName', category: 'personal', description: 'First name' },
  { path: 'req.body.lastName', category: 'personal', description: 'Last name' },
  { path: 'req.body.fullName', category: 'personal', description: 'Full name' },

  // Contact information
  { path: 'req.body.phoneNumber', category: 'contact', description: 'Phone number' },
  { path: 'req.body.phone', category: 'contact', description: 'Phone (short)' },
  { path: 'req.body.mobileNumber', category: 'contact', description: 'Mobile phone number' },
  { path: 'req.body.address', category: 'contact', description: 'Street address' },
  { path: 'req.body.personalAddress', category: 'contact', description: 'Personal address' },
  { path: 'req.body.homeAddress', category: 'contact', description: 'Home address' },
  { path: 'req.body.zipCode', category: 'contact', description: 'ZIP/Postal code' },

  // Financial information
  { path: 'req.body.creditCard', category: 'financial', description: 'Credit card number' },
  { path: 'req.body.cardNumber', category: 'financial', description: 'Card number' },
  { path: 'req.body.cvv', category: 'financial', description: 'Card verification value' },
  { path: 'req.body.cvc', category: 'financial', description: 'Card verification code' },
  { path: 'req.body.expiryDate', category: 'financial', description: 'Card expiry date' },
  { path: 'req.body.bankAccount', category: 'financial', description: 'Bank account number' },
  { path: 'req.body.routingNumber', category: 'financial', description: 'Bank routing number' },
  { path: 'req.body.iban', category: 'financial', description: 'International bank account' },

  // Request headers
  { path: 'req.headers.authorization', category: 'headers', description: 'Authorization header' },
  { path: 'req.headers.cookie', category: 'headers', description: 'Cookie header' },
  { path: 'req.headers["x-api-key"]', category: 'headers', description: 'API key header' },
  { path: 'req.headers["x-auth-token"]', category: 'headers', description: 'Auth token header' },

  // Response fields
  { path: 'res.body.token', category: 'response', description: 'Response token' },
  { path: 'res.body.accessToken', category: 'response', description: 'Access token' },
  { path: 'res.body.refreshToken', category: 'response', description: 'Refresh token' },
  { path: 'res.body.data.email', category: 'response', description: 'Email in response data' },
  {
    path: 'res.body.data.passwordHash',
    category: 'response',
    description: 'Password hash in response',
  },
  {
    path: 'res.body.data.twoFactorSecret',
    category: 'response',
    description: '2FA secret in response',
  },
] as const;

/**
 * Wildcard patterns for deep redaction
 * These patterns match nested fields regardless of their location
 *
 * @constant
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const WILDCARD_REDACTION_PATTERNS: readonly string[] = [
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.twoFactorSecret',
  '*.apiKey',
  '*.apiSecret',
  '*.privateKey',
  '*.ssn',
  '*.creditCard',
  '*.cvv',
] as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Extracts path strings from structured redaction configurations
 *
 * @param paths - Array of structured redaction path configurations
 * @returns Array of path strings for Pino redaction
 */
function extractRedactionPaths(paths: readonly RedactionPath[]): string[] {
  return paths.map((p) => p.path);
}

/**
 * Builds the complete logger configuration with defaults
 *
 * @returns Validated LoggerConfig object
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
function buildLoggerConfig(): LoggerConfig {
  const nodeEnv = env.NODE_ENV as 'development' | 'test' | 'production';
  const isProduction = nodeEnv === 'production';

  const config: LoggerConfig = {
    level: isProduction ? 'info' : 'debug',
    serviceName: 'foia-stream-api',
    environment: nodeEnv,
    enablePrettyPrint: !isProduction,
    redactPaths: [...extractRedactionPaths(PII_REDACTION_PATHS), ...WILDCARD_REDACTION_PATTERNS],
    censorValue: REDACTED_MARKER,
    includeTimestamp: true,
  };

  // Validate configuration using Effect Schema
  return S.decodeUnknownSync(LoggerConfigSchema)(config);
}

/**
 * Gets redaction paths filtered by category
 *
 * @param categories - Categories to include
 * @returns Filtered array of redaction path strings
 *
 * @example
 * ```typescript
 * const authPaths = getRedactionPathsByCategory(['authentication', 'headers']);
 * ```
 */
export function getRedactionPathsByCategory(categories: PIIFieldCategory[]): string[] {
  return PII_REDACTION_PATHS.filter((p) => categories.includes(p.category)).map((p) => p.path);
}

/**
 * Adds custom redaction paths to the default configuration
 *
 * @param customPaths - Additional paths to redact
 * @returns Combined array of all redaction paths
 *
 * @example
 * ```typescript
 * const allPaths = addCustomRedactionPaths(['req.body.customField']);
 * ```
 */
export function addCustomRedactionPaths(customPaths: string[]): string[] {
  const config = buildLoggerConfig();
  return [...config.redactPaths, ...customPaths];
}

// ============================================
// Main Middleware Export
// ============================================

/**
 * Create Pino logger middleware with PII redaction
 *
 * @returns Hono middleware for structured logging with privacy protection
 *
 * @description
 * - In production: JSON output for log aggregation with PII redacted
 * - In development: Pretty printed output for readability with PII redacted
 * - All sensitive fields are replaced with '[REDACTED]' to prevent data leakage
 * - Configuration is validated using Effect Schema for type safety
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
  const config = buildLoggerConfig();

  return logger({
    pino: pino(
      {
        level: config.level,
        redact: {
          paths: [...config.redactPaths],
          censor: config.censorValue,
        },
        // Ensure timestamps are in ISO format for compliance auditing
        timestamp: config.includeTimestamp ? pino.stdTimeFunctions.isoTime : false,
        // Add service name and environment for log aggregation
        base: {
          service: config.serviceName,
          env: config.environment,
        },
        // Serializers for consistent log formatting
        serializers: {
          err: pino.stdSerializers.err,
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res,
        },
      },
      config.enablePrettyPrint
        ? pretty({
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{msg}',
          })
        : undefined,
    ),
  });
}

// ============================================
// Type Exports
// ============================================

export type { LoggerConfig, LogLevel, PIIFieldCategory, RedactionPath };
