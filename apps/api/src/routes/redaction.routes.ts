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
 * @file PDF Redaction Routes
 * @module routes/redaction
 * @author FOIA Stream Team
 * @description API endpoints for applying secure redactions to PDF documents.
 *              Supports preview, apply, and document info operations.
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 * @compliance NIST 800-53 AU-2 (Audit Events) - All redactions are logged
 */

import { Schema as S } from 'effect';
import { Hono } from 'hono';
import { logger } from '../lib/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { jsonValidator } from '../middleware/validator.middleware';
import {
  pdfRedactionService,
  type RedactionArea,
  type RedactionOptions,
} from '../services/pdf-redaction.service';
import {
  applyTrueRedactions,
  type RedactionArea as TrueRedactionArea,
  type TrueRedactionOptions,
} from '../services/pdf-true-redaction.service';

// ============================================
// Validation Schemas
// ============================================

/**
 * Schema for a single redaction area
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
 * Schema for redaction options
 */
const RedactionOptionsSchema = S.Struct({
  redactionColor: S.optional(
    S.String.pipe(S.pattern(/^#?[0-9A-Fa-f]{6}$/, { message: () => 'Invalid hex color' })),
  ),
  addRedactionLabel: S.optional(S.Boolean),
  labelText: S.optional(S.String),
  preserveMetadata: S.optional(S.Boolean),
  documentId: S.optional(S.String),
});

/**
 * Schema for apply redactions request
 */
const ApplyRedactionsSchema = S.Struct({
  areas: S.Array(RedactionAreaSchema).pipe(
    S.minItems(1, { message: () => 'At least one redaction area is required' }),
  ),
  options: S.optional(RedactionOptionsSchema),
});
export type ApplyRedactionsInput = typeof ApplyRedactionsSchema.Type;

/**
 * Schema for preview redactions request
 */
const PreviewRedactionsSchema = S.Struct({
  areas: S.Array(RedactionAreaSchema).pipe(
    S.minItems(1, { message: () => 'At least one redaction area is required' }),
  ),
});
export type PreviewRedactionsInput = typeof PreviewRedactionsSchema.Type;

/**
 * Schema for redact text request
 */
const RedactTextSchema = S.Struct({
  text: S.String.pipe(S.minLength(1, { message: () => 'Text is required' })),
});
export type RedactTextInput = typeof RedactTextSchema.Type;

// ============================================
// Routes
// ============================================

const redaction = new Hono();

/**
 * POST /redaction/apply - Apply permanent redactions to a PDF
 *
 * @route POST /redaction/apply
 * @group Redaction - PDF redaction operations
 * @security JWT
 * @consumes multipart/form-data
 * @param {File} file - The PDF file to redact
 * @param {string} data - JSON string containing areas and options
 * @returns {Blob} 200 - Redacted PDF file
 * @returns {Object} 400 - Validation or processing error
 *
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */
redaction.post('/apply', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const formData = await c.req.formData();

    const file = formData.get('file');
    const dataString = formData.get('data');

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'PDF file is required' }, 400);
    }

    if (!dataString || typeof dataString !== 'string') {
      return c.json({ success: false, error: 'Redaction data is required' }, 400);
    }

    // Parse and validate the redaction data
    let parsedData: ApplyRedactionsInput;
    try {
      const rawData = JSON.parse(dataString);
      parsedData = S.decodeUnknownSync(ApplyRedactionsSchema)(rawData);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Invalid redaction data';
      return c.json({ success: false, error: message }, 400);
    }

    // Get PDF buffer
    const pdfBuffer = await file.arrayBuffer();

    // Apply TRUE redactions (flattens pages to images, removing text completely)
    const result = await applyTrueRedactions(
      pdfBuffer,
      parsedData.areas as TrueRedactionArea[],
      {
        redactionColor: parsedData.options?.redactionColor,
        addRedactionLabel: parsedData.options?.addRedactionLabel,
        labelText: parsedData.options?.labelText,
        documentId: parsedData.options?.documentId,
        userId,
        dpi: 150, // Good balance of quality vs file size
      } as TrueRedactionOptions,
    );

    if (!result.success || !result.pdfBytes) {
      return c.json({ success: false, error: result.error || 'Redaction failed' }, 400);
    }

    logger.info(
      {
        userId,
        redactionCount: result.redactionCount,
        documentId: parsedData.options?.documentId,
        flattened: result.flattened,
      },
      'TRUE PDF redactions applied - text permanently removed',
    );

    // Return the redacted PDF
    return new Response(result.pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="redacted.pdf"',
        'X-Redaction-Count': result.redactionCount.toString(),
        'X-Flattened': result.flattened ? 'true' : 'false',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Redaction failed';
    logger.error({ error: message }, 'PDF redaction error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /redaction/preview - Generate a preview of redactions
 *
 * @route POST /redaction/preview
 * @group Redaction - PDF redaction operations
 * @security JWT
 * @consumes multipart/form-data
 * @param {File} file - The PDF file to preview
 * @param {string} data - JSON string containing areas to preview
 * @returns {Blob} 200 - PDF with semi-transparent redaction previews
 * @returns {Object} 400 - Validation or processing error
 */
redaction.post('/preview', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();

    const file = formData.get('file');
    const dataString = formData.get('data');

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'PDF file is required' }, 400);
    }

    if (!dataString || typeof dataString !== 'string') {
      return c.json({ success: false, error: 'Redaction areas are required' }, 400);
    }

    // Parse and validate the preview data
    let parsedData: PreviewRedactionsInput;
    try {
      const rawData = JSON.parse(dataString);
      parsedData = S.decodeUnknownSync(PreviewRedactionsSchema)(rawData);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Invalid preview data';
      return c.json({ success: false, error: message }, 400);
    }

    // Get PDF buffer
    const pdfBuffer = await file.arrayBuffer();

    // Generate preview
    const previewPdf = await pdfRedactionService.previewRedactions(
      pdfBuffer,
      parsedData.areas as RedactionArea[],
    );

    return new Response(previewPdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="preview.pdf"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview generation failed';
    logger.error({ error: message }, 'PDF preview error');
    return c.json({ success: false, error: message }, 500);
  }
});

/**
 * POST /redaction/info - Get information about a PDF document
 *
 * @route POST /redaction/info
 * @group Redaction - PDF redaction operations
 * @security JWT
 * @consumes multipart/form-data
 * @param {File} file - The PDF file to analyze
 * @returns {Object} 200 - PDF information (page count, dimensions)
 * @returns {Object} 400 - Processing error
 */
redaction.post('/info', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();

    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'PDF file is required' }, 400);
    }

    // Get PDF buffer
    const pdfBuffer = await file.arrayBuffer();

    // Get PDF info
    const info = await pdfRedactionService.getPDFInfo(pdfBuffer);

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
 * POST /redaction/text - Redact sensitive patterns from text
 *
 * @route POST /redaction/text
 * @group Redaction - Text redaction operations
 * @security JWT
 * @param {Object} body - Text to redact
 * @param {string} body.text - The text containing sensitive information
 * @returns {Object} 200 - Redacted text
 * @returns {Object} 400 - Validation error
 *
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
redaction.post('/text', authMiddleware, jsonValidator(RedactTextSchema), async (c) => {
  try {
    const { text } = c.req.valid('json');

    const redactedText = pdfRedactionService.redactLogText(text);

    return c.json({
      success: true,
      data: {
        original: text,
        redacted: redactedText,
        hasChanges: text !== redactedText,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text redaction failed';
    return c.json({ success: false, error: message }, 500);
  }
});

export const redactionRoutes = redaction;
