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
 * @file Environment Configuration
 * @module config/env
 * @author FOIA Stream Team
 * @description Validates and exports environment variables using Effect Schema.
 *              Ensures type safety and provides sensible defaults for all configuration.
 * @compliance NIST 800-53 CM-6 (Configuration Settings)
 */

// ============================================
// FOIA Stream - Environment Configuration
// ============================================

import { ParseResult, Schema as S } from 'effect';

/**
 * Environment variable schema definition
 *
 * @constant
 * @description Defines the shape and validation rules for all environment variables.
 *              Uses Effect Schema for runtime validation with type inference.
 */
const EnvSchema = S.Struct({
  /** Server port number (default: 3000) */
  PORT: S.NumberFromString.pipe(S.optionalWith({ default: () => 3000 })),

  /** Server host binding (default: 0.0.0.0) */
  HOST: S.String.pipe(S.optionalWith({ default: () => '0.0.0.0' })),

  /** Node environment - affects logging and error detail exposure */
  NODE_ENV: S.Literal('development', 'production', 'test').pipe(
    S.optionalWith({ default: () => 'development' as const }),
  ),

  /** SQLite database file path */
  DATABASE_URL: S.String.pipe(S.optionalWith({ default: () => './data/foia-stream.db' })),

  /**
   * JWT signing secret - must be at least 32 characters
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  JWT_SECRET: S.String.pipe(
    S.minLength(32),
    S.optionalWith({ default: () => 'change-this-secret-in-production-min-32-chars' }),
  ),

  /** JWT token expiration duration (default: 7d) */
  JWT_EXPIRES_IN: S.String.pipe(S.optionalWith({ default: () => '7d' })),

  /** Directory for uploaded files */
  UPLOAD_DIR: S.String.pipe(S.optionalWith({ default: () => './uploads' })),

  /** Maximum file upload size in bytes (default: 100MB) */
  MAX_FILE_SIZE: S.NumberFromString.pipe(S.optionalWith({ default: () => 100 * 1024 * 1024 })),

  /**
   * Rate limit window in milliseconds (default: 60000 = 1 minute)
   * @compliance NIST 800-53 SC-5 (Denial of Service Protection)
   */
  RATE_LIMIT_WINDOW_MS: S.NumberFromString.pipe(S.optionalWith({ default: () => 60000 })),

  /** Maximum requests per rate limit window (default: 100) */
  RATE_LIMIT_MAX_REQUESTS: S.NumberFromString.pipe(S.optionalWith({ default: () => 100 })),

  /** Allowed CORS origins - comma-separated or '*' for all */
  CORS_ORIGIN: S.String.pipe(S.optionalWith({ default: () => '*' })),

  /**
   * Data encryption key for PII at rest - must be at least 32 characters
   * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
   */
  DATA_ENCRYPTION_KEY: S.String.pipe(
    S.minLength(32),
    S.optionalWith({ default: () => 'change-this-encryption-key-in-prod-min-32' }),
  ),

  /**
   * Password pepper - server-side secret appended to passwords before hashing
   * Provides defense-in-depth against database breaches
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  PASSWORD_PEPPER: S.String.pipe(
    S.minLength(32),
    S.optionalWith({ default: () => 'change-this-password-pepper-in-prod-32ch' }),
  ),

  /**
<<<<<<< HEAD
   * VirusTotal API key for malware scanning
   * Optional - if not set, virus scanning will be skipped
   * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
   */
  VIRUSTOTAL_API_KEY: S.optional(S.String),
=======
   * VirusTotal API key for malware scanning of uploaded files
   * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
   */
  VIRUSTOTAL_API_KEY: S.String.pipe(S.optionalWith({ default: () => '' })),
>>>>>>> 10c15c3 (feat(api): 🔒 Implement secure PDF upload and malware scanning)
});

/**
 * Validated environment type
 *
 * @typedef {typeof EnvSchema.Type} Env
 * @description Inferred TypeScript type from the EnvSchema
 */
export type Env = typeof EnvSchema.Type;

/**
 * Loads and validates environment variables
 *
 * @function loadEnv
 * @returns {Env} Validated environment configuration object
 * @throws {Error} Exits process with code 1 if validation fails
 * @description Validates process.env against EnvSchema and returns typed configuration.
 *              On validation failure, logs detailed error and terminates the process.
 *
 * @example
 * ```typescript
 * // Environment is loaded automatically on import
 * import { env } from './config/env';
 * console.log(env.PORT); // 3000
 * ```
 */
function loadEnv(): Env {
  const result = S.decodeUnknownEither(EnvSchema)(process.env);

  if (result._tag === 'Left') {
    console.error('❌ Invalid environment variables:');
    const message = ParseResult.TreeFormatter.formatErrorSync(result.left);
    console.error(`  ${message}`);
    process.exit(1);
  }

  return result.right;
}

/**
 * Validated environment configuration singleton
 *
 * @constant
 * @type {Env}
 * @description Exported environment configuration. Loaded once at module initialization.
 */
export const env = loadEnv();
