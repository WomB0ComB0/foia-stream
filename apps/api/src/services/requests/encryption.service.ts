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
 * @file Encryption at Rest Service
 * @module services/encryption
 * @author FOIA Stream Team
 * @description Provides field-level encryption for sensitive data in SQLite database.
 *              Implements AES-256-GCM encryption for data at rest compliance.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest) - GAP-001
 * @compliance ISO 27001 A.8.24 (Use of Cryptography)
 * @compliance CMMC 3.13.16 (Protecting CUI at Rest)
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from 'node:crypto';
import { Schema as S } from 'effect';
import { env } from '@/config/env';

// ============================================
// Effect Schema Type Definitions
// ============================================

export const EncryptionAlgorithmSchema = S.Literal('aes-256-gcm');
export type EncryptionAlgorithm = typeof EncryptionAlgorithmSchema.Type;

export const EncryptionConfigSchema = S.Struct({
  algorithm: EncryptionAlgorithmSchema,
  keyLength: S.Number.pipe(S.int(), S.positive()),
  ivLength: S.Number.pipe(S.int(), S.positive()),
  tagLength: S.Number.pipe(S.int(), S.positive()),
  saltLength: S.Number.pipe(S.int(), S.positive()),
  iterations: S.Number.pipe(S.int(), S.positive()),
});
export type EncryptionConfig = typeof EncryptionConfigSchema.Type;

export const EncryptionStatsSchema = S.Struct({
  encryptedFields: S.Number.pipe(S.int(), S.nonNegative()),
  unencryptedFields: S.Number.pipe(S.int(), S.nonNegative()),
  totalFields: S.Number.pipe(S.int(), S.nonNegative()),
  compliancePercentage: S.Number.pipe(S.nonNegative(), S.lessThanOrEqualTo(100)),
});
export type EncryptionStats = typeof EncryptionStatsSchema.Type;

export const EncryptionKeyRotationSchema = S.Struct({
  oldKey: S.instanceOf(Buffer),
  newKey: S.instanceOf(Buffer),
});
export type EncryptionKeyRotation = typeof EncryptionKeyRotationSchema.Type;

export const SensitiveFieldSchema = S.Literal(
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'bankAccount',
  'creditCard',
  'dateOfBirth',
  'medicalRecord',
  'personalAddress',
  'phoneNumber',
  'email',
  'attachmentContent',
  'requestContent',
);
export type SensitiveField = typeof SensitiveFieldSchema.Type;

// ============================================
// Configuration
// ============================================

const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
  iterations: 100000,
};

export const SENSITIVE_FIELDS: readonly SensitiveField[] = [
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'bankAccount',
  'creditCard',
  'dateOfBirth',
  'medicalRecord',
  'personalAddress',
  'phoneNumber',
  'email',
  'attachmentContent',
  'requestContent',
] as const;

// ============================================
// Key Management
// ============================================

let derivedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (!derivedKey) {
    const masterKey = env.JWT_SECRET;
    const salt = Buffer.from('foia-stream-encryption-salt-v1');
    derivedKey = scryptSync(masterKey, salt, ENCRYPTION_CONFIG.keyLength);
  }
  return derivedKey;
}

// ============================================
// Core Encryption Functions
// ============================================

/**
 * Encrypt a value for storage
 * Returns base64 encoded string: iv:tag:ciphertext
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(ENCRYPTION_CONFIG.ivLength);

  const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a stored encrypted value
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue || !encryptedValue.includes(':')) {
    return encryptedValue;
  }

  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      return encryptedValue;
    }

    const [ivBase64, tagBase64, ciphertext] = parts;
    if (!ivBase64 || !tagBase64 || !ciphertext) {
      return encryptedValue;
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');

    const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return encryptedValue;
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;

  try {
    const [ivBase64, tagBase64] = parts;
    if (!ivBase64 || !tagBase64) return false;

    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    return iv.length === ENCRYPTION_CONFIG.ivLength && tag.length === ENCRYPTION_CONFIG.tagLength;
  } catch {
    return false;
  }
}

// ============================================
// Object Encryption
// ============================================

/**
 * Encrypt sensitive fields in an object
 */
export function encryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[] = SENSITIVE_FIELDS,
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = encryptField(result[field] as string);
    }
  }

  return result;
}

/**
 * Decrypt sensitive fields in an object
 */
export function decryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  fields: readonly string[] = SENSITIVE_FIELDS,
): T {
  const result = { ...obj };

  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = decryptField(result[field] as string);
    }
  }

  return result;
}

// ============================================
// Key Rotation
// ============================================

/**
 * Rotate encryption key (re-encrypt all data with new key)
 */
export function rotateEncryptedField(
  encryptedValue: string,
  rotation: EncryptionKeyRotation,
): string {
  if (!encryptedValue || !encryptedValue.includes(':')) {
    return encryptedValue;
  }

  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      return encryptedValue;
    }

    const [ivBase64, tagBase64, ciphertext] = parts;
    if (!ivBase64 || !tagBase64 || !ciphertext) {
      return encryptedValue;
    }

    const oldIv = Buffer.from(ivBase64, 'base64');
    const oldTag = Buffer.from(tagBase64, 'base64');

    const decipher = createDecipheriv(ENCRYPTION_CONFIG.algorithm, rotation.oldKey, oldIv);
    decipher.setAuthTag(oldTag);

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    const newIv = randomBytes(ENCRYPTION_CONFIG.ivLength);
    const cipher = createCipheriv(ENCRYPTION_CONFIG.algorithm, rotation.newKey, newIv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const newTag = cipher.getAuthTag();

    return `${newIv.toString('base64')}:${newTag.toString('base64')}:${encrypted}`;
  } catch {
    return encryptedValue;
  }
}

// ============================================
// Search & Audit
// ============================================

/**
 * Hash sensitive data for searching (deterministic)
 */
export function hashForSearch(value: string): string {
  const key = getEncryptionKey();
  const hmac = createHmac('sha256', key);
  hmac.update(value.toLowerCase().trim());
  return hmac.digest('base64');
}

/**
 * Audit encrypted fields in a record
 */
export function auditEncryption(
  obj: Record<string, unknown>,
  sensitiveFields: readonly string[] = SENSITIVE_FIELDS,
): EncryptionStats {
  let encryptedFields = 0;
  let unencryptedFields = 0;

  for (const field of sensitiveFields) {
    if (field in obj && typeof obj[field] === 'string') {
      const value = obj[field] as string;
      if (value && isEncrypted(value)) {
        encryptedFields++;
      } else if (value) {
        unencryptedFields++;
      }
    }
  }

  const totalFields = encryptedFields + unencryptedFields;
  const compliancePercentage =
    totalFields > 0 ? Math.round((encryptedFields / totalFields) * 100) : 100;

  return {
    encryptedFields,
    unencryptedFields,
    totalFields,
    compliancePercentage,
  };
}

// ============================================
// Service Export
// ============================================

export const EncryptionService = {
  encryptField,
  decryptField,
  isEncrypted,
  encryptSensitiveFields,
  decryptSensitiveFields,
  rotateEncryptedField,
  hashForSearch,
  auditEncryption,
  SENSITIVE_FIELDS,
  ENCRYPTION_CONFIG,
};
