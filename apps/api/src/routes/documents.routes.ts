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
 * @file Document Management Routes
 * @module routes/documents
 * @author FOIA Stream Team
 * @description API endpoints for secure document management including:
 *              - Document upload with virus scanning
 *              - MFA-protected document access
 *              - Auto-redaction with templates
 *              - Secure downloads
 *              - Access logging
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */

import { eq, desc, and } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { env } from '../config/env';
import { db } from '../db';
import {
  secureDocuments,
  documentAccessLog,
  redactionHistory,
  customRedactionTemplates,
} from '../db/schema';
import { logger } from '../lib/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { jsonValidator } from '../middleware/validator.middleware';
import { autoRedactionService } from '../services/auto-redaction.service';
import { mfaService } from '../services/mfa.service';
import {
  pdfRedactionService,
  type RedactionArea,
  type RedactionOptions,
} from '../services/pdf-redaction.service';
import { virusTotalService } from '../services/virustotal.service';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for document upload options
 */
const UploadOptionsSchema = S.Struct({
  requiresMfa: S.optional(S.Boolean),
  accessPassword: S.optional(S.String),
  expiresInDays: S.optional(S.Number.pipe(S.int(), S.positive())),
});
export type UploadOptionsInput = typeof UploadOptionsSchema.Type;

/**
 * Schema for MFA verification
 */
const MfaVerifySchema = S.Struct({
  code: S.String.pipe(S.minLength(6), S.maxLength(6)),
});
export type MfaVerifyInput = typeof MfaVerifySchema.Type;

/**
 * Schema for password verification
 */
const PasswordVerifySchema = S.Struct({
  password: S.String.pipe(S.minLength(1)),
});
export type PasswordVerifyInput = typeof PasswordVerifySchema.Type;

/**
 * Schema for text redaction request
 */
const TextRedactionSchema = S.Struct({
  text: S.String.pipe(S.minLength(1)),
  templateId: S.optional(S.String),
  patternIds: S.optional(S.Array(S.String)),
});
export type TextRedactionInput = typeof TextRedactionSchema.Type;

/**
 * Schema for auto-redaction request
 */
const AutoRedactionSchema = S.Struct({
  templateId: S.String.pipe(S.minLength(1)),
});
export type AutoRedactionInput = typeof AutoRedactionSchema.Type;

/**
 * Schema for custom template creation
 */
const CustomTemplateSchema = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(100)),
  description: S.optional(S.String.pipe(S.maxLength(500))),
  category: S.optional(S.String.pipe(S.maxLength(50))),
  patterns: S.Array(
    S.Struct({
      id: S.String.pipe(S.minLength(1)),
      name: S.String.pipe(S.minLength(1)),
      pattern: S.String.pipe(S.minLength(1)),
      flags: S.optional(S.String),
      sensitivity: S.Literal('low', 'medium', 'high', 'critical'),
      redactionLabel: S.String.pipe(S.minLength(1)),
    }),
  ).pipe(S.minItems(1)),
  isShared: S.optional(S.Boolean),
});
export type CustomTemplateInput = typeof CustomTemplateSchema.Type;

/**
 * Schema for redaction area
 */
const RedactionAreaSchema = S.Struct({
  page: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)),
  x: S.Number.pipe(S.greaterThanOrEqualTo(0)),
  y: S.Number.pipe(S.greaterThanOrEqualTo(0)),
  width: S.Number.pipe(S.positive()),
  height: S.Number.pipe(S.positive()),
  reason: S.optional(S.String),
});

/**
 * Schema for applying redactions
 */
const ApplyRedactionsSchema = S.Struct({
  areas: S.Array(RedactionAreaSchema).pipe(S.minItems(1)),
  options: S.optional(
    S.Struct({
      redactionColor: S.optional(S.String),
      addRedactionLabel: S.optional(S.Boolean),
      labelText: S.optional(S.String),
      saveResult: S.optional(S.Boolean),
    }),
  ),
});
export type ApplyRedactionsInput = typeof ApplyRedactionsSchema.Type;

// ============================================
// Helper Functions
// ============================================

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<string> {
  const uploadDir = join(process.cwd(), 'uploads', 'documents');
  await mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

/**
 * Log document access
 */
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
// Routes
// ============================================

const documents = new Hono();

// ============================================
// Document Upload & Management
// ============================================

/**
 * POST /documents/upload - Upload a document with virus scanning
 *
 * @route POST /documents/upload
 * @group Documents - Document management
 * @security JWT
 * @consumes multipart/form-data
 * @param {File} file - The file to upload
 * @param {string} options - JSON string with upload options
 * @returns {Object} 200 - Upload result with document ID
 * @returns {Object} 400 - Validation or virus scan failure
 *
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */
documents.post('/upload', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const formData = await c.req.formData();

    const file = formData.get('file');
    const optionsString = formData.get('options');

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'File is required' }, 400);
    }

    // Parse options if provided
    let options: UploadOptionsInput = {};
    if (optionsString && typeof optionsString === 'string') {
      try {
        const rawOptions = JSON.parse(optionsString);
        options = S.decodeUnknownSync(UploadOptionsSchema)(rawOptions);
      } catch {
        // Use defaults
      }
    }

    // Get file data
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);

    // Validate file with virus scanning
    logger.info({ fileName: file.name, fileSize: file.size }, 'Validating uploaded file');

    const validationResult = await virusTotalService.validateFile(
      fileData,
      file.name,
      file.type,
    );

    if (!validationResult.isValid) {
      logger.warn(
        { fileName: file.name, errors: validationResult.errors },
        'File validation failed',
      );
      return c.json(
        {
          success: false,
          error: 'File validation failed',
          details: validationResult.errors,
          virusScan: validationResult.virusScan,
        },
        400,
      );
    }

    // Save file to disk
    const uploadDir = await ensureUploadDir();
    const fileId = randomUUID();
    const fileExtension = file.name.split('.').pop() || 'bin';
    const storedFileName = `${fileId}.${fileExtension}`;
    const filePath = join(uploadDir, storedFileName);

    await writeFile(filePath, fileData);

    // Calculate expiration if specified
    let expiresAt: string | undefined;
    if (options.expiresInDays) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + options.expiresInDays);
      expiresAt = expDate.toISOString();
    }

    // Hash password if provided
    let accessPasswordHash: string | undefined;
    if (options.accessPassword) {
      const { hashPassword } = await import('../services/password.service');
      accessPasswordHash = await hashPassword(options.accessPassword);
    }

    // Create database record
    const documentRecord = {
      id: fileId,
      uploadedBy: userId,
      originalFileName: file.name,
      filePath: storedFileName,
      fileSize: file.size,
      mimeType: file.type,
      sha256Hash: validationResult.metadata.sha256,
      status: (validationResult.virusScan?.isSafe ? 'clean' : 'pending_scan') as any,
      virusScanResult: validationResult.virusScan || undefined,
      requiresMfa: options.requiresMfa || false,
      accessPasswordHash,
      isEncrypted: true,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(secureDocuments).values(documentRecord);

    // Log upload
    await logAccess(fileId, userId, 'view', false, c.req.header('x-forwarded-for'), c.req.header('user-agent'), {
      action: 'upload',
      fileName: file.name,
    });

    logger.info({ documentId: fileId, userId, fileName: file.name }, 'Document uploaded successfully');

    return c.json({
      success: true,
      data: {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: documentRecord.status,
        virusScan: validationResult.virusScan,
        requiresMfa: documentRecord.requiresMfa,
        hasPassword: !!accessPasswordHash,
        expiresAt,
        createdAt: documentRecord.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    logger.error({ error: message }, 'Document upload error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /documents - List user's documents
 *
 * @route GET /documents
 * @group Documents - Document management
 * @security JWT
 * @returns {Object} 200 - List of user's documents
 */
documents.get('/', authMiddleware, async (c) => {
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

    return c.json({
      success: true,
      data: userDocuments.map((doc) => ({
        ...doc,
        hasPassword: !!doc.hasPassword,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    logger.error({ error: message }, 'Document list error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /documents/:id - Get document details
 *
 * @route GET /documents/:id
 * @group Documents - Document management
 * @security JWT
 * @param {string} id - Document ID
 * @returns {Object} 200 - Document details
 */
documents.get('/:id', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: document.id,
        originalFileName: document.originalFileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        status: document.status,
        virusScan: document.virusScanResult,
        requiresMfa: document.requiresMfa,
        hasPassword: !!document.accessPasswordHash,
        expiresAt: document.expiresAt,
        accessCount: document.accessCount,
        lastAccessedAt: document.lastAccessedAt,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get document';
    logger.error({ error: message }, 'Document get error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /documents/:id/verify-mfa - Verify MFA for document access
 *
 * @route POST /documents/:id/verify-mfa
 * @group Documents - Document management
 * @security JWT
 * @param {string} id - Document ID
 * @param {Object} body - MFA verification code
 * @returns {Object} 200 - Access token for document
 *
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
documents.post('/:id/verify-mfa', authMiddleware, jsonValidator(MfaVerifySchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');
    const { code } = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    if (!document.requiresMfa) {
      return c.json({ success: false, error: 'MFA not required for this document' }, 400);
    }

    // Verify MFA code
    const mfaResult = await mfaService.verifyMFA(userId, code);
    if (!mfaResult.success) {
      return c.json({ success: false, error: 'Invalid MFA code' }, 401);
    }

    // Generate access token (valid for 1 hour)
    const { sign } = await import('hono/jwt');
    const accessToken = await sign(
      {
        documentId,
        userId,
        mfaVerified: true,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      },
      env.JWT_SECRET,
    );

    await logAccess(documentId, userId, 'view', true, c.req.header('x-forwarded-for'), c.req.header('user-agent'), {
      action: 'mfa_verified',
    });

    return c.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MFA verification failed';
    logger.error({ error: message }, 'MFA verification error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /documents/:id/verify-password - Verify password for document access
 *
 * @route POST /documents/:id/verify-password
 * @group Documents - Document management
 * @security JWT
 * @param {string} id - Document ID
 * @param {Object} body - Password
 * @returns {Object} 200 - Access granted
 */
documents.post('/:id/verify-password', authMiddleware, jsonValidator(PasswordVerifySchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');
    const { password } = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    if (!document.accessPasswordHash) {
      return c.json({ success: false, error: 'Password not required for this document' }, 400);
    }

    // Verify password
    const { verifyPassword } = await import('../services/password.service');
    const isValid = await verifyPassword(password, document.accessPasswordHash);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid password' }, 401);
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

    await logAccess(documentId, userId, 'view', false, c.req.header('x-forwarded-for'), c.req.header('user-agent'), {
      action: 'password_verified',
    });

    return c.json({
      success: true,
      data: {
        accessToken,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password verification failed';
    logger.error({ error: message }, 'Password verification error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /documents/:id/download - Download a document
 *
 * @route GET /documents/:id/download
 * @group Documents - Document management
 * @security JWT
 * @param {string} id - Document ID
 * @param {string} accessToken - Access token (query param)
 * @returns {Blob} 200 - Document file
 *
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
documents.get('/:id/download', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');
    const accessToken = c.req.query('accessToken');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    // Check MFA requirement
    if (document.requiresMfa) {
      if (!accessToken) {
        return c.json({ success: false, error: 'MFA verification required', requiresMfa: true }, 401);
      }

      // Verify access token
      try {
        const { verify } = await import('hono/jwt');
        const payload = await verify(accessToken, env.JWT_SECRET);
        if (payload.documentId !== documentId || !payload.mfaVerified) {
          return c.json({ success: false, error: 'Invalid access token' }, 401);
        }
      } catch {
        return c.json({ success: false, error: 'Invalid or expired access token' }, 401);
      }
    }

    // Check password requirement
    if (document.accessPasswordHash && !document.requiresMfa) {
      if (!accessToken) {
        return c.json({ success: false, error: 'Password verification required', requiresPassword: true }, 401);
      }

      try {
        const { verify } = await import('hono/jwt');
        const payload = await verify(accessToken, env.JWT_SECRET);
        if (payload.documentId !== documentId || !payload.passwordVerified) {
          return c.json({ success: false, error: 'Invalid access token' }, 401);
        }
      } catch {
        return c.json({ success: false, error: 'Invalid or expired access token' }, 401);
      }
    }

    // Read file
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    const fileData = await readFile(filePath);

    // Update access count
    await db
      .update(secureDocuments)
      .set({
        accessCount: document.accessCount + 1,
        lastAccessedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(secureDocuments.id, documentId));

    // Log download
    await logAccess(
      documentId,
      userId,
      'download',
      !!document.requiresMfa,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
    );

    logger.info({ documentId, userId }, 'Document downloaded');

    return new Response(fileData, {
      status: 200,
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.originalFileName}"`,
        'Content-Length': document.fileSize.toString(),
        'X-Document-Hash': document.sha256Hash,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed';
    logger.error({ error: message }, 'Document download error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * DELETE /documents/:id - Delete a document
 *
 * @route DELETE /documents/:id
 * @group Documents - Document management
 * @security JWT
 * @param {string} id - Document ID
 * @returns {Object} 200 - Deletion confirmation
 */
documents.delete('/:id', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    // Delete file
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted
    }

    // Delete database record (will cascade to access logs)
    await db.delete(secureDocuments).where(eq(secureDocuments.id, documentId));

    // Log deletion
    await logAccess(documentId, userId, 'delete', false, c.req.header('x-forwarded-for'), c.req.header('user-agent'));

    logger.info({ documentId, userId }, 'Document deleted');

    return c.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    logger.error({ error: message }, 'Document delete error');
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// Auto-Redaction Templates
// ============================================

/**
 * GET /documents/templates/redaction - Get all redaction templates
 *
 * @route GET /documents/templates/redaction
 * @group Documents - Redaction templates
 * @security JWT
 * @returns {Object} 200 - List of redaction templates
 */
documents.get('/templates/redaction', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');

    // Get system templates
    const systemTemplates = autoRedactionService.getTemplates();

    // Get user's custom templates
    const customTemplates = await db
      .select()
      .from(customRedactionTemplates)
      .where(eq(customRedactionTemplates.userId, userId))
      .orderBy(desc(customRedactionTemplates.createdAt));

    return c.json({
      success: true,
      data: {
        system: systemTemplates,
        custom: customTemplates,
        disclaimer: autoRedactionService.getDisclaimer(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get templates';
    logger.error({ error: message }, 'Templates get error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /documents/templates/redaction/patterns - Get all available patterns
 *
 * @route GET /documents/templates/redaction/patterns
 * @group Documents - Redaction templates
 * @security JWT
 * @returns {Object} 200 - List of available patterns
 */
documents.get('/templates/redaction/patterns', authMiddleware, async (c) => {
  try {
    const patterns = autoRedactionService.getPatterns();

    return c.json({
      success: true,
      data: patterns,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get patterns';
    logger.error({ error: message }, 'Patterns get error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /documents/templates/redaction - Create custom redaction template
 *
 * @route POST /documents/templates/redaction
 * @group Documents - Redaction templates
 * @security JWT
 * @param {Object} body - Template definition
 * @returns {Object} 201 - Created template
 */
documents.post('/templates/redaction', authMiddleware, jsonValidator(CustomTemplateSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const input = c.req.valid('json');

    // Validate all patterns
    for (const pattern of input.patterns) {
      const validation = autoRedactionService.validatePattern(pattern.pattern, pattern.flags);
      if (!validation.valid) {
        return c.json({
          success: false,
          error: `Invalid pattern "${pattern.name}": ${validation.error}`,
        }, 400);
      }
    }

    const templateId = randomUUID();
    const now = new Date().toISOString();

    await db.insert(customRedactionTemplates).values({
      id: templateId,
      userId,
      name: input.name,
      description: input.description,
      category: input.category || 'Custom',
      patterns: [...input.patterns] as { id: string; name: string; pattern: string; flags?: string; sensitivity: 'low' | 'medium' | 'high' | 'critical'; redactionLabel: string }[],
      isShared: input.isShared || false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    logger.info({ templateId, userId, name: input.name }, 'Custom redaction template created');

    return c.json({
      success: true,
      data: {
        id: templateId,
        name: input.name,
        description: input.description,
        category: input.category,
        patterns: input.patterns,
        isShared: input.isShared,
        createdAt: now,
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    logger.error({ error: message }, 'Template create error');
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// Text Redaction
// ============================================

/**
 * POST /documents/redact-text - Redact sensitive text
 *
 * @route POST /documents/redact-text
 * @group Documents - Redaction
 * @security JWT
 * @param {Object} body - Text to redact
 * @returns {Object} 200 - Redacted text and matches
 */
documents.post('/redact-text', authMiddleware, jsonValidator(TextRedactionSchema), async (c) => {
  try {
    const input = c.req.valid('json');

    let result;
    if (input.templateId) {
      result = autoRedactionService.scanWithTemplate(input.text, input.templateId);
      if (!result) {
        return c.json({ success: false, error: 'Template not found' }, 404);
      }
    } else if (input.patternIds && input.patternIds.length > 0) {
      result = autoRedactionService.scanText(input.text, [...input.patternIds]);
    } else {
      // Use default patterns
      result = autoRedactionService.scanText(input.text, ['ssn', 'email', 'phone']);
    }

    return c.json({
      success: true,
      data: {
        original: input.text,
        redacted: result.redactedText,
        hasChanges: input.text !== result.redactedText,
        matches: result.allMatches,
        matchesByPattern: result.matchesByPattern,
        matchesBySensitivity: result.matchesBySensitivity,
        disclaimer: autoRedactionService.getDisclaimer(input.templateId),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text redaction failed';
    logger.error({ error: message }, 'Text redaction error');
    return c.json({ success: false, error: message }, 500);
  }
});

// ============================================
// PDF Operations (Enhanced)
// ============================================

/**
 * POST /documents/:id/apply-redactions - Apply redactions to a document
 *
 * @route POST /documents/:id/apply-redactions
 * @group Documents - Redaction
 * @security JWT
 * @param {string} id - Document ID
 * @param {Object} body - Redaction areas and options
 * @returns {Blob} 200 - Redacted PDF
 *
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */
documents.post('/:id/apply-redactions', authMiddleware, jsonValidator(ApplyRedactionsSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');
    const input = c.req.valid('json');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    if (document.mimeType !== 'application/pdf') {
      return c.json({ success: false, error: 'Only PDF documents can be redacted' }, 400);
    }

    // Read the document
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    const fileData = await readFile(filePath);

    // Apply redactions
    const result = await pdfRedactionService.applyRedactions(
      fileData,
      input.areas as RedactionArea[],
      {
        ...input.options,
        userId,
        documentId,
      } as RedactionOptions,
    );

    if (!result.success || !result.pdfBytes) {
      return c.json({ success: false, error: result.error || 'Redaction failed' }, 400);
    }

    // Save redaction history
    await db.insert(redactionHistory).values({
      id: randomUUID(),
      sourceDocumentId: documentId,
      userId,
      redactionCount: result.redactionCount,
      redactionAreas: [...input.areas] as { page: number; x: number; y: number; width: number; height: number; reason?: string }[],
      isPermanent: true,
      createdAt: new Date().toISOString(),
    });

    // If saveResult is true, save as new document
    if (input.options?.saveResult) {
      const newDocId = randomUUID();
      const newFileName = `${newDocId}.pdf`;
      const newFilePath = join(uploadDir, newFileName);

      await writeFile(newFilePath, result.pdfBytes);

      await db.insert(secureDocuments).values({
        id: newDocId,
        uploadedBy: userId,
        originalFileName: `redacted_${document.originalFileName}`,
        filePath: newFileName,
        fileSize: result.pdfBytes.length,
        mimeType: 'application/pdf',
        sha256Hash: virusTotalService['calculateHash']
          ? require('node:crypto').createHash('sha256').update(result.pdfBytes).digest('hex')
          : '',
        status: 'redacted',
        requiresMfa: document.requiresMfa,
        isEncrypted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update redaction history with result
      await db
        .update(redactionHistory)
        .set({ resultDocumentId: newDocId })
        .where(eq(redactionHistory.sourceDocumentId, documentId));
    }

    // Log redaction
    await logAccess(
      documentId,
      userId,
      'apply_redaction',
      false,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
      { redactionCount: result.redactionCount },
    );

    logger.info({ documentId, userId, redactionCount: result.redactionCount }, 'PDF redactions applied');

    return new Response(result.pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="redacted_${document.originalFileName}"`,
        'X-Redaction-Count': result.redactionCount.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Redaction failed';
    logger.error({ error: message }, 'PDF redaction error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /documents/:id/preview-redactions - Preview redactions without applying
 *
 * @route POST /documents/:id/preview-redactions
 * @group Documents - Redaction
 * @security JWT
 * @param {string} id - Document ID
 * @param {Object} body - Redaction areas
 * @returns {Blob} 200 - PDF with preview redactions
 */
documents.post('/:id/preview-redactions', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');
    const formData = await c.req.formData();
    const dataString = formData.get('data');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    if (document.mimeType !== 'application/pdf') {
      return c.json({ success: false, error: 'Only PDF documents can be previewed' }, 400);
    }

    if (!dataString || typeof dataString !== 'string') {
      return c.json({ success: false, error: 'Redaction areas required' }, 400);
    }

    const data = JSON.parse(dataString);
    const areas = data.areas as RedactionArea[];

    // Read the document
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    const fileData = await readFile(filePath);

    // Generate preview
    const previewPdf = await pdfRedactionService.previewRedactions(fileData, areas);

    await logAccess(
      documentId,
      userId,
      'preview_redaction',
      false,
      c.req.header('x-forwarded-for'),
      c.req.header('user-agent'),
    );

    return new Response(previewPdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed';
    logger.error({ error: message }, 'PDF preview error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /documents/:id/info - Get PDF document info
 *
 * @route GET /documents/:id/info
 * @group Documents - Redaction
 * @security JWT
 * @param {string} id - Document ID
 * @returns {Object} 200 - PDF page info
 */
documents.get('/:id/info', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');

    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    if (document.mimeType !== 'application/pdf') {
      return c.json({ success: false, error: 'Only PDF documents have page info' }, 400);
    }

    // Read the document
    const uploadDir = await ensureUploadDir();
    const filePath = join(uploadDir, document.filePath);
    const fileData = await readFile(filePath);

    // Get PDF info
    const info = await pdfRedactionService.getPDFInfo(fileData);

    return c.json({
      success: true,
      data: info,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get PDF info';
    logger.error({ error: message }, 'PDF info error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * GET /documents/:id/access-log - Get document access history
 *
 * @route GET /documents/:id/access-log
 * @group Documents - Document management
 * @security JWT
 * @param {string} id - Document ID
 * @returns {Object} 200 - Access log entries
 *
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
documents.get('/:id/access-log', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const documentId = c.req.param('id');

    // Verify ownership
    const [document] = await db
      .select()
      .from(secureDocuments)
      .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.uploadedBy, userId)));

    if (!document) {
      return c.json({ success: false, error: 'Document not found' }, 404);
    }

    const accessLogs = await db
      .select()
      .from(documentAccessLog)
      .where(eq(documentAccessLog.documentId, documentId))
      .orderBy(desc(documentAccessLog.createdAt));

    return c.json({
      success: true,
      data: accessLogs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get access log';
    logger.error({ error: message }, 'Access log error');
    return c.json({ success: false, error: message }, 500);
  }
});

export const documentRoutes = documents;
