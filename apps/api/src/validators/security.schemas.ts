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
 * @file Security Validation Schemas (Effect Schema)
 * @module validators/security-schemas
 * @author FOIA Stream Team
 * @description Effect Schema definitions for security-related validation.
 *              Includes encryption, audit logging, MFA, and session schemas.
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 * @compliance NIST 800-53 AU-2 (Audit Events)
 */

// ============================================
// FOIA Stream - Security Validation Schemas (Effect Schema)
// ============================================

import { Schema as S } from 'effect';

// ============================================
// Encryption Schemas
// ============================================

export const EncryptedFieldPrefixSchema = S.Literal('enc:');
export type EncryptedFieldPrefix = typeof EncryptedFieldPrefixSchema.Type;

export const EncryptionAlgorithmSchema = S.Literal('aes-256-gcm');
export type EncryptionAlgorithm = typeof EncryptionAlgorithmSchema.Type;

export const EncryptedDataSchema = S.Struct({
  iv: S.String.pipe(S.minLength(1)),
  authTag: S.String.pipe(S.minLength(1)),
  data: S.String.pipe(S.minLength(1)),
});
export type EncryptedData = typeof EncryptedDataSchema.Type;

export const EncryptionConfigSchema = S.Struct({
  algorithm: EncryptionAlgorithmSchema.pipe(
    S.optionalWith({ default: () => 'aes-256-gcm' as const }),
  ),
  keyLength: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 32 })),
  ivLength: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 16 })),
  saltLength: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 64 })),
  iterations: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 100000 })),
});
export type EncryptionConfig = typeof EncryptionConfigSchema.Type;

export const SensitiveFieldsSchema = S.Array(S.String);
export type SensitiveFields = typeof SensitiveFieldsSchema.Type;

export const EncryptionAuditResultSchema = S.Struct({
  totalFields: S.Number.pipe(S.int(), S.nonNegative()),
  encryptedFields: S.Number.pipe(S.int(), S.nonNegative()),
  unencryptedFields: S.Number.pipe(S.int(), S.nonNegative()),
  compliancePercentage: S.Number.pipe(S.nonNegative()),
});
export type EncryptionAuditResult = typeof EncryptionAuditResultSchema.Type;

// ============================================
// Security Monitoring Schemas
// ============================================

export const SecurityEventTypeSchema = S.Literal(
  'failed_login',
  'successful_login',
  'account_lockout',
  'password_change',
  'mfa_enabled',
  'mfa_disabled',
  'privilege_escalation',
  'unauthorized_access',
  'rate_limit_exceeded',
  'suspicious_activity',
  'data_export',
  'bulk_data_access',
  'admin_action',
  'session_invalidated',
  'api_key_created',
  'api_key_revoked',
);
export type SecurityEventType = typeof SecurityEventTypeSchema.Type;

export const SecurityEventSeveritySchema = S.Literal('low', 'medium', 'high', 'critical');
export type SecurityEventSeverity = typeof SecurityEventSeveritySchema.Type;

export const SecurityEventSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  type: SecurityEventTypeSchema,
  severity: SecurityEventSeveritySchema,
  userId: S.NullOr(S.String),
  ipAddress: S.NullOr(S.String),
  userAgent: S.NullOr(S.String),
  details: S.Record({ key: S.String, value: S.Unknown }),
  timestamp: S.String,
});
export type SecurityEvent = typeof SecurityEventSchema.Type;

export const CreateSecurityEventSchema = S.Struct({
  type: SecurityEventTypeSchema,
  severity: SecurityEventSeveritySchema,
  userId: S.optional(S.NullOr(S.String)),
  ipAddress: S.optional(S.NullOr(S.String)),
  userAgent: S.optional(S.NullOr(S.String)),
  details: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type CreateSecurityEvent = typeof CreateSecurityEventSchema.Type;

export const AlertConditionSchema = S.Struct({
  eventType: SecurityEventTypeSchema,
  threshold: S.Number.pipe(S.int(), S.positive()),
  windowMinutes: S.Number.pipe(S.int(), S.positive()),
  action: S.Literal('log', 'email', 'slack', 'block'),
});
export type AlertCondition = typeof AlertConditionSchema.Type;

export const SecurityDashboardSchema = S.Struct({
  totalEvents: S.Number.pipe(S.int(), S.nonNegative()),
  eventsByType: S.Record({ key: S.String, value: S.Number }),
  eventsBySeverity: S.Record({ key: S.String, value: S.Number }),
  recentAlerts: S.Array(SecurityEventSchema),
  failedLoginAttempts: S.Number.pipe(S.int(), S.nonNegative()),
  accountLockouts: S.Number.pipe(S.int(), S.nonNegative()),
  lastUpdated: S.String,
});
export type SecurityDashboard = typeof SecurityDashboardSchema.Type;

// ============================================
// MFA Schemas
// ============================================

export const MFAMethodSchema = S.Literal('totp', 'backup_code');
export type MFAMethod = typeof MFAMethodSchema.Type;

export const TOTPConfigSchema = S.Struct({
  issuer: S.String.pipe(S.minLength(1)),
  algorithm: S.Literal('SHA1', 'SHA256', 'SHA512').pipe(
    S.optionalWith({ default: () => 'SHA1' as const }),
  ),
  digits: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 6 })),
  period: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 30 })),
});
export type TOTPConfig = typeof TOTPConfigSchema.Type;

export const MFASetupResultSchema = S.Struct({
  secret: S.String.pipe(S.minLength(1)),
  qrCodeUri: S.String.pipe(S.minLength(1)),
  backupCodes: S.Array(S.String.pipe(S.minLength(1))),
});
export type MFASetupResult = typeof MFASetupResultSchema.Type;

export const MFAVerificationSchema = S.Struct({
  userId: S.String.pipe(S.minLength(1)),
  code: S.String.pipe(S.minLength(6), S.maxLength(8)),
  method: MFAMethodSchema.pipe(S.optionalWith({ default: () => 'totp' as const })),
});
export type MFAVerification = typeof MFAVerificationSchema.Type;

export const MFAStatusSchema = S.Struct({
  enabled: S.Boolean,
  method: S.NullOr(MFAMethodSchema),
  backupCodesRemaining: S.Number.pipe(S.int(), S.nonNegative()),
  lastUsed: S.NullOr(S.String),
});
export type MFAStatus = typeof MFAStatusSchema.Type;

// ============================================
// Backup & Disaster Recovery Schemas
// ============================================

export const BackupTypeSchema = S.Literal('full', 'incremental', 'differential');
export type BackupType = typeof BackupTypeSchema.Type;

export const BackupStatusSchema = S.Literal(
  'pending',
  'in_progress',
  'completed',
  'failed',
  'verified',
);
export type BackupStatus = typeof BackupStatusSchema.Type;

export const BackupMetadataSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  type: BackupTypeSchema,
  status: BackupStatusSchema,
  createdAt: S.String,
  completedAt: S.NullOr(S.String),
  sizeBytes: S.Number.pipe(S.int(), S.nonNegative()),
  checksum: S.String.pipe(S.minLength(1)),
  path: S.String.pipe(S.minLength(1)),
  databaseIncluded: S.Boolean,
  uploadsIncluded: S.Boolean,
  retentionDays: S.Number.pipe(S.int(), S.positive()),
});
export type BackupMetadata = typeof BackupMetadataSchema.Type;

export const CreateBackupOptionsSchema = S.Struct({
  type: BackupTypeSchema.pipe(S.optionalWith({ default: () => 'full' as const })),
  includeDatabase: S.Boolean.pipe(S.optionalWith({ default: () => true })),
  includeUploads: S.Boolean.pipe(S.optionalWith({ default: () => true })),
  retentionDays: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 30 })),
  compress: S.Boolean.pipe(S.optionalWith({ default: () => true })),
});
export type CreateBackupOptions = typeof CreateBackupOptionsSchema.Type;

export const BackupVerificationResultSchema = S.Struct({
  backupId: S.String.pipe(S.minLength(1)),
  isValid: S.Boolean,
  checksumMatch: S.Boolean,
  filesIntact: S.Boolean,
  verifiedAt: S.String,
  errors: S.Array(S.String),
});
export type BackupVerificationResult = typeof BackupVerificationResultSchema.Type;

export const RestoreOptionsSchema = S.Struct({
  backupId: S.String.pipe(S.minLength(1)),
  targetPath: S.optional(S.String),
  restoreDatabase: S.Boolean.pipe(S.optionalWith({ default: () => true })),
  restoreUploads: S.Boolean.pipe(S.optionalWith({ default: () => true })),
  dryRun: S.Boolean.pipe(S.optionalWith({ default: () => false })),
});
export type RestoreOptions = typeof RestoreOptionsSchema.Type;

export const RestoreResultSchema = S.Struct({
  success: S.Boolean,
  backupId: S.String.pipe(S.minLength(1)),
  restoredAt: S.String,
  databaseRestored: S.Boolean,
  uploadsRestored: S.Boolean,
  filesRestored: S.Number.pipe(S.int(), S.nonNegative()),
  errors: S.Array(S.String),
  dryRun: S.Boolean,
});
export type RestoreResult = typeof RestoreResultSchema.Type;

export const DisasterRecoveryTestResultSchema = S.Struct({
  success: S.Boolean,
  testedAt: S.String,
  backupCreationTime: S.Number.pipe(S.nonNegative()),
  verificationTime: S.Number.pipe(S.nonNegative()),
  restoreTime: S.Number.pipe(S.nonNegative()),
  totalTime: S.Number.pipe(S.nonNegative()),
  rtoMet: S.Boolean,
  rpoMet: S.Boolean,
  errors: S.Array(S.String),
});
export type DisasterRecoveryTestResult = typeof DisasterRecoveryTestResultSchema.Type;

export const BackupStatsSchema = S.Struct({
  totalBackups: S.Number.pipe(S.int(), S.nonNegative()),
  totalSizeBytes: S.Number.pipe(S.int(), S.nonNegative()),
  oldestBackup: S.NullOr(S.String),
  newestBackup: S.NullOr(S.String),
  lastVerifiedBackup: S.NullOr(S.String),
  backupsByType: S.Record({ key: S.String, value: S.Number }),
  backupsByStatus: S.Record({ key: S.String, value: S.Number }),
});
export type BackupStats = typeof BackupStatsSchema.Type;

// ============================================
// Rate Limiting Schemas
// ============================================

export const RateLimitConfigSchema = S.Struct({
  windowMs: S.Number.pipe(S.int(), S.positive()),
  maxRequests: S.Number.pipe(S.int(), S.positive()),
  message: S.optional(S.String),
  keyGenerator: S.optional(S.String),
  skipFailedRequests: S.Boolean.pipe(S.optionalWith({ default: () => false })),
  skipSuccessfulRequests: S.Boolean.pipe(S.optionalWith({ default: () => false })),
});
export type RateLimitConfig = typeof RateLimitConfigSchema.Type;

export const RateLimitPresetNameSchema = S.Literal(
  'auth',
  'password_reset',
  'api',
  'strict',
  'relaxed',
);
export type RateLimitPresetName = typeof RateLimitPresetNameSchema.Type;

export const RateLimitInfoSchema = S.Struct({
  limit: S.Number.pipe(S.int(), S.positive()),
  remaining: S.Number.pipe(S.int(), S.nonNegative()),
  resetAt: S.String,
  retryAfterMs: S.optional(S.Number.pipe(S.int(), S.nonNegative())),
});
export type RateLimitInfo = typeof RateLimitInfoSchema.Type;

export const RateLimitEntrySchema = S.Struct({
  key: S.String.pipe(S.minLength(1)),
  count: S.Number.pipe(S.int(), S.nonNegative()),
  firstRequest: S.String,
  lastRequest: S.String,
  blocked: S.Boolean,
});
export type RateLimitEntry = typeof RateLimitEntrySchema.Type;

// ============================================
// Data Retention Schemas
// ============================================

export const RetentionPeriodSchema = S.Struct({
  closedRequests: S.Number.pipe(S.int(), S.positive()),
  inactiveUsers: S.Number.pipe(S.int(), S.positive()),
  auditLogs: S.Number.pipe(S.int(), S.positive()),
  sessions: S.Number.pipe(S.int(), S.positive()),
  orphanedDocuments: S.Number.pipe(S.int(), S.positive()),
});
export type RetentionPeriod = typeof RetentionPeriodSchema.Type;

export const RetentionResultSchema = S.Struct({
  type: S.String.pipe(S.minLength(1)),
  recordsEvaluated: S.Number.pipe(S.int(), S.nonNegative()),
  recordsPurged: S.Number.pipe(S.int(), S.nonNegative()),
  errors: S.Array(S.String),
  dryRun: S.Boolean,
});
export type RetentionResult = typeof RetentionResultSchema.Type;

export const RetentionReportSchema = S.Struct({
  executedAt: S.String,
  dryRun: S.Boolean,
  results: S.Array(RetentionResultSchema),
  totalPurged: S.Number.pipe(S.int(), S.nonNegative()),
});
export type RetentionReport = typeof RetentionReportSchema.Type;

export const RetentionStatsSchema = S.Struct({
  sessions: S.Struct({
    total: S.Number.pipe(S.int(), S.nonNegative()),
    expiredCount: S.Number.pipe(S.int(), S.nonNegative()),
  }),
  closedRequests: S.Struct({
    total: S.Number.pipe(S.int(), S.nonNegative()),
    expiringCount: S.Number.pipe(S.int(), S.nonNegative()),
  }),
  inactiveUsers: S.Struct({
    total: S.Number.pipe(S.int(), S.nonNegative()),
    eligibleForPurge: S.Number.pipe(S.int(), S.nonNegative()),
  }),
  auditLogs: S.Struct({
    total: S.Number.pipe(S.int(), S.nonNegative()),
    oldCount: S.Number.pipe(S.int(), S.nonNegative()),
  }),
});
export type RetentionStats = typeof RetentionStatsSchema.Type;

export const DataSubjectDeletionRequestSchema = S.Struct({
  userId: S.String.pipe(S.minLength(1)),
  requestedBy: S.String.pipe(S.minLength(1)),
  reason: S.optional(S.String),
  verificationMethod: S.optional(S.Literal('email', 'identity_document', 'other')),
});
export type DataSubjectDeletionRequest = typeof DataSubjectDeletionRequestSchema.Type;

export const DataSubjectDeletionResultSchema = S.Struct({
  success: S.Boolean,
  anonymizedRecords: S.Number.pipe(S.int(), S.nonNegative()),
  errors: S.Array(S.String),
  completedAt: S.optional(S.String),
});
export type DataSubjectDeletionResult = typeof DataSubjectDeletionResultSchema.Type;

// ============================================
// Account Lockout Schemas
// ============================================

export const AccountLockoutConfigSchema = S.Struct({
  maxFailedAttempts: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 5 })),
  lockoutDurationMinutes: S.Number.pipe(
    S.int(),
    S.positive(),
    S.optionalWith({ default: () => 15 }),
  ),
  progressiveLockout: S.Boolean.pipe(S.optionalWith({ default: () => true })),
  notifyOnLockout: S.Boolean.pipe(S.optionalWith({ default: () => true })),
});
export type AccountLockoutConfig = typeof AccountLockoutConfigSchema.Type;

export const AccountLockoutStatusSchema = S.Struct({
  isLocked: S.Boolean,
  failedAttempts: S.Number.pipe(S.int(), S.nonNegative()),
  lockedUntil: S.NullOr(S.String),
  lastFailedAt: S.NullOr(S.String),
  remainingAttempts: S.Number.pipe(S.int(), S.nonNegative()),
});
export type AccountLockoutStatus = typeof AccountLockoutStatusSchema.Type;

// ============================================
// Audit Log Schemas
// ============================================

export const AuditLogActionSchema = S.Literal(
  'user_created',
  'user_login',
  'user_logout',
  'user_updated',
  'user_deleted',
  'request_created',
  'request_submitted',
  'request_updated',
  'document_uploaded',
  'document_viewed',
  'document_downloaded',
  'comment_created',
  'appeal_filed',
  'admin_action',
  'security_failed_login',
  'security_successful_login',
  'security_account_lockout',
  'security_password_change',
  'security_mfa_enabled',
  'security_mfa_disabled',
  'security_privilege_escalation',
  'security_unauthorized_access',
  'security_rate_limit_exceeded',
  'security_suspicious_activity',
  'security_data_export',
  'security_bulk_data_access',
  'security_admin_action',
  'security_session_invalidated',
  'security_api_key_created',
  'security_api_key_revoked',
  'retention_delete',
  'retention_archive',
  'backup_created',
  'backup_restored',
);
export type AuditLogAction = typeof AuditLogActionSchema.Type;

export const CreateAuditLogSchema = S.Struct({
  action: AuditLogActionSchema,
  resourceType: S.String.pipe(S.minLength(1)),
  resourceId: S.String.pipe(S.minLength(1)),
  userId: S.NullOr(S.String),
  details: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  ipAddress: S.optional(S.NullOr(S.String)),
  userAgent: S.optional(S.NullOr(S.String)),
});
export type CreateAuditLog = typeof CreateAuditLogSchema.Type;

export const AuditLogQuerySchema = S.Struct({
  userId: S.optional(S.String),
  action: S.optional(AuditLogActionSchema),
  resourceType: S.optional(S.String),
  resourceId: S.optional(S.String),
  startDate: S.optional(S.String),
  endDate: S.optional(S.String),
  page: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 1 })),
  pageSize: S.Number.pipe(
    S.int(),
    S.positive(),
    S.lessThanOrEqualTo(100),
    S.optionalWith({ default: () => 50 }),
  ),
});
export type AuditLogQuery = typeof AuditLogQuerySchema.Type;

// ============================================
// Compliance Evidence Schemas
// ============================================

export const ComplianceFrameworkSchema = S.Literal(
  'SOC2',
  'ISO27001',
  'NIST800-53',
  'FedRAMP',
  'GDPR',
  'CCPA',
);
export type ComplianceFramework = typeof ComplianceFrameworkSchema.Type;

export const ControlStatusSchema = S.Literal('implemented', 'partial', 'planned', 'not_applicable');
export type ControlStatus = typeof ControlStatusSchema.Type;

export const ComplianceControlSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  framework: ComplianceFrameworkSchema,
  controlId: S.String.pipe(S.minLength(1)),
  title: S.String.pipe(S.minLength(1)),
  description: S.String,
  status: ControlStatusSchema,
  implementationNotes: S.optional(S.String),
  evidenceLinks: S.Array(S.String),
  lastAssessed: S.String,
  nextAssessment: S.optional(S.String),
});
export type ComplianceControl = typeof ComplianceControlSchema.Type;

export const ComplianceEvidenceSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  controlId: S.String.pipe(S.minLength(1)),
  type: S.Literal('screenshot', 'log', 'config', 'policy', 'test_result', 'other'),
  title: S.String.pipe(S.minLength(1)),
  description: S.optional(S.String),
  filePath: S.optional(S.String),
  url: S.optional(S.String),
  collectedAt: S.String,
  collectedBy: S.String.pipe(S.minLength(1)),
  validUntil: S.optional(S.String),
});
export type ComplianceEvidence = typeof ComplianceEvidenceSchema.Type;

export const ComplianceReportSchema = S.Struct({
  generatedAt: S.String,
  framework: ComplianceFrameworkSchema,
  overallScore: S.Number.pipe(S.nonNegative(), S.lessThanOrEqualTo(100)),
  controlsAssessed: S.Number.pipe(S.int(), S.nonNegative()),
  controlsPassing: S.Number.pipe(S.int(), S.nonNegative()),
  controlsFailing: S.Number.pipe(S.int(), S.nonNegative()),
  controlsPartial: S.Number.pipe(S.int(), S.nonNegative()),
  findings: S.Array(
    S.Struct({
      controlId: S.String,
      severity: S.Literal('low', 'medium', 'high', 'critical'),
      description: S.String,
      recommendation: S.String,
    }),
  ),
});
export type ComplianceReport = typeof ComplianceReportSchema.Type;
