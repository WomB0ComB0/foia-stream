/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Redaction Route Schemas
 * @module routes/redaction/schemas
 * @description Zod schemas for PDF redaction OpenAPI routes.
 */

import { RedactionAreaSchema, RedactionOptionsSchema } from '@/lib/schemas';
import { z } from '@hono/zod-openapi';

// ============================================
// Request Schemas
// ============================================

/**
 * Apply redactions request
 */
export const ApplyRedactionsRequestSchema = z
  .object({
    areas: z.array(RedactionAreaSchema).min(1, 'At least one redaction area is required'),
    options: RedactionOptionsSchema.optional(),
  })
  .openapi('ApplyRedactionsRequest');

/**
 * Preview redactions request
 */
export const PreviewRedactionsRequestSchema = z
  .object({
    areas: z.array(RedactionAreaSchema).min(1, 'At least one redaction area is required'),
  })
  .openapi('PreviewRedactionsRequest');

/**
 * Redact text in PDF request
 */
export const RedactTextInPdfRequestSchema = z
  .object({
    searchText: z.string().min(1, 'Search text is required'),
    caseSensitive: z.boolean().optional().default(false).openapi({ type: 'boolean' }),
    wholeWords: z.boolean().optional().default(false).openapi({ type: 'boolean' }),
  })
  .openapi('RedactTextInPdfRequest');

// ============================================
// Response Schemas
// ============================================

/**
 * PDF info response
 */
export const PdfInfoSchema = z
  .object({
    pageCount: z.number(),
    version: z.string().nullable(),
    title: z.string().nullable(),
    author: z.string().nullable(),
    isEncrypted: z.boolean(),
    hasJavaScript: z.boolean(),
  })
  .openapi('PdfInfo');

/**
 * Redaction result metadata
 */
export const RedactionResultSchema = z
  .object({
    redactionCount: z.number(),
    flattened: z.boolean(),
    pagesProcessed: z.number(),
  })
  .openapi('RedactionResult');
