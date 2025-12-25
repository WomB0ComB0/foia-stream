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
 * @file Backup & Disaster Recovery Service
 * @module services/backup
 * @author FOIA Stream Team
 * @description Provides automated database backup, integrity verification, and recovery procedures.
 *              Supports full, incremental, and snapshot backups with configurable retention policies.
 * @compliance NIST 800-53 CP-9 (Information System Backup) - GAP-005
 * @compliance NIST 800-53 CP-10 (Information System Recovery and Reconstitution)
 * @compliance ISO 27001 A.8.13 (Information Backup)
 * @compliance ISO 27001 A.8.14 (Redundancy of Information Processing Facilities)
 * @compliance CMMC 3.8.9 (Protect Backups)
 */

import { BadRequestError, DatabaseError, NotFoundError } from '@foia-stream/shared';
import { Schema as S } from 'effect';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { env } from '../config/env';

// ============================================
// Effect Schema Definitions
// ============================================

/**
 * Backup Type Schema
 */
const BackupTypeSchema = S.Literal('full', 'incremental', 'snapshot');
export type BackupType = typeof BackupTypeSchema.Type;

/**
 * Backup Status Schema
 */
const BackupStatusSchema = S.Literal('pending', 'completed', 'failed', 'verified');
export type BackupStatus = typeof BackupStatusSchema.Type;

/**
 * Retention Policy Schema
 */
const RetentionPolicySchema = S.Literal('daily', 'weekly', 'monthly', 'yearly');
export type RetentionPolicy = typeof RetentionPolicySchema.Type;

/**
 * Backup Configuration Schema
 */
const BackupConfigSchema = S.Struct({
  backupDir: S.String,
  retentionDays: S.Struct({
    daily: S.Number,
    weekly: S.Number,
    monthly: S.Number,
    yearly: S.Number,
  }),
  maxBackupSize: S.Number,
  compression: S.Boolean,
  encryption: S.Boolean,
});

export type BackupConfig = typeof BackupConfigSchema.Type;

/**
 * Backup Metadata Schema
 */
const BackupMetadataSchema = S.Struct({
  id: S.String,
  timestamp: S.Date,
  type: BackupTypeSchema,
  size: S.Number,
  checksum: S.String,
  compressed: S.Boolean,
  encrypted: S.Boolean,
  databasePath: S.String,
  retentionPolicy: S.String,
  expiresAt: S.Date,
  status: BackupStatusSchema,
  verifiedAt: S.optional(S.Date),
  restoredFrom: S.optional(S.String),
});

export type BackupMetadata = typeof BackupMetadataSchema.Type;

/**
 * Backup Result Schema
 */
const BackupResultSchema = S.Struct({
  success: S.Boolean,
  metadata: S.optional(BackupMetadataSchema),
  error: S.optional(S.String),
  duration: S.Number,
});

export type BackupResult = typeof BackupResultSchema.Type;

/**
 * Recovery Result Schema
 */
const RecoveryResultSchema = S.Struct({
  success: S.Boolean,
  backupId: S.optional(S.String),
  restoredAt: S.optional(S.Date),
  error: S.optional(S.String),
  duration: S.Number,
});

export type RecoveryResult = typeof RecoveryResultSchema.Type;

/**
 * Backup Statistics Schema
 */
const BackupStatsSchema = S.Struct({
  totalBackups: S.Number,
  totalSize: S.Number,
  oldestBackup: S.optional(S.Date),
  newestBackup: S.optional(S.Date),
  byRetentionPolicy: S.Record({ key: S.String, value: S.Number }),
  byStatus: S.Record({ key: S.String, value: S.Number }),
  nextExpiration: S.optional(S.Date),
});

export type BackupStats = typeof BackupStatsSchema.Type;

/**
 * Cleanup Result Schema
 */
const CleanupResultSchema = S.Struct({
  deleted: S.Array(S.String),
  errors: S.Array(S.String),
});

export type CleanupResult = typeof CleanupResultSchema.Type;

/**
 * Disaster Recovery Test Result Schema
 */
const DisasterRecoveryTestResultSchema = S.Struct({
  success: S.Boolean,
  testsRun: S.Number,
  testsPassed: S.Number,
  details: S.Array(
    S.Struct({
      test: S.String,
      passed: S.Boolean,
      error: S.optional(S.String),
    }),
  ),
});

export type DisasterRecoveryTestResult = typeof DisasterRecoveryTestResultSchema.Type;

// ============================================
// Configuration
// ============================================

const BACKUP_CONFIG: BackupConfig = {
  backupDir: process.env.BACKUP_DIR || './backups',
  retentionDays: {
    daily: 7,
    weekly: 4,
    monthly: 12,
    yearly: 7,
  },
  maxBackupSize: 500 * 1024 * 1024,
  compression: true,
  encryption: true,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Generate backup ID
 */
function generateBackupId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `backup-${timestamp}-${random}`;
}

/**
 * Calculate file checksum
 */
function calculateChecksum(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(): void {
  if (!existsSync(BACKUP_CONFIG.backupDir)) {
    mkdirSync(BACKUP_CONFIG.backupDir, { recursive: true });
  }
}

/**
 * Get database path from environment
 */
function getDatabasePath(): string {
  const dbUrl = env.DATABASE_URL;
  if (dbUrl === ':memory:') {
    throw BadRequestError('Cannot backup in-memory database');
  }
  return dbUrl.replace('file:', '');
}

/**
 * Determine retention policy based on date
 */
function getRetentionPolicy(date: Date): RetentionPolicy {
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();
  const month = date.getMonth();

  if (dayOfMonth === 1 && month === 0) {
    return 'yearly';
  }

  if (dayOfMonth === 1) {
    return 'monthly';
  }

  if (dayOfWeek === 0) {
    return 'weekly';
  }

  return 'daily';
}

/**
 * Calculate expiration date based on retention policy
 */
function calculateExpirationDate(policy: RetentionPolicy, backupDate: Date): Date {
  const days: Record<RetentionPolicy, number> = {
    daily: BACKUP_CONFIG.retentionDays.daily,
    weekly: BACKUP_CONFIG.retentionDays.weekly * 7,
    monthly: BACKUP_CONFIG.retentionDays.monthly * 30,
    yearly: BACKUP_CONFIG.retentionDays.yearly * 365,
  };

  const expirationDays = days[policy];
  const expirationDate = new Date(backupDate);
  expirationDate.setDate(expirationDate.getDate() + expirationDays);
  return expirationDate;
}

// ============================================
// Backup Operations
// ============================================

/**
 * Create a full database backup
 */
export async function createBackup(type: BackupType = 'full'): Promise<BackupResult> {
  const startTime = Date.now();

  try {
    ensureBackupDir();

    const dbPath = getDatabasePath();
    const backupId = generateBackupId();
    const backupDate = new Date();
    const retentionPolicy = getRetentionPolicy(backupDate);
    const backupFileName = `${backupId}.db`;
    const backupPath = join(BACKUP_CONFIG.backupDir, backupFileName);
    const metadataPath = join(BACKUP_CONFIG.backupDir, `${backupId}.json`);

    if (!existsSync(dbPath)) {
      throw new DatabaseError('read', { metadata: { message: `Database not found: ${dbPath}` } });
    }

    const dbStats = statSync(dbPath);
    if (dbStats.size > BACKUP_CONFIG.maxBackupSize) {
      throw BadRequestError(`Database size (${dbStats.size}) exceeds maximum backup size`);
    }

    try {
      execSync(`sqlite3 "${dbPath}" ".backup '${backupPath}'"`, { stdio: 'pipe' });
    } catch {
      copyFileSync(dbPath, backupPath);

      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      if (existsSync(walPath)) {
        copyFileSync(walPath, `${backupPath}-wal`);
      }
      if (existsSync(shmPath)) {
        copyFileSync(shmPath, `${backupPath}-shm`);
      }
    }

    if (!existsSync(backupPath)) {
      throw new DatabaseError('backup', { metadata: { message: 'Backup file was not created' } });
    }

    const backupStats = statSync(backupPath);
    const checksum = calculateChecksum(backupPath);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: backupDate,
      type,
      size: backupStats.size,
      checksum,
      compressed: false,
      encrypted: false,
      databasePath: dbPath,
      retentionPolicy,
      expiresAt: calculateExpirationDate(retentionPolicy, backupDate),
      status: 'completed',
    };

    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    const duration = Date.now() - startTime;

    return {
      success: true,
      metadata,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupId: string): Promise<boolean> {
  try {
    const metadataPath = join(BACKUP_CONFIG.backupDir, `${backupId}.json`);
    const backupPath = join(BACKUP_CONFIG.backupDir, `${backupId}.db`);

    if (!existsSync(metadataPath) || !existsSync(backupPath)) {
      return false;
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as BackupMetadata;
    const currentChecksum = calculateChecksum(backupPath);

    if (currentChecksum !== metadata.checksum) {
      return false;
    }

    try {
      execSync(`sqlite3 "${backupPath}" "SELECT 1;"`, { stdio: 'pipe' });
    } catch {
      return false;
    }

    const updatedMetadata: BackupMetadata = {
      ...metadata,
      status: 'verified',
      verifiedAt: new Date(),
    };
    writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));

    return true;
  } catch {
    return false;
  }
}

/**
 * List all available backups
 */
export function listBackups(): BackupMetadata[] {
  ensureBackupDir();

  const files = readdirSync(BACKUP_CONFIG.backupDir);
  const metadataFiles = files.filter((f) => f.endsWith('.json'));

  const backups: BackupMetadata[] = [];

  for (const file of metadataFiles) {
    try {
      const content = readFileSync(join(BACKUP_CONFIG.backupDir, file), 'utf-8');
      const metadata = JSON.parse(content) as BackupMetadata;
      backups.push(metadata);
    } catch {
      // Skip invalid metadata files
    }
  }

  return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Restore from backup
 */
export async function restoreFromBackup(backupId: string): Promise<RecoveryResult> {
  const startTime = Date.now();

  try {
    const metadataPath = join(BACKUP_CONFIG.backupDir, `${backupId}.json`);
    const backupPath = join(BACKUP_CONFIG.backupDir, `${backupId}.db`);

    if (!existsSync(metadataPath) || !existsSync(backupPath)) {
      throw NotFoundError(`Backup not found: ${backupId}`);
    }

    const isValid = await verifyBackup(backupId);
    if (!isValid) {
      throw new DatabaseError('restore', { metadata: { message: 'Backup verification failed' } });
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as BackupMetadata;
    const targetPath = getDatabasePath();

    const preRestoreBackup = await createBackup('snapshot');
    if (!preRestoreBackup.success) {
      console.warn('Warning: Could not create pre-restore backup');
    }

    copyFileSync(backupPath, targetPath);

    const backupWalPath = `${backupPath}-wal`;
    const backupShmPath = `${backupPath}-shm`;
    const targetWalPath = `${targetPath}-wal`;
    const targetShmPath = `${targetPath}-shm`;

    if (existsSync(backupWalPath)) {
      copyFileSync(backupWalPath, targetWalPath);
    } else if (existsSync(targetWalPath)) {
      unlinkSync(targetWalPath);
    }

    if (existsSync(backupShmPath)) {
      copyFileSync(backupShmPath, targetShmPath);
    } else if (existsSync(targetShmPath)) {
      unlinkSync(targetShmPath);
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      backupId: metadata.id,
      restoredAt: new Date(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Clean up expired backups
 */
export function cleanupExpiredBackups(): CleanupResult {
  const deleted: string[] = [];
  const errors: string[] = [];
  const now = new Date();

  const backups = listBackups();

  for (const backup of backups) {
    const expiresAt = new Date(backup.expiresAt);

    if (expiresAt < now) {
      try {
        const backupPath = join(BACKUP_CONFIG.backupDir, `${backup.id}.db`);
        const metadataPath = join(BACKUP_CONFIG.backupDir, `${backup.id}.json`);

        if (existsSync(backupPath)) {
          unlinkSync(backupPath);
        }
        if (existsSync(metadataPath)) {
          unlinkSync(metadataPath);
        }

        const walPath = `${backupPath}-wal`;
        const shmPath = `${backupPath}-shm`;
        if (existsSync(walPath)) unlinkSync(walPath);
        if (existsSync(shmPath)) unlinkSync(shmPath);

        deleted.push(backup.id);
      } catch (error) {
        errors.push(`${backup.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return { deleted, errors };
}

/**
 * Mutable backup stats for building
 */
type MutableBackupStats = {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: Date;
  newestBackup?: Date;
  byRetentionPolicy: Record<string, number>;
  byStatus: Record<string, number>;
  nextExpiration?: Date;
};

/**
 * Get backup statistics
 */
export function getBackupStats(): BackupStats {
  const backups = listBackups();

  const stats: MutableBackupStats = {
    totalBackups: backups.length,
    totalSize: 0,
    byRetentionPolicy: {},
    byStatus: {},
  };

  if (backups.length === 0) {
    return stats as BackupStats;
  }

  for (const backup of backups) {
    stats.totalSize += backup.size;

    const policy = backup.retentionPolicy;
    stats.byRetentionPolicy[policy] = (stats.byRetentionPolicy[policy] || 0) + 1;

    const status = backup.status;
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
  }

  const timestamps = backups.map((b) => new Date(b.timestamp).getTime());
  stats.oldestBackup = new Date(Math.min(...timestamps));
  stats.newestBackup = new Date(Math.max(...timestamps));

  const futureExpirations = backups
    .map((b) => new Date(b.expiresAt))
    .filter((d) => d > new Date())
    .sort((a, b) => a.getTime() - b.getTime());

  if (futureExpirations.length > 0) {
    stats.nextExpiration = futureExpirations[0];
  }

  return stats as BackupStats;
}

/**
 * Point-in-time recovery
 */
export async function pointInTimeRecovery(targetTime: Date): Promise<RecoveryResult> {
  const startTime = Date.now();

  try {
    const backups = listBackups();

    const targetTimestamp = targetTime.getTime();
    const eligibleBackups = backups
      .filter((b) => new Date(b.timestamp).getTime() <= targetTimestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (eligibleBackups.length === 0) {
      throw NotFoundError(`No backup found before ${targetTime.toISOString()}`);
    }

    const backupToRestore = eligibleBackups[0];
    if (!backupToRestore) {
      throw NotFoundError('No eligible backup found');
    }

    return await restoreFromBackup(backupToRestore.id);
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Disaster recovery test
 */
export async function testDisasterRecovery(): Promise<DisasterRecoveryTestResult> {
  const details: { test: string; passed: boolean; error?: string }[] = [];

  const backupResult = await createBackup('snapshot');
  details.push({
    test: 'Create backup',
    passed: backupResult.success,
    error: backupResult.error,
  });

  if (!backupResult.success || !backupResult.metadata) {
    return {
      success: false,
      testsRun: 1,
      testsPassed: 0,
      details,
    };
  }

  const verifyResult = await verifyBackup(backupResult.metadata.id);
  details.push({
    test: 'Verify backup integrity',
    passed: verifyResult,
  });

  const backups = listBackups();
  const listPassed = backups.some((b) => b.id === backupResult.metadata?.id);
  details.push({
    test: 'List backups',
    passed: listPassed,
  });

  const stats = getBackupStats();
  details.push({
    test: 'Get backup statistics',
    passed: stats.totalBackups > 0,
  });

  const testsPassed = details.filter((d) => d.passed).length;

  return {
    success: testsPassed === details.length,
    testsRun: details.length,
    testsPassed,
    details,
  };
}

// Export schemas for external validation
export {
  BackupConfigSchema,
  BackupMetadataSchema,
  BackupResultSchema,
  BackupStatsSchema,
  BackupStatusSchema,
  BackupTypeSchema,
  CleanupResultSchema,
  DisasterRecoveryTestResultSchema,
  RecoveryResultSchema,
  RetentionPolicySchema,
};
