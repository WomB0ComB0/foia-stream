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
 * @file Security Utilities
 * @module utils/security
 * @author FOIA Stream Team
 * @description Provides encryption, hashing, and security functions
 *              for compliance with SOC2, ISO 27001, NIST 800-53.
 *              Includes AES-256-GCM encryption, secure token generation,
 *              and PII masking utilities.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 * @compliance NIST 800-53 SC-13 (Cryptographic Protection)
 */

// ============================================
// FOIA Stream - Security Utilities
// ============================================

import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// ============================================
// Encryption Configuration
// ============================================

/** AES-256-GCM encryption algorithm */
const ALGORITHM = 'aes-256-gcm';
/** Initialization vector length in bytes */
const IV_LENGTH = 16;
/** Authentication tag length in bytes */
const AUTH_TAG_LENGTH = 16;
/** Salt length for key derivation */
const SALT_LENGTH = 32;
/** Derived key length (256 bits for AES-256) */
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from a password using scrypt
 *
 * @param {string} password - Password to derive key from
 * @param {Buffer} salt - Cryptographic salt
 * @returns {Promise<Buffer>} Derived key
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypts sensitive data using AES-256-GCM
 *
 * @param {string} plaintext - Data to encrypt
 * @param {string} encryptionKey - Encryption key/password
 * @returns {Promise<string>} Base64-encoded encrypted data (salt:iv:authTag:ciphertext)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 *
 * @example
 * ```typescript
 * const encrypted = await encryptData('sensitive data', process.env.ENCRYPTION_KEY);
 * ```
 */
export async function encryptData(plaintext: string, encryptionKey: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(encryptionKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine salt:iv:authTag:ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts data encrypted with encryptData
 */
export async function decryptData(encryptedData: string, encryptionKey: string): Promise<string> {
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
  );
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = await deriveKey(encryptionKey, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Hash data using SHA-256 (for non-reversible hashing)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Mask PII for logging (shows first 2 and last 2 characters)
 */
export function maskPII(data: string): string {
  if (data.length <= 4) {
    return '****';
  }
  return `${data.slice(0, 2)}${'*'.repeat(data.length - 4)}${data.slice(-2)}`;
}

/**
 * Mask email for logging
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!domain || !local) return maskPII(email);
  const maskedLocal =
    local.length > 2
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : '**';
  return `${maskedLocal}@${domain}`;
}

/**
 * Sanitize object for logging (removes sensitive fields)
 */
export function sanitizeForLogging<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'twoFactorSecret',
    'apiKey',
  ],
): Partial<T> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (key.toLowerCase().includes('email') && typeof value === 'string') {
      sanitized[key] = maskEmail(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as Partial<T>;
}

// Export encryption key getter (uses validated env config)
export async function getEncryptionKey(): Promise<string> {
  // Import here to avoid circular dependency
  const { env } = await import('../config/env').then((module) => module);
  return env.DATA_ENCRYPTION_KEY;
}

/**
 * Simple encrypt wrapper that uses the default encryption key
 * @param {string} data - Data to encrypt
 * @returns {string} Encrypted data (synchronous for convenience)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */
export async function encrypt(data: string): Promise<string> {
  // For synchronous usage, we use a simpler encryption
  // In production, prefer encryptData for async AES-256-GCM
  const key = await getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const derivedKey = createHash('sha256').update(key, 'utf8').digest();

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Simple decrypt wrapper that uses the default encryption key
 * @param {string} encryptedData - Data to decrypt
 * @returns {string} Decrypted data
 */
export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const derivedKey = createHash('sha256').update(key, 'utf8').digest();
  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
