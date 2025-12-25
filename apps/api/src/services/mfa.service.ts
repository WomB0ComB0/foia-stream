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
 * @file Multi-Factor Authentication Service
 * @module services/mfa
 * @author FOIA Stream Team
 * @description Provides TOTP-based two-factor authentication for enhanced security.
 *              Includes backup codes for account recovery scenarios.
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 * @compliance SOC 2 CC6.1 (Logical Access Security)
 * @compliance ISO 27001 A.8.5 (Secure Authentication)
 */

// ============================================
// FOIA Stream - Multi-Factor Authentication Service
// ============================================

import { BadRequestError, NotFoundError, SecurityError } from '@foia-stream/shared';
import { eq } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { nanoid } from 'nanoid';
import { createHmac, randomBytes } from 'node:crypto';
import { db, schema } from '../db';
import { logger } from '../lib/logger';
import { decryptData, encryptData, getEncryptionKey } from '../utils/security';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * TOTP Configuration Schema
 */
const TOTPConfigSchema = S.Struct({
  DIGITS: S.Number,
  PERIOD: S.Number,
  ALGORITHM: S.Literal('sha1', 'sha256', 'sha512'),
  WINDOW: S.Number,
  BACKUP_CODES_COUNT: S.Number,
});

export type TOTPConfig = typeof TOTPConfigSchema.Type;

/**
 * MFA Setup Result Schema
 */
const MFASetupResultSchema = S.Struct({
  secret: S.String,
  qrCodeUrl: S.String,
  backupCodes: S.Array(S.String),
});

export type MFASetupResult = typeof MFASetupResultSchema.Type;

/**
 * MFA Verify Result Schema
 */
const MFAVerifyResultSchema = S.Struct({
  success: S.Boolean,
  usedBackupCode: S.optional(S.Boolean),
  remainingBackupCodes: S.optional(S.Number),
});

export type MFAVerifyResult = typeof MFAVerifyResultSchema.Type;

/**
 * Encrypted Secret Data Schema (stored in database)
 */
const EncryptedSecretDataSchema = S.Struct({
  secret: S.String,
  backupCodes: S.String,
  pending: S.Boolean,
});

export type EncryptedSecretData = typeof EncryptedSecretDataSchema.Type;

/**
 * MFA Status Schema
 */
const MFAStatusSchema = S.Struct({
  enabled: S.Boolean,
  hasPendingSetup: S.Boolean,
  backupCodesRemaining: S.optional(S.Number),
});

export type MFAStatus = typeof MFAStatusSchema.Type;

/**
 * Backup Code Schema
 */
const BackupCodeSchema = S.Struct({
  code: S.String,
  used: S.Boolean,
  usedAt: S.optional(S.String),
});

export type BackupCode = typeof BackupCodeSchema.Type;

/**
 * MFA Event Type Schema
 */
const MFAEventTypeSchema = S.Literal(
  'security_mfa_enabled',
  'security_mfa_disabled',
  'security_mfa_backup_used',
  'security_mfa_backup_regenerated',
  'security_mfa_verify_failed',
);

export type MFAEventType = typeof MFAEventTypeSchema.Type;

// ============================================
// Constants
// ============================================

const TOTP_CONFIG: TOTPConfig = {
  DIGITS: 6,
  PERIOD: 30,
  ALGORITHM: 'sha1',
  WINDOW: 1,
  BACKUP_CODES_COUNT: 10,
};

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a random secret for TOTP
 */
function generateSecret(length: number = 20): string {
  const buffer = randomBytes(length);
  let secret = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte !== undefined) {
      secret += BASE32_ALPHABET[byte % 32];
    }
  }
  return secret;
}

/**
 * Decode base32 to buffer
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = '';

  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) throw new SecurityError('authentication', 'Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP code for a given time
 */
function generateTOTP(secret: string, time: number = Date.now()): string {
  const counter = Math.floor(time / 1000 / TOTP_CONFIG.PERIOD);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const hmac = createHmac(TOTP_CONFIG.ALGORITHM, key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  const lastByte = hash[hash.length - 1];
  if (lastByte === undefined) {
    throw new SecurityError('authentication', 'Invalid HMAC output');
  }
  const offset = lastByte & 0x0f;

  const b0 = hash[offset];
  const b1 = hash[offset + 1];
  const b2 = hash[offset + 2];
  const b3 = hash[offset + 3];

  if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) {
    throw new SecurityError('authentication', 'Invalid HMAC output');
  }

  const code =
    (((b0 & 0x7f) << 24) | ((b1 & 0xff) << 16) | ((b2 & 0xff) << 8) | (b3 & 0xff)) %
    10 ** TOTP_CONFIG.DIGITS;

  return code.toString().padStart(TOTP_CONFIG.DIGITS, '0');
}

/**
 * Verify a TOTP code with time window tolerance
 */
function verifyTOTP(secret: string, code: string, time: number = Date.now()): boolean {
  const periodMs = TOTP_CONFIG.PERIOD * 1000;

  for (let i = -TOTP_CONFIG.WINDOW; i <= TOTP_CONFIG.WINDOW; i++) {
    const checkTime = time + i * periodMs;
    if (generateTOTP(secret, checkTime) === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count: number = TOTP_CONFIG.BACKUP_CODES_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

// ============================================
// MFA Service Class
// ============================================

export class MFAService {
  private readonly appName = 'FOIA Stream';

  /**
   * Initialize MFA setup for a user
   */
  async setupMFA(userId: string): Promise<MFASetupResult> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user) {
      throw NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw BadRequestError('MFA is already enabled for this user');
    }

    const secret = generateSecret();
    const backupCodes = generateBackupCodes();

    const encryptionKey = await getEncryptionKey();
    const encryptedSecret = await encryptData(secret, encryptionKey);
    const encryptedBackupCodes = await encryptData(JSON.stringify(backupCodes), encryptionKey);

    const secretData: EncryptedSecretData = {
      secret: encryptedSecret,
      backupCodes: encryptedBackupCodes,
      pending: true,
    };

    await db
      .update(schema.users)
      .set({
        twoFactorSecret: JSON.stringify(secretData),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    const qrCodeUrl = this.generateQRCodeUrl(user.email, secret);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify and enable MFA with initial TOTP code
   */
  async verifyAndEnableMFA(userId: string, code: string): Promise<boolean> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user || !user.twoFactorSecret) {
      throw BadRequestError('MFA setup not initiated');
    }

    const secretData = JSON.parse(user.twoFactorSecret as string) as EncryptedSecretData;
    if (!secretData.pending) {
      throw BadRequestError('MFA is already enabled');
    }

    const encryptionKey = await getEncryptionKey();
    const secret = await decryptData(secretData.secret, encryptionKey);
    const expectedCode = generateTOTP(secret, Date.now());

    logger.debug({ inputCode: code, expectedCode, secretLength: secret.length }, 'MFA setup verification attempt');

    if (!verifyTOTP(secret, code)) {
      logger.debug({ userId }, 'MFA setup TOTP verification failed');
      return false;
    }

    logger.debug({ userId }, 'MFA setup TOTP verification succeeded');

    const updatedSecretData: EncryptedSecretData = {
      ...secretData,
      pending: false,
    };

    await db
      .update(schema.users)
      .set({
        twoFactorEnabled: true,
        twoFactorSecret: JSON.stringify(updatedSecretData),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    await this.logMFAEvent(userId, 'security_mfa_enabled');

    return true;
  }

  /**
   * Verify MFA code during login
   */
  async verifyMFA(userId: string, code: string): Promise<MFAVerifyResult> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      logger.debug({
        userId,
        hasUser: !!user,
        twoFactorEnabled: user?.twoFactorEnabled,
        hasTwoFactorSecret: !!user?.twoFactorSecret
      }, 'MFA login verification - user or 2FA not enabled');
      throw BadRequestError('MFA is not enabled for this user');
    }

    const secretData = JSON.parse(user.twoFactorSecret as string) as EncryptedSecretData;
    logger.debug({ userId, pending: secretData.pending }, 'MFA login verification - secret data status');

    const encryptionKey = await getEncryptionKey();
    const secret = await decryptData(secretData.secret, encryptionKey);
    const expectedCode = generateTOTP(secret, Date.now());

    logger.debug({ inputCode: code, expectedCode, secretLength: secret.length }, 'MFA login TOTP verification attempt');

    if (verifyTOTP(secret, code)) {
      logger.debug({ userId }, 'MFA login TOTP verification succeeded');
      return { success: true, usedBackupCode: false };
    }

    logger.debug({ userId }, 'MFA login TOTP verification failed, checking backup codes');

    const backupCodes: string[] = JSON.parse(
      await decryptData(secretData.backupCodes, encryptionKey),
    );

    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formattedCode =
      normalizedCode.length === 8
        ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`
        : code.toUpperCase();

    const codeIndex = backupCodes.indexOf(formattedCode);
    if (codeIndex !== -1) {
      backupCodes.splice(codeIndex, 1);
      const encryptedBackupCodes = await encryptData(JSON.stringify(backupCodes), encryptionKey);

      const updatedSecretData: EncryptedSecretData = {
        ...secretData,
        backupCodes: encryptedBackupCodes,
      };

      await db
        .update(schema.users)
        .set({
          twoFactorSecret: JSON.stringify(updatedSecretData),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.users.id, userId));

      await this.logMFAEvent(userId, 'security_mfa_backup_used');

      return {
        success: true,
        usedBackupCode: true,
        remainingBackupCodes: backupCodes.length,
      };
    }

    await this.logMFAEvent(userId, 'security_mfa_verify_failed');

    return { success: false };
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string): Promise<void> {
    await db
      .update(schema.users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    await this.logMFAEvent(userId, 'security_mfa_disabled');
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw BadRequestError('MFA is not enabled for this user');
    }

    const secretData = JSON.parse(user.twoFactorSecret as string) as EncryptedSecretData;
    const encryptionKey = await getEncryptionKey();

    const newBackupCodes = generateBackupCodes();
    const encryptedBackupCodes = await encryptData(JSON.stringify(newBackupCodes), encryptionKey);

    const updatedSecretData: EncryptedSecretData = {
      ...secretData,
      backupCodes: encryptedBackupCodes,
    };

    await db
      .update(schema.users)
      .set({
        twoFactorSecret: JSON.stringify(updatedSecretData),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    await this.logMFAEvent(userId, 'security_mfa_backup_regenerated');

    return newBackupCodes;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await db
      .select({ twoFactorEnabled: schema.users.twoFactorEnabled })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    return user?.twoFactorEnabled ?? false;
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<MFAStatus> {
    const user = await db
      .select({
        twoFactorEnabled: schema.users.twoFactorEnabled,
        twoFactorSecret: schema.users.twoFactorSecret,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    if (!user) {
      return { enabled: false, hasPendingSetup: false };
    }

    if (!user.twoFactorSecret) {
      return { enabled: false, hasPendingSetup: false };
    }

    const secretData = JSON.parse(user.twoFactorSecret as string) as EncryptedSecretData;

    if (secretData.pending) {
      return { enabled: false, hasPendingSetup: true };
    }

    const encryptionKey = await getEncryptionKey();
    const backupCodes: string[] = JSON.parse(
      await decryptData(secretData.backupCodes, encryptionKey),
    );

    return {
      enabled: user.twoFactorEnabled ?? false,
      hasPendingSetup: false,
      backupCodesRemaining: backupCodes.length,
    };
  }

  /**
   * Generate otpauth:// URL for QR code
   */
  private generateQRCodeUrl(email: string, secret: string): string {
    const issuer = encodeURIComponent(this.appName);
    const account = encodeURIComponent(email);
    return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=${TOTP_CONFIG.ALGORITHM.toUpperCase()}&digits=${TOTP_CONFIG.DIGITS}&period=${TOTP_CONFIG.PERIOD}`;
  }

  /**
   * Log MFA security event
   */
  private async logMFAEvent(userId: string, action: MFAEventType): Promise<void> {
    await db.insert(schema.auditLogs).values({
      id: nanoid(),
      userId,
      action: action as (typeof schema.auditLogs.$inferInsert)['action'],
      resourceType: 'user',
      resourceId: userId,
      details: { timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
    });
  }
}

export const mfaService = new MFAService();

// Export schemas for external validation
export {
  BackupCodeSchema,
  EncryptedSecretDataSchema,
  MFAEventTypeSchema,
  MFASetupResultSchema,
  MFAStatusSchema,
  MFAVerifyResultSchema,
  TOTPConfigSchema,
};
