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
 * @file True PDF Redaction Service
 * @module services/pdf-true-redaction
 * @author FOIA Stream Team
 * @description Provides TRUE permanent PDF redaction by flattening pages to images.
 *              This ensures text is completely removed and cannot be copied or extracted.
 *              Uses PDF.js for rendering and @napi-rs/canvas for image generation.
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 * @compliance SOC 2 CC6.1 (Logical and Physical Access Controls)
 */

import { type Canvas, createCanvas } from '@napi-rs/canvas';
import { Schema as S } from 'effect';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

import { logger } from '@/lib/logger';

// Disable worker for server-side usage
pdfjs.GlobalWorkerOptions.workerSrc = '';

/**
 * Represents a rectangular area to be redacted in a PDF
 * @schema
 */
export const RedactionAreaSchema = S.Struct({
  /** Zero-based page index */
  page: S.Number,
  /** X coordinate of the top-left corner */
  x: S.Number,
  /** Y coordinate of the top-left corner */
  y: S.Number,
  /** Width of the redaction area */
  width: S.Number,
  /** Height of the redaction area */
  height: S.Number,
  /** Optional reason for redaction (for audit) */
  reason: S.optional(S.String),
});
export type RedactionArea = typeof RedactionAreaSchema.Type;

/**
 * Configuration options for PDF redaction
 * @schema
 */
export const TrueRedactionOptionsSchema = S.Struct({
  /** DPI for rendering (higher = better quality but larger file) */
  dpi: S.optional(S.Number),
  /** Hex color for redaction boxes (default: black) */
  redactionColor: S.optional(S.String),
  /** Whether to add "REDACTED" label over boxes */
  addRedactionLabel: S.optional(S.Boolean),
  /** Custom label text */
  labelText: S.optional(S.String),
  /** User ID performing the redaction (for audit) */
  userId: S.optional(S.String),
  /** Document ID being redacted (for audit) */
  documentId: S.optional(S.String),
});
export type TrueRedactionOptions = typeof TrueRedactionOptionsSchema.Type;

/**
 * Audit entry for a single redaction operation
 * @schema
 */
export const RedactionAuditEntrySchema = S.Struct({
  /** When the redaction was applied */
  timestamp: S.DateFromSelf,
  /** Page number (1-based for display) */
  page: S.Number,
  /** Description of the redacted area */
  area: S.String,
  /** Reason for redaction */
  reason: S.optional(S.String),
  /** User who performed the redaction */
  userId: S.optional(S.String),
});
export type RedactionAuditEntry = typeof RedactionAuditEntrySchema.Type;

/**
 * Result of a PDF redaction operation
 * @schema
 */
export const TrueRedactionResultSchema = S.Struct({
  /** Whether the redaction was successful */
  success: S.Boolean,
  /** The redacted PDF as bytes */
  pdfBytes: S.optional(S.Unknown as S.Schema<Uint8Array>),
  /** Number of redactions applied */
  redactionCount: S.Number,
  /** Audit trail entries */
  auditEntries: S.mutable(S.Array(RedactionAuditEntrySchema)),
  /** Error message if operation failed */
  error: S.optional(S.String),
  /** Whether the document was flattened to images */
  flattened: S.Boolean,
});
export type TrueRedactionResult = typeof TrueRedactionResultSchema.Type;

/**
 * Parse hex color to RGB values (0-255)
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  return {
    r: Number.parseInt(cleanHex.substring(0, 2), 16),
    g: Number.parseInt(cleanHex.substring(2, 4), 16),
    b: Number.parseInt(cleanHex.substring(4, 6), 16),
  };
}

/**
 * Custom canvas factory for PDF.js that uses @napi-rs/canvas
 */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(
    canvasAndContext: { canvas: Canvas; context: ReturnType<Canvas['getContext']> },
    width: number,
    height: number,
  ) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(_canvasAndContext: { canvas: Canvas }) {
    // Nothing to do - canvas will be garbage collected
  }
}

/**
 * Apply TRUE permanent redactions to a PDF document.
 *
 * This function flattens pages with redactions to images, ensuring
 * the original text is completely removed and cannot be extracted.
 *
 * @param pdfData - The source PDF data
 * @param areas - Array of areas to redact
 * @param options - Redaction options
 * @returns The result of the redaction operation
 *
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */
export async function applyTrueRedactions(
  pdfData: ArrayBuffer | Uint8Array,
  areas: RedactionArea[],
  options: TrueRedactionOptions = {},
): Promise<TrueRedactionResult> {
  const auditEntries: RedactionAuditEntry[] = [];
  const startTime = Date.now();
  const dpi = options.dpi || 150; // Good balance of quality vs size
  const scale = dpi / 72; // PDF is 72 DPI by default

  try {
    logger.info(
      { areaCount: areas.length, documentId: options.documentId, dpi },
      'Starting TRUE PDF redaction (page flattening)',
    );

    // Group redactions by page
    const redactionsByPage = new Map<number, RedactionArea[]>();
    for (const area of areas) {
      const pageAreas = redactionsByPage.get(area.page) || [];
      pageAreas.push(area);
      redactionsByPage.set(area.page, pageAreas);
    }

    // Load PDF with PDF.js for rendering
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfData instanceof ArrayBuffer ? pdfData : pdfData.buffer),
      useSystemFonts: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@latest/standard_fonts/',
    });
    const pdfDocument = await loadingTask.promise;

    // Create new PDF document with pdf-lib
    const newPdfDoc = await PDFDocument.create();
    const canvasFactory = new NodeCanvasFactory();

    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Check if this page has redactions
      const pageRedactions = redactionsByPage.get(pageNum - 1) || [];

      if (pageRedactions.length > 0) {
        // Flatten this page to an image
        const { canvas, context } = canvasFactory.create(
          Math.floor(viewport.width),
          Math.floor(viewport.height),
        );

        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport,
          canvas: canvas,
        }).promise;

        // Apply redaction rectangles
        const color = options.redactionColor
          ? parseHexColor(options.redactionColor)
          : { r: 0, g: 0, b: 0 };

        context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;

        for (const area of pageRedactions) {
          // Scale coordinates to match rendered size
          const scaledX = area.x * scale;
          const scaledY = area.y * scale;
          const scaledWidth = area.width * scale;
          const scaledHeight = area.height * scale;

          // Draw black rectangle
          context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

          // Add label if requested
          if (options.addRedactionLabel) {
            const labelText = options.labelText || 'REDACTED';
            const fontSize = Math.min(scaledHeight * 0.6, 14 * scale);

            context.fillStyle = 'white';
            context.font = `bold ${fontSize}px Arial, sans-serif`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(labelText, scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);

            // Reset fill color for next rectangle
            context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          }

          // Create audit entry
          auditEntries.push({
            timestamp: new Date(),
            page: pageNum,
            area: `(${area.x}, ${area.y}) ${area.width}x${area.height}`,
            reason: area.reason,
            userId: options.userId,
          });
        }

        // Convert canvas to PNG buffer
        const pngBuffer = canvas.toBuffer('image/png');

        // Embed image in new PDF
        const pngImage = await newPdfDoc.embedPng(pngBuffer);
        const newPage = newPdfDoc.addPage([viewport.width / scale, viewport.height / scale]);

        newPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: viewport.width / scale,
          height: viewport.height / scale,
        });
      } else {
        // No redactions on this page - copy it directly
        // Load original PDF with pdf-lib
        const originalPdfDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
        const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(copiedPage);
      }
    }

    // Set metadata
    newPdfDoc.setTitle('');
    newPdfDoc.setAuthor('');
    newPdfDoc.setSubject('');
    newPdfDoc.setKeywords([]);
    newPdfDoc.setProducer('FOIA Stream True Redaction Service');
    newPdfDoc.setCreator('FOIA Stream');
    newPdfDoc.setCreationDate(new Date());
    newPdfDoc.setModificationDate(new Date());

    // Save the new PDF
    const pdfBytes = await newPdfDoc.save();

    const duration = Date.now() - startTime;
    logger.info(
      {
        redactionCount: auditEntries.length,
        duration,
        documentId: options.documentId,
        pagesFlattened: redactionsByPage.size,
      },
      'TRUE PDF redaction completed',
    );

    return {
      success: true,
      pdfBytes,
      redactionCount: auditEntries.length,
      auditEntries,
      flattened: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        documentId: options.documentId,
      },
      'TRUE PDF redaction failed',
    );

    return {
      success: false,
      redactionCount: 0,
      auditEntries,
      error: errorMessage,
      flattened: false,
    };
  }
}

/**
 * Get information about a PDF document
 */
export async function getPDFInfo(
  pdfData: ArrayBuffer | Uint8Array,
): Promise<{ pageCount: number; pages: { width: number; height: number }[] }> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfData instanceof ArrayBuffer ? pdfData : pdfData.buffer),
  });
  const pdfDocument = await loadingTask.promise;

  const pages: { width: number; height: number }[] = [];
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({ width: viewport.width, height: viewport.height });
  }

  return {
    pageCount: pdfDocument.numPages,
    pages,
  };
}
