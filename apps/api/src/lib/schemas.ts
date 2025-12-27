/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Shared Zod Schemas
 * @module lib/schemas
 * @description Shared Zod schemas for OpenAPI route definitions.
 *              Provides reusable schemas to reduce duplication across routes.
 */

import { z } from '@hono/zod-openapi';

// ============================================
// Common Parameter Schemas
// ============================================

/**
 * Standard ID parameter schema (UUID format)
 */
export const IdParamSchema = z.object({
  id: z
    .string()
    .uuid()
    .openapi({
      param: { name: 'id', in: 'path' },
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
});

/**
 * Pagination query parameter schema
 */
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => parseInt(v, 10))
    .openapi({
      param: { name: 'page', in: 'query' },
      example: '1',
    }),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((v) => Math.min(parseInt(v, 10), 100))
    .openapi({
      param: { name: 'limit', in: 'query' },
      example: '20',
    }),
});

/**
 * Search query parameter schema
 */
export const SearchQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .openapi({
      param: { name: 'q', in: 'query' },
      example: 'search term',
    }),
});

// ============================================
// Common Entity Schemas
// ============================================

/**
 * Timestamp fields schema (for created/updated)
 */
export const TimestampsSchema = z.object({
  createdAt: z.string().datetime().openapi({ example: '2025-01-01T00:00:00Z' }),
  updatedAt: z.string().datetime().openapi({ example: '2025-01-01T00:00:00Z' }),
});

/**
 * User reference schema (for embedding in other entities)
 */
export const UserRefSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

// ============================================
// File Upload Schemas
// ============================================

/**
 * PDF file validation schema
 */
export const PdfFileSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.literal('application/pdf'),
  size: z
    .number()
    .positive()
    .max(50 * 1024 * 1024), // Max 50MB
});

/**
 * Virus scan result schema
 */
export const VirusScanResultSchema = z.object({
  safe: z.boolean(),
  scanned: z.boolean(),
  message: z.string(),
  hash: z.string(),
});

/**
 * PDF validation result schema
 */
export const PdfValidationSchema = z.object({
  valid: z.boolean(),
  isEncrypted: z.boolean(),
  hasJavaScript: z.boolean(),
  hasEmbeddedFiles: z.boolean(),
  version: z.string().optional(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
});

// ============================================
// Redaction Schemas
// ============================================

/**
 * Redaction area schema
 */
export const RedactionAreaSchema = z
  .object({
    page: z.number().int().nonnegative().openapi({ example: 0 }),
    x: z.number().nonnegative().openapi({ example: 100 }),
    y: z.number().nonnegative().openapi({ example: 200 }),
    width: z.number().positive().openapi({ example: 150 }),
    height: z.number().positive().openapi({ example: 20 }),
    reason: z.string().optional().openapi({ example: 'SSN' }),
  })
  .openapi('RedactionArea');

/**
 * Redaction options schema
 */
export const RedactionOptionsSchema = z
  .object({
    redactionColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .openapi({ example: '#000000' }),
    addRedactionLabel: z.boolean().optional(),
    labelText: z.string().optional(),
    preserveMetadata: z.boolean().optional(),
  })
  .openapi('RedactionOptions');

// ============================================
// MFA Schemas
// ============================================

/**
 * MFA code schema (6 digits)
 */
export const MfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be numeric')
    .openapi({ example: '123456' }),
});

/**
 * Password confirmation schema
 */
export const PasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// ============================================
// Audit Schemas
// ============================================

/**
 * Audit entry schema
 */
export const AuditEntrySchema = z.object({
  timestamp: z.string().datetime(),
  action: z.string(),
  userId: z.string().uuid().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// Export grouped schemas
// ============================================

export const Schemas = {
  params: {
    id: IdParamSchema,
  },
  query: {
    pagination: PaginationQuerySchema,
    search: SearchQuerySchema,
  },
  common: {
    timestamps: TimestampsSchema,
    userRef: UserRefSchema,
  },
  file: {
    pdf: PdfFileSchema,
    virusScan: VirusScanResultSchema,
    pdfValidation: PdfValidationSchema,
  },
  redaction: {
    area: RedactionAreaSchema,
    options: RedactionOptionsSchema,
  },
  auth: {
    mfaCode: MfaCodeSchema,
    password: PasswordSchema,
  },
  audit: {
    entry: AuditEntrySchema,
  },
} as const;
