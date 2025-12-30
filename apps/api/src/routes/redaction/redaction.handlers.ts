/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Redaction Route Handlers
 * @module routes/redaction/handlers
 * @description Handler implementations for PDF redaction endpoints.
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import { HttpStatusCodes } from '@/lib/constants';
import { parseFormDataJson, parsePdfFile, pdfResponse } from '@/lib/file-helpers';
import { logger } from '@/lib/logger';
import { handleRouteError } from '@/lib/responses';
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
      return c.json(
        { success: false as const, error: fileResult.error },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Use formData from fileResult - do NOT call c.req.formData() again!
    const dataResult = parseFormDataJson(fileResult.formData, 'data', ApplyRedactionsEffectSchema);
    if (!dataResult.success) {
      return c.json(
        { success: false as const, error: dataResult.error },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const { areas, options } = dataResult.data;

    // Normalize to Uint8Array to satisfy pdf.js requirements
    // Always copy into a plain Uint8Array to satisfy pdf.js requirements
    const pdfBytes = new Uint8Array(fileResult.buffer);

    // Apply TRUE redactions (flattens pages to images)
    const result = await applyTrueRedactions(pdfBytes, areas as TrueRedactionArea[], {
      redactionColor: options?.redactionColor,
      addRedactionLabel: options?.addRedactionLabel,
      labelText: options?.labelText,
    });

    logger.info(
      { redactionCount: result.redactionCount, flattened: result.flattened, success: result.success },
      'PDF redactions applied',
    );

    if (!result.success || !result.pdfBytes) {
      logger.error(
        { error: result.error, success: result.success },
        'True redaction failed',
      );
      return c.json(
        { success: false as const, error: result.error || 'Failed to apply redactions' },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }

    return pdfResponse(result.pdfBytes, 'redacted.pdf', {
      headers: {
        'X-Redaction-Count': result.redactionCount.toString(),
        'X-Flattened': result.flattened ? 'true' : 'false',
      },
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Redaction failed' },
      'PDF redaction error',
    );
    return handleRouteError(c, error, 'Redaction failed', HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Generate redaction preview
 */
export const previewRedactions: AppRouteHandler<typeof previewRedactionsRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return c.json(
        { success: false as const, error: fileResult.error },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Use formData from fileResult - do NOT call c.req.formData() again!
    const dataResult = parseFormDataJson(fileResult.formData, 'data', PreviewRedactionsEffectSchema);
    if (!dataResult.success) {
      return c.json(
        { success: false as const, error: dataResult.error },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Always copy into a plain Uint8Array to satisfy pdf.js requirements
    const pdfBytes = new Uint8Array(fileResult.buffer);

    const previewPdf = await pdfRedactionService.previewRedactions(
      pdfBytes,
      dataResult.data.areas as RedactionArea[],
    );

    return pdfResponse(previewPdf, 'preview.pdf', { inline: true });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Preview generation failed' },
      'PDF preview error',
    );
    return handleRouteError(
      c,
      error,
      'Preview generation failed',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Get PDF information
 */
export const getPdfInfo: AppRouteHandler<typeof getPdfInfoRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return c.json(
        { success: false as const, error: fileResult.error },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    const info = await getPDFInfo(fileResult.buffer);

    return c.json(
      {
        success: true as const,
        data: {
          pageCount: info.pageCount,
          version: null,
          title: null,
          author: null,
          isEncrypted: false,
          hasJavaScript: false,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Failed to get PDF info' },
      'PDF info error',
    );
    return handleRouteError(
      c,
      error,
      'Failed to get PDF info',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};

/**
 * Redact specific text in PDF - placeholder, functionality not yet implemented
 */
export const redactTextInPdf: AppRouteHandler<typeof redactTextInPdfRoute> = async (c) => {
  try {
    const fileResult = await parsePdfFile(c);
    if (!fileResult.success) {
      return c.json(
        { success: false as const, error: fileResult.error },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Note: Text search in PDF is complex and not yet implemented
    // For now, return an error indicating this feature is coming soon
    return c.json(
      { success: false as const, error: 'Text search redaction is not yet implemented' },
      HttpStatusCodes.NOT_IMPLEMENTED,
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Text redaction failed' },
      'PDF text redaction error',
    );
    return handleRouteError(
      c,
      error,
      'Text redaction failed',
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    );
  }
};
