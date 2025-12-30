/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Document OpenAPI Route Definitions
 * @module routes/documents/routes
 * @description OpenAPI route definitions for document management endpoints.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */

import { createRoute, z } from '@hono/zod-openapi';

import { HttpStatusCodes } from '@/lib/constants';
import { commonResponses, MessageResponseSchema, successResponseSchema } from '@/lib/responses';
import {
  AccessTokenResponseSchema,
  CreateCustomTemplateSchema,
  DocumentDetailSchema,
  DocumentSummarySchema,
  MfaVerifySchema,
  PasswordVerifySchema,
  RedactionTemplateSchema,
  TextRedactionResultSchema,
  TextRedactionSchema,
} from './schemas';

const tags = ['Documents'];

// ============================================
// Document CRUD Routes
// ============================================

/**
 * GET /documents - List user's documents
 */
export const listDocumentsRoute = createRoute({
  path: '/documents',
  method: 'get',
  tags,
  summary: "List user's documents",
  description: 'Returns a list of all documents uploaded by the authenticated user.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(z.array(DocumentSummarySchema)),
        },
      },
      description: 'List of documents',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.serverError,
  },
});

/**
 * GET /documents/:id - Get document details
 */
export const getDocumentRoute = createRoute({
  path: '/documents/{id}',
  method: 'get',
  tags,
  summary: 'Get document details',
  description: 'Returns detailed information about a specific document.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(DocumentDetailSchema),
        },
      },
      description: 'Document details',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.notFound,
    ...commonResponses.serverError,
  },
});

/**
 * DELETE /documents/:id - Delete a document
 */
export const deleteDocumentRoute = createRoute({
  path: '/documents/{id}',
  method: 'delete',
  tags,
  summary: 'Delete a document',
  description: 'Permanently deletes a document and its file from storage.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Document deleted successfully',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.notFound,
    ...commonResponses.serverError,
  },
});

/**
 * GET /documents/:id/download - Download a document
 */
export const downloadDocumentRoute = createRoute({
  path: '/documents/{id}/download',
  method: 'get',
  tags,
  summary: 'Download a document',
  description: 'Downloads the document file. Requires access token for protected documents.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    query: z.object({
      accessToken: z.string().optional().openapi({
        description: 'Access token for MFA/password protected documents',
      }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/pdf': {
          schema: z.any().openapi({ type: 'string', format: 'binary' }),
        },
      },
      description: 'Document file',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.notFound,
    ...commonResponses.serverError,
  },
});

// ============================================
// Document Access Verification Routes
// ============================================

/**
 * POST /documents/:id/verify-mfa - Verify MFA for document access
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
export const verifyMfaRoute = createRoute({
  path: '/documents/{id}/verify-mfa',
  method: 'post',
  tags,
  summary: 'Verify MFA for document access',
  description: 'Verifies MFA code and returns an access token for downloading protected documents.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: MfaVerifySchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(AccessTokenResponseSchema),
        },
      },
      description: 'MFA verified, access token issued',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.notFound,
    ...commonResponses.badRequest,
    ...commonResponses.serverError,
  },
});

/**
 * POST /documents/:id/verify-password - Verify password for document access
 */
export const verifyPasswordRoute = createRoute({
  path: '/documents/{id}/verify-password',
  method: 'post',
  tags,
  summary: 'Verify password for document access',
  description:
    'Verifies document password and returns an access token for downloading protected documents.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: { name: 'id', in: 'path' },
          example: '123e4567-e89b-12d3-a456-426614174000',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: PasswordVerifySchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(AccessTokenResponseSchema),
        },
      },
      description: 'Password verified, access token issued',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.notFound,
    ...commonResponses.badRequest,
    ...commonResponses.serverError,
  },
});

// ============================================
// Redaction Template Routes
// ============================================

/**
 * GET /documents/templates/redaction - List redaction templates
 */
export const listRedactionTemplatesRoute = createRoute({
  path: '/documents/templates/redaction',
  method: 'get',
  tags: ['Documents', 'Redaction'],
  summary: 'List redaction templates',
  description: 'Returns all available redaction templates (system and custom).',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(
            z.object({
              systemTemplates: z.array(RedactionTemplateSchema),
              customTemplates: z.array(RedactionTemplateSchema),
            }),
          ),
        },
      },
      description: 'List of redaction templates',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.serverError,
  },
});

/**
 * POST /documents/templates/redaction - Create custom redaction template
 */
export const createRedactionTemplateRoute = createRoute({
  path: '/documents/templates/redaction',
  method: 'post',
  tags: ['Documents', 'Redaction'],
  summary: 'Create custom redaction template',
  description: 'Creates a new custom redaction template for the user.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCustomTemplateSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      content: {
        'application/json': {
          schema: successResponseSchema(RedactionTemplateSchema),
        },
      },
      description: 'Template created successfully',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
    ...commonResponses.serverError,
  },
});

// ============================================
// Text Redaction Routes
// ============================================

/**
 * POST /documents/redact-text - Redact text using patterns
 */
export const redactTextRoute = createRoute({
  path: '/documents/redact-text',
  method: 'post',
  tags: ['Documents', 'Redaction'],
  summary: 'Redact text using patterns',
  description: 'Applies redaction patterns to text and returns the redacted result.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: TextRedactionSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(TextRedactionResultSchema),
        },
      },
      description: 'Text redacted successfully',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
    ...commonResponses.serverError,
  },
});

// ============================================
// Upload Routes
// ============================================

/**
 * Upload scan result schema
 */
const UploadScanResultSchema = z
  .object({
    success: z.boolean(),
    filename: z.string(),
    size: z.number(),
    hash: z.string(),
    scan: z.object({
      safe: z.boolean(),
      canProcess: z.boolean(),
      message: z.string(),
      validation: z.object({
        valid: z.boolean(),
        isEncrypted: z.boolean(),
        hasJavaScript: z.boolean(),
        hasEmbeddedFiles: z.boolean(),
        version: z.string().nullable(),
        warnings: z.array(z.string()),
        errors: z.array(z.string()),
      }),
      virusScan: z.object({
        scanned: z.boolean(),
        safe: z.boolean(),
        message: z.string(),
      }),
    }),
  })
  .openapi('UploadScanResult');

/**
 * Upload validation result schema
 */
const UploadValidationResultSchema = z
  .object({
    success: z.boolean(),
    filename: z.string(),
    hash: z.string(),
    validation: z.object({
      valid: z.boolean(),
      isEncrypted: z.boolean(),
      hasJavaScript: z.boolean(),
      hasEmbeddedFiles: z.boolean(),
      pageCount: z.number().optional(),
      version: z.string().nullable(),
      warnings: z.array(z.string()),
      errors: z.array(z.string()),
    }),
  })
  .openapi('UploadValidationResult');

/**
 * Upload status response schema
 */
const UploadStatusSchema = z
  .object({
    virusTotalConfigured: z.boolean(),
    maxFileSize: z.number(),
    maxFileSizeMB: z.number(),
    supportedTypes: z.array(z.string()),
  })
  .openapi('UploadStatus');

/**
 * POST /documents/upload/pdf - Upload and scan a PDF file
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */
export const uploadPdfRoute = createRoute({
  path: '/documents/upload/pdf',
  method: 'post',
  tags: ['Documents', 'Upload'],
  summary: 'Upload and scan a PDF file',
  description: 'Uploads a PDF, validates it, runs virus scanning, and stores the document.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z
              .instanceof(File)
              .openapi({ type: 'string', format: 'binary', description: 'PDF file to upload' }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponseSchema(DocumentSummarySchema),
        },
      },
      description: 'Uploaded document details',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
    ...commonResponses.serverError,
  },
});

/**
 * POST /documents/upload/validate - Validate a PDF without virus scanning
 */
export const validatePdfRoute = createRoute({
  path: '/documents/upload/validate',
  method: 'post',
  tags: ['Documents', 'Upload'],
  summary: 'Validate a PDF (fast)',
  description: 'Validates a PDF structure without virus scanning for faster results.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z
              .instanceof(File)
              .openapi({ type: 'string', format: 'binary', description: 'PDF file to validate' }),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: UploadValidationResultSchema,
        },
      },
      description: 'PDF validation result',
    },
    ...commonResponses.unauthorized,
    ...commonResponses.badRequest,
    ...commonResponses.serverError,
  },
});

/**
 * GET /documents/upload/status - Check upload configuration status
 */
export const uploadStatusRoute = createRoute({
  path: '/documents/upload/status',
  method: 'get',
  tags: ['Documents', 'Upload'],
  summary: 'Get upload configuration status',
  description: 'Returns current upload limits and virus scanning configuration.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: UploadStatusSchema,
        },
      },
      description: 'Upload configuration status',
    },
    ...commonResponses.unauthorized,
  },
});
