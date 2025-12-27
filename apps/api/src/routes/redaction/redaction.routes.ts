/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Redaction OpenAPI Route Definitions
 * @module routes/redaction/routes
 * @description OpenAPI route definitions for PDF redaction endpoints.
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import { createRoute, z } from '@hono/zod-openapi';

import { HttpStatusCodes } from '@/lib/constants';
import { commonResponses, successResponseSchema } from '@/lib/responses';
import { PdfInfoSchema } from './schemas';

const tags = ['Redaction'];

// ============================================
// PDF Redaction Routes
// ============================================

/**
 * POST /redaction/apply - Apply permanent redactions to PDF
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */
export const applyRedactionsRoute = createRoute({
  path: '/redaction/apply',
  method: 'post',
  tags,
  summary: 'Apply permanent redactions to PDF',
  description:
    'Applies permanent redactions to a PDF by flattening pages to images. Redacted content is irrecoverable.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({ description: 'PDF file to redact' }),
            data: z
              .string()
              .openapi({ description: 'JSON string with redaction areas and options' }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/pdf': {
          schema: z.instanceof(Blob),
        },
      },
      description: 'Redacted PDF file',
      headers: z.object({
        'X-Redaction-Count': z.string(),
        'X-Flattened': z.string(),
      }),
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
  },
});

/**
 * POST /redaction/preview - Generate redaction preview
 */
export const previewRedactionsRoute = createRoute({
  path: '/redaction/preview',
  method: 'post',
  tags,
  summary: 'Generate redaction preview',
  description:
    'Generates a preview PDF with semi-transparent redaction overlays. No permanent changes are made.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({ description: 'PDF file to preview' }),
            data: z.string().openapi({ description: 'JSON string with redaction areas' }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/pdf': {
          schema: z.instanceof(Blob),
        },
      },
      description: 'Preview PDF with redaction overlays',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
  },
});

/**
 * POST /redaction/info - Get PDF information
 */
export const getPdfInfoRoute = createRoute({
  path: '/redaction/info',
  method: 'post',
  tags,
  summary: 'Get PDF information',
  description: 'Returns metadata and page count for a PDF file.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({ description: 'PDF file to analyze' }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(PdfInfoSchema),
        },
      },
      description: 'PDF information',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
  },
});

/**
 * POST /redaction/text - Redact specific text in PDF
 */
export const redactTextInPdfRoute = createRoute({
  path: '/redaction/text',
  method: 'post',
  tags,
  summary: 'Redact specific text in PDF',
  description: 'Searches for and redacts all occurrences of specified text in a PDF.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.instanceof(File).openapi({ description: 'PDF file to redact' }),
            data: z.string().openapi({ description: 'JSON string with text search options' }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/pdf': {
          schema: z.instanceof(Blob),
        },
      },
      description: 'Redacted PDF file',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
  },
});
