/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Redaction Route Handlers
 * @module routes/redaction/handlers
 * @description Handler implementations for PDF redaction endpoints.
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import { parseFormDataJson, parsePdfFile, pdfResponse } from '@/lib/file-helpers';
import { logger } from '@/lib/logger';
import { errorResponse, successResponse } from '@/lib/responses';
import type { AppRouteHandler } from '@/lib/types';
import {
  pdfRedactionService,
  type RedactionArea,
} from '@/services/documents/pdf-redaction.service';
import {
  applyTrueRedactions,
  getPDFInfo,
  type RedactionArea as TrueRedactionArea,
} from '@/services/documents/pdf-true-redaction.service';
import { Schema as S } from 'effect';

import type {
  applyRedactionsRoute,
  getPdfInfoRoute,
  previewRedactionsRoute,
  redactTextInPdfRoute,
} from './redaction.routes';

// ============================================
// Effect Schemas for validation
// ============================================

const ApplyRedactionsEffectSchema = S.Struct({
  areas: S.Array(
    S.Struct({
      page: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)),
      x: S.Number.pipe(S.greaterThanOrEqualTo(0)),
      y: S.Number.pipe(S.greaterThanOrEqualTo(0)),
      width: S.Number.pipe(S.positive()),
      height: S.Number.pipe(S.positive()),
      reason: S.optional(S.String),
    }),
  ).pipe(S.minItems(1)),
  options: S.optional(
    S.Struct({
      redactionColor: S.optional(S.String),
      addRedactionLabel: S.optional(S.Boolean),
      labelText: S.optional(S.String),
      documentId: S.optional(S.String),
    }),
  ),
});

const PreviewRedactionsEffectSchema = S.Struct({
  areas: S.Array(
    S.Struct({
      page: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)),
      x: S.Number.pipe(S.greaterThanOrEqualTo(0)),
      y: S.Number.pipe(S.greaterThanOrEqualTo(0)),
      width: S.Number.pipe(S.positive()),
      height: S.Number.pipe(S.positive()),
      reason: S.optional(S.String),
    }),
  ).pipe(S.minItems(1)),
});

// ============================================
// Handlers
// ============================================

/**
 * Apply permanent redactions to PDF
 */
export const applyRedactions: AppRouteHandler<typeof applyRedactionsRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return errorResponse(c, fileResult.error, fileResult.status);
    }

    const formData = await c.req.formData();
    const dataResult = parseFormDataJson(formData, 'data', ApplyRedactionsEffectSchema);
    if (!dataResult.success) {
      return errorResponse(c, dataResult.error, 400);
    }

    const { areas, options } = dataResult.data;

    // Apply TRUE redactions (flattens pages to images)
    const result = await applyTrueRedactions(fileResult.buffer, areas as TrueRedactionArea[], {
      redactionColor: options?.redactionColor,
      addRedactionLabel: options?.addRedactionLabel,
      labelText: options?.labelText,
    });

    logger.info(
      { redactionCount: result.redactionCount, flattened: result.flattened },
      'PDF redactions applied',
    );

    if (!result.pdfBytes) {
      return errorResponse(c, 'Failed to apply redactions', 500);
    }

    return pdfResponse(result.pdfBytes, 'redacted.pdf', {
      headers: {
        'X-Redaction-Count': result.redactionCount.toString(),
        'X-Flattened': result.flattened ? 'true' : 'false',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Redaction failed';
    logger.error({ error: message }, 'PDF redaction error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Generate redaction preview
 */
export const previewRedactions: AppRouteHandler<typeof previewRedactionsRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return errorResponse(c, fileResult.error, fileResult.status);
    }

    const formData = await c.req.formData();
    const dataResult = parseFormDataJson(formData, 'data', PreviewRedactionsEffectSchema);
    if (!dataResult.success) {
      return errorResponse(c, dataResult.error, 400);
    }

    const previewPdf = await pdfRedactionService.previewRedactions(
      fileResult.buffer,
      dataResult.data.areas as RedactionArea[],
    );

    return pdfResponse(previewPdf, 'preview.pdf', { inline: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview generation failed';
    logger.error({ error: message }, 'PDF preview error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Get PDF information
 */
export const getPdfInfo: AppRouteHandler<typeof getPdfInfoRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return errorResponse(c, fileResult.error, fileResult.status);
    }

    const info = await getPDFInfo(fileResult.buffer);

    return successResponse(c, {
      pageCount: info.pageCount,
      version: null,
      title: null,
      author: null,
      isEncrypted: false,
      hasJavaScript: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get PDF info';
    logger.error({ error: message }, 'PDF info error');
    return errorResponse(c, message, 500);
  }
};

/**
 * Redact specific text in PDF - placeholder, functionality not yet implemented
 */
export const redactTextInPdf: AppRouteHandler<typeof redactTextInPdfRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return errorResponse(c, fileResult.error, fileResult.status);
    }

    // Note: Text search in PDF is complex and not yet implemented
    // For now, return an error indicating this feature is coming soon
    return errorResponse(c, 'Text search redaction is not yet implemented', 501);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text redaction failed';
    logger.error({ error: message }, 'PDF text redaction error');
    return errorResponse(c, message, 500);
  }
};
