/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Document Route Handlers
 * @module routes/documents/handlers
 * @description Handler implementations for document management endpoints.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */

import { env } from '@/config/env';
import { db } from '@/db';
import { customRedactionTemplates, documentAccessLog, secureDocuments } from '@/db/schema';
import { logger } from '@/lib/logger';
import { errorResponse, messageResponse, successResponse } from '@/lib/responses';
import type { AppRouteHandler } from '@/lib/types';
import { mfaService } from '@/services/auth/mfa.service';
import {
  autoRedactionService,
  type RedactionPattern,
  type ScanResult,
} from '@/services/documents/auto-redaction.service';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  createRedactionTemplateRoute,
  deleteDocumentRoute,
  getDocumentRoute,
  listDocumentsRoute,
  listRedactionTemplatesRoute,
  redactTextRoute,
  verifyMfaRoute,
  verifyPasswordRoute,
} from './documents.routes';

// ============================================
// Helpers
// ============================================

async function ensureUploadDir(): Promise<string> {
  const uploadDir = join(process.cwd(), 'uploads', 'documents');
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

async function logAccess(
  documentId: string,
  userId: string,
  accessType: 'view' | 'download' | 'preview_redaction' | 'apply_redaction' | 'share' | 'delete',
  mfaVerified: boolean,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(documentAccessLog).values({
      id: randomUUID(),
      documentId,
      userId,
      accessType,
      mfaVerified,
      ipAddress,
      userAgent,
      metadata,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error, documentId, userId, accessType }, 'Failed to log document access');
  }
}

// ============================================
// Document CRUD Handlers
// ============================================

/**
 * List user's documents
 */
export const listDocuments: AppRouteHandler<typeof listDocumentsRoute> = async (c) => {
  try {
    const { userId } = c.get('user');

    const userDocuments = await db
      .select({
        id: secureDocuments.id,
        originalFileName: secureDocuments.originalFileName,
        fileSize: secureDocuments.fileSize,
        mimeType: secureDocuments.mimeType,
        status: secureDocuments.status,
        requiresMfa: secureDocuments.requiresMfa,
        hasPassword: secureDocuments.accessPasswordHash,
        expiresAt: secureDocuments.expiresAt,
        accessCount: secureDocuments.accessCount,
        lastAccessedAt: secureDocuments.lastAccessedAt,
        createdAt: secureDocuments.createdAt,
      })
      .from(secureDocuments)
      .where(eq(secureDocuments.uploadedBy, userId))
      .orderBy(desc(secureDocuments.createdAt));

    return successResponse(
      c,
      userDocuments.map((doc) => ({
        ...doc,
        hasPassword: !!doc.hasPassword,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    logger.error({ error: message }, 'Document list error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Get document details
 */
export const getDocument: AppRouteHandler<typeof getDocumentRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return errorResponse(c, 'Document not found', 404);
    }

    return successResponse(c, {
      id: document.id,
      originalFileName: document.originalFileName,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      status: document.status,
      virusScan: document.virusScanResult
        ? {
            isSafe: document.virusScanResult.isSafe ?? false,
            scanned: !!document.virusScanResult.scannedAt,
            message: document.virusScanResult.status,
          }
        : null,
      requiresMfa: document.requiresMfa,
      hasPassword: !!document.accessPasswordHash,
      expiresAt: document.expiresAt,
      accessCount: document.accessCount,
      lastAccessedAt: document.lastAccessedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get document';
    logger.error({ error: message }, 'Document get error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Delete document
 */
export const deleteDocument: AppRouteHandler<typeof deleteDocumentRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return errorResponse(c, 'Document not found', 404);
    }

    // Delete file
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted
    }

    // Delete database record
    await db.delete(secureDocuments).where(eq(secureDocuments.id, documentId));

    // Log deletion
    await logAccess(
      documentId,
      userId,
      'delete',
      false,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
    );

    logger.info({ documentId, userId }, 'Document deleted');
    return messageResponse(c, 'Document deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    logger.error({ error: message }, 'Document delete error');
    return errorResponse(c, message, 500);
  }
};

// ============================================
// Access Verification Handlers
// ============================================

/**
 * Verify MFA for document access
 */
export const verifyMfa: AppRouteHandler<typeof verifyMfaRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');
    const { code } = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return errorResponse(c, 'Document not found', 404);
    }

    if (!document.requiresMfa) {
      return errorResponse(c, 'MFA not required for this document', 400);
    }

    // Verify MFA code
    const mfaResult = await mfaService.verifyMFA(userId, code);
    if (!mfaResult.success) {
      return errorResponse(c, 'Invalid MFA code', 401);
    }

    // Generate access token
    const { sign } = await import('hono/jwt');
    const accessToken = await sign(
      {
        documentId,
        userId,
        mfaVerified: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      env.JWT_SECRET,
    );

    await logAccess(
      documentId,
      userId,
      'view',
      true,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
      { action: 'mfa_verified' },
    );

    return successResponse(c, { accessToken, expiresIn: 3600 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MFA verification failed';
    logger.error({ error: message }, 'MFA verification error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Verify password for document access
 */
export const verifyPassword: AppRouteHandler<typeof verifyPasswordRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id: documentId } = c.req.valid('param');
    const { password } = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return errorResponse(c, 'Document not found', 404);
    }

    if (!document.accessPasswordHash) {
      return errorResponse(c, 'Password not required for this document', 400);
    }

    // Verify password
    const { verifyPassword: verifyPwd } = await import('@/services/auth/password.service');
    const isValid = await verifyPwd(password, document.accessPasswordHash);
    if (!isValid) {
      return errorResponse(c, 'Invalid password', 401);
    }

    // Generate access token
    const { sign } = await import('hono/jwt');
    const accessToken = await sign(
      {
        documentId,
        userId,
        passwordVerified: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      env.JWT_SECRET,
    );

    await logAccess(
      documentId,
      userId,
      'view',
      false,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
      { action: 'password_verified' },
    );

    return successResponse(c, { accessToken, expiresIn: 3600 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password verification failed';
    logger.error({ error: message }, 'Password verification error');
    return errorResponse(c, message, 500);
  }
};

// ============================================
// Redaction Template Handlers
// ============================================

/**
 * List redaction templates
 */
export const listRedactionTemplates: AppRouteHandler<typeof listRedactionTemplatesRoute> = async (
  c,
) => {
  try {
    const { userId } = c.get('user');

    // Get system templates
    const systemTemplates = autoRedactionService.getTemplates();

    // Get user's custom templates
    const userTemplates = await db
      .select()
      .from(customRedactionTemplates)
      .where(eq(customRedactionTemplates.userId, userId));

    return successResponse(c, {
      systemTemplates: systemTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        patterns: t.patterns,
        isShared: false,
      })),
      customTemplates: userTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        patterns: t.patterns as RedactionPattern[],
        isShared: t.isShared,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list templates';
    logger.error({ error: message }, 'Template list error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Create custom redaction template
 */
export const createRedactionTemplate: AppRouteHandler<typeof createRedactionTemplateRoute> = async (
  c,
) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');

    const templateId = randomUUID();
    const now = new Date().toISOString();

    await db.insert(customRedactionTemplates).values({
      id: templateId,
      userId: userId,
      name: data.name,
      description: data.description || undefined,
      category: data.category || undefined,
      patterns: data.patterns,
      isShared: data.isShared || false,
      createdAt: now,
      updatedAt: now,
    });

    logger.info({ templateId, userId }, 'Custom redaction template created');

    return successResponse(
      c,
      {
        id: templateId,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        patterns: data.patterns,
        isShared: data.isShared || false,
        createdAt: now,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    logger.error({ error: message }, 'Template creation error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Redact text using patterns
 */
export const redactText: AppRouteHandler<typeof redactTextRoute> = async (c) => {
  try {
    const data = c.req.valid('json');

    // Use scanText with either template or specific patterns
    let result: ScanResult | null;
    if (data.templateId) {
      result = autoRedactionService.scanWithTemplate(data.text, data.templateId);
      if (!result) {
        return errorResponse(c, `Template '${data.templateId}' not found`, 400);
      }
    } else if (data.patternIds && data.patternIds.length > 0) {
      result = autoRedactionService.scanText(data.text, data.patternIds);
    } else {
      result = autoRedactionService.scanText(data.text, 'all');
    }

    return successResponse(c, {
      originalText: data.text,
      redactedText: result.redactedText,
      redactionsApplied: result.totalMatches,
      patternsMatched: result.patternsUsed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text redaction failed';
    logger.error({ error: message }, 'Text redaction error');
    return errorResponse(c, message, 500);
  }
};

// ============================================
// Upload Handlers
// ============================================

import { pdfService } from '@/services/documents/pdf.service';
import { virusTotalService } from '@/services/documents/virustotal.service';

import type { uploadPdfRoute, uploadStatusRoute, validatePdfRoute } from './documents.routes';

const MAX_FILE_SIZE = Math.min(env.MAX_FILE_SIZE, 50 * 1024 * 1024);

/**
 * Upload and scan a PDF file
 */
export const uploadPdf: AppRouteHandler<typeof uploadPdfRoute> = async (c) => {
  try {
    const contentType = c.req.header('Content-Type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(c, 'Request must be multipart/form-data', 400);
    }

    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse(c, 'Please provide a file in the "file" field', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(c, `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400);
    }

    if (file.type !== 'application/pdf') {
      return errorResponse(c, 'Only PDF files are allowed', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const scanResult = await pdfService.scanPDFAsync(buffer, file.name);

    return c.json(
      {
        success: scanResult.safe,
        filename: file.name,
        size: file.size,
        hash: scanResult.virusScan.hash,
        scan: {
          safe: scanResult.safe,
          canProcess: scanResult.canProcess,
          message: scanResult.message,
          validation: {
            valid: scanResult.validation.valid,
            isEncrypted: scanResult.validation.isEncrypted,
            hasJavaScript: scanResult.validation.hasJavaScript,
            hasEmbeddedFiles: scanResult.validation.hasEmbeddedFiles,
            version: scanResult.validation.version ?? null,
            warnings: [...scanResult.validation.warnings],
            errors: [...scanResult.validation.errors],
          },
          virusScan: {
            scanned: scanResult.virusScan.scanned,
            safe: scanResult.virusScan.safe,
            message: scanResult.virusScan.message,
          },
        },
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    logger.error({ error: message }, 'PDF upload error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Validate a PDF without virus scanning
 */
export const validatePdf: AppRouteHandler<typeof validatePdfRoute> = async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return errorResponse(c, 'Please provide a file in the "file" field', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await pdfService.validatePDFAsync(buffer);
    const hash = virusTotalService.calculateSHA256(buffer);

    return c.json(
      {
        success: validation.valid,
        filename: file.name,
        hash,
        validation: {
          ...validation,
          version: validation.version ?? null,
          warnings: [...validation.warnings],
          errors: [...validation.errors],
        },
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Validation failed';
    logger.error({ error: message }, 'PDF validation error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Get upload configuration status
 */
export const uploadStatus: AppRouteHandler<typeof uploadStatusRoute> = async (c) => {
  return c.json(
    {
      virusTotalConfigured: virusTotalService.isConfigured(),
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
      supportedTypes: ['application/pdf'],
    },
    200,
  );
};
