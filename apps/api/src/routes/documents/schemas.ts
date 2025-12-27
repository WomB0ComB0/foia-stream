/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Document Route Schemas
 * @module routes/documents/schemas
 * @description Zod schemas for document management OpenAPI routes.
 */

import { RedactionAreaSchema, RedactionOptionsSchema } from '@/lib/schemas';
import { z } from '@hono/zod-openapi';

// ============================================
// Request Schemas
// ============================================

/**
 * Upload options schema
 */
export const UploadOptionsSchema = z
  .object({
    requiresMfa: z.boolean().optional().openapi({ example: false }),
    accessPassword: z.string().optional().openapi({ example: 'securepassword' }),
    expiresInDays: z.number().int().positive().optional().openapi({ example: 30 }),
  })
  .openapi('UploadOptions');

/**
 * MFA verification schema
 */
export const MfaVerifySchema = z
  .object({
    code: z
      .string()
      .length(6, 'Code must be 6 digits')
      .regex(/^\d{6}$/, 'Code must be numeric')
      .openapi({ example: '123456' }),
  })
  .openapi('MfaVerify');

/**
 * Password verification schema
 */
export const PasswordVerifySchema = z
  .object({
    password: z.string().min(1, 'Password is required').openapi({ example: 'documentpassword' }),
  })
  .openapi('PasswordVerify');

/**
 * Apply redactions request schema
 */
export const ApplyRedactionsSchema = z
  .object({
    areas: z.array(RedactionAreaSchema).min(1, 'At least one redaction area is required'),
    options: RedactionOptionsSchema.optional(),
  })
  .openapi('ApplyRedactionsRequest');

/**
 * Text redaction request schema
 */
export const TextRedactionSchema = z
  .object({
    text: z.string().min(1, 'Text is required').openapi({ example: 'Sensitive document content' }),
    templateId: z.string().optional().openapi({ example: 'pii-standard' }),
    patternIds: z
      .array(z.string())
      .optional()
      .openapi({ example: ['ssn', 'email'] }),
  })
  .openapi('TextRedactionRequest');

/**
 * Auto-redaction request schema
 */
export const AutoRedactionSchema = z
  .object({
    templateId: z.string().min(1, 'Template ID is required').openapi({ example: 'hipaa' }),
  })
  .openapi('AutoRedactionRequest');

/**
 * Custom template pattern schema
 */
export const TemplatePatternSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    pattern: z.string().min(1),
    flags: z.string().optional(),
    sensitivity: z.enum(['low', 'medium', 'high', 'critical']),
    redactionLabel: z.string().min(1),
  })
  .openapi('TemplatePattern');

/**
 * Custom template creation schema
 */
export const CreateCustomTemplateSchema = z
  .object({
    name: z.string().min(1).max(100).openapi({ example: 'My Custom Template' }),
    description: z
      .string()
      .max(500)
      .optional()
      .openapi({ example: 'Template for medical records' }),
    category: z.string().max(50).optional().openapi({ example: 'healthcare' }),
    patterns: z.array(TemplatePatternSchema).min(1),
    isShared: z.boolean().optional().openapi({ example: false }),
  })
  .openapi('CreateCustomTemplate');

// ============================================
// Response Schemas
// ============================================

/**
 * Virus scan result in response
 */
export const VirusScanResponseSchema = z
  .object({
    isSafe: z.boolean(),
    scanned: z.boolean(),
    message: z.string().optional(),
  })
  .openapi('VirusScanResult');

/**
 * Document summary (for list view)
 */
export const DocumentSummarySchema = z
  .object({
    id: z.string().uuid(),
    originalFileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
    status: z.enum([
      'pending_scan',
      'scanning',
      'clean',
      'infected',
      'scan_failed',
      'redacted',
      'archived',
    ]),
    requiresMfa: z.boolean(),
    hasPassword: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
    accessCount: z.number(),
    lastAccessedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('DocumentSummary');

/**
 * Full document details
 */
export const DocumentDetailSchema = DocumentSummarySchema.extend({
  virusScan: VirusScanResponseSchema.nullable(),
  updatedAt: z.string().datetime(),
}).openapi('DocumentDetail');

/**
 * Upload response data
 */
export const UploadResponseSchema = z
  .object({
    id: z.string().uuid(),
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
    status: z.enum([
      'pending_scan',
      'scanning',
      'clean',
      'infected',
      'scan_failed',
      'redacted',
      'archived',
    ]),
    virusScan: VirusScanResponseSchema.nullable(),
    requiresMfa: z.boolean(),
    hasPassword: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('UploadResponse');

/**
 * Access token response
 */
export const AccessTokenResponseSchema = z
  .object({
    accessToken: z.string(),
    expiresIn: z.number().openapi({ example: 3600 }),
  })
  .openapi('AccessTokenResponse');

/**
 * Redaction template schema
 */
export const RedactionTemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    patterns: z.array(TemplatePatternSchema),
    isShared: z.boolean(),
    createdAt: z.string().datetime().optional(),
  })
  .openapi('RedactionTemplate');

/**
 * Text redaction result
 */
export const TextRedactionResultSchema = z
  .object({
    originalText: z.string(),
    redactedText: z.string(),
    redactionsApplied: z.number(),
    patternsMatched: z.array(z.string()),
  })
  .openapi('TextRedactionResult');

// ============================================
// Export grouped schemas
// ============================================

export const DocumentSchemas = {
  request: {
    uploadOptions: UploadOptionsSchema,
    mfaVerify: MfaVerifySchema,
    passwordVerify: PasswordVerifySchema,
    applyRedactions: ApplyRedactionsSchema,
    textRedaction: TextRedactionSchema,
    autoRedaction: AutoRedactionSchema,
    createTemplate: CreateCustomTemplateSchema,
  },
  response: {
    documentSummary: DocumentSummarySchema,
    documentDetail: DocumentDetailSchema,
    upload: UploadResponseSchema,
    accessToken: AccessTokenResponseSchema,
    template: RedactionTemplateSchema,
    textRedaction: TextRedactionResultSchema,
  },
} as const;
