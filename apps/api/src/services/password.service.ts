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
 * @file Password Hashing Service
 * @module services/password
 * @author FOIA Stream Team
 * @description Provides secure password hashing using Argon2id with server-side pepper.
 *              Implements defense-in-depth with memory-hard hashing algorithm.
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 * @compliance NIST 800-53 SC-13 (Cryptographic Protection)
 */

// ============================================
// FOIA Stream - Password Hashing Service
// ============================================

import * as argon2 from 'argon2';
import { env } from '../config/env';

/**
 * Argon2id configuration for password hashing
 * @constant
 * @compliance OWASP Password Storage Cheat Sheet recommendations
 */
const ARGON2_CONFIG: argon2.Options = {
  /** Use Argon2id variant (hybrid of Argon2i and Argon2d) */
  type: argon2.argon2id,
  /** Memory cost in KiB (64 MiB) - prevents GPU/ASIC attacks */
  memoryCost: 65536,
  /** Time cost (iterations) */
  timeCost: 3,
  /** Degree of parallelism */
  parallelism: 4,
  /** Output hash length in bytes */
  hashLength: 32,
};

/**
 * Options for password hashing operations
 * @interface
 */
interface HashOptions {
  /** Whether to apply the server-side pepper (default: true) */
  usePepper?: boolean;
}

/**
 * Apply pepper to password for defense-in-depth
 *
 * @private
 * @param {string} password - Plain text password
 * @returns {string} Password with pepper applied
 * @description Appends server-side secret to password before hashing.
 *              Even if database is breached, attacker cannot crack passwords
 *              without the pepper stored separately (e.g., in HSM or env).
 */
function applyPepper(password: string): string {
  return password + env.PASSWORD_PEPPER;
}

/**
 * Hash a password using Argon2id with optional pepper
 *
 * @param {string} password - Plain text password to hash
 * @param {HashOptions} [options] - Hashing options
 * @returns {Promise<string>} Argon2id hash string (includes salt, params, and hash)
 * @throws {Error} If hashing fails
 * @compliance NIST 800-53 IA-5(1) (Password-Based Authentication)
 *
 * @example
 * ```typescript
 * const hash = await passwordService.hashPassword('MySecureP@ssw0rd!');
 * // Returns: $argon2id$v=19$m=65536,t=3,p=4$...
 * ```
 */
async function hashPassword(password: string, options: HashOptions = {}): Promise<string> {
  const { usePepper = true } = options;

  try {
    const passwordToHash = usePepper ? applyPepper(password) : password;
    return await argon2.hash(passwordToHash, ARGON2_CONFIG);
  } catch {
    // Log without exposing password details
    console.error('[Password Service] Hash operation failed');
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against an Argon2id hash
 *
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Argon2id hash to verify against
 * @param {HashOptions} [options] - Verification options
 * @returns {Promise<boolean>} True if password matches hash
 * @compliance NIST 800-53 IA-5(1) (Password-Based Authentication)
 *
 * @example
 * ```typescript
 * const isValid = await passwordService.verifyPassword('MySecureP@ssw0rd!', storedHash);
 * if (isValid) {
 *   // Grant access
 * }
 * ```
 */
async function verifyPassword(
  password: string,
  hash: string,
  options: HashOptions = {},
): Promise<boolean> {
  const { usePepper = true } = options;

  try {
    const passwordToVerify = usePepper ? applyPepper(password) : password;
    return await argon2.verify(hash, passwordToVerify);
  } catch {
    // Log without exposing password details
    console.error('[Password Service] Verify operation failed');
    return false;
  }
}

/**
 * Check if a hash needs to be rehashed (e.g., config changed)
 *
 * @param {string} hash - Existing Argon2 hash
 * @returns {boolean} True if hash should be updated with new parameters
 * @description Checks if the hash was created with outdated parameters.
 *              Useful for gradual migration when increasing security parameters.
 *
 * @example
 * ```typescript
 * if (passwordService.needsRehash(storedHash)) {
 *   const newHash = await passwordService.hashPassword(password);
 *   await updateUserHash(userId, newHash);
 * }
 * ```
 */
function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_CONFIG);
}

/**
 * Password service singleton
 *
 * @constant
 * @type {Object}
 * @description Exported password service with all hashing operations.
 *              Use this for all password hashing/verification in the application.
 *
 * @example
 * ```typescript
 * import { passwordService } from './services/password.service';
 *
 * // Hash password on registration
 * const hash = await passwordService.hashPassword(userPassword);
 *
 * // Verify on login
 * const isValid = await passwordService.verifyPassword(providedPassword, storedHash);
 * ```
 */
export const passwordService = {
  hashPassword,
  verifyPassword,
  needsRehash,
};

// Also export individual functions for convenience
export { hashPassword, needsRehash, verifyPassword };
