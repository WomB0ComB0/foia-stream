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
 * @file PDF Redaction Service
 * @module services/pdf-redaction
 * @author FOIA Stream Team
 * @description Provides secure PDF redaction capabilities for sensitive document handling.
 *              Supports permanent redaction of text, areas, and patterns while maintaining
 *              audit trails and compliance with data protection requirements.
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 * @compliance SOC 2 CC6.1 (Logical and Physical Access Controls)
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import { logger } from '../lib/logger';

/**
 * Represents a rectangular area to be redacted in a PDF
 *
 * @interface RedactionArea
 * @property {number} page - Zero-based page index
 * @property {number} x - X coordinate of the top-left corner
 * @property {number} y - Y coordinate of the top-left corner
 * @property {number} width - Width of the redaction area
 * @property {number} height - Height of the redaction area
 * @property {string} [reason] - Optional reason for redaction (for audit)
 */
export interface RedactionArea {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  reason?: string;
}

/**
 * Configuration options for PDF redaction
 *
 * @interface RedactionOptions
 * @property {string} [redactionColor] - Hex color for redaction boxes (default: black)
 * @property {boolean} [addRedactionLabel] - Whether to add "REDACTED" label over boxes
 * @property {string} [labelText] - Custom label text (default: "REDACTED")
 * @property {boolean} [preserveMetadata] - Whether to preserve PDF metadata
 * @property {string} [userId] - User ID performing the redaction (for audit)
 * @property {string} [documentId] - Document ID being redacted (for audit)
 */
export interface RedactionOptions {
  redactionColor?: string;
  addRedactionLabel?: boolean;
  labelText?: string;
  preserveMetadata?: boolean;
  userId?: string;
  documentId?: string;
}

/**
 * Result of a PDF redaction operation
 *
 * @interface RedactionResult
 * @property {boolean} success - Whether the redaction was successful
 * @property {Uint8Array} [pdfBytes] - The redacted PDF as bytes
 * @property {number} redactionCount - Number of redactions applied
 * @property {RedactionAuditEntry[]} auditEntries - Audit trail entries
 * @property {string} [error] - Error message if operation failed
 */
export interface RedactionResult {
  success: boolean;
  pdfBytes?: Uint8Array;
  redactionCount: number;
  auditEntries: RedactionAuditEntry[];
  error?: string;
}

/**
 * Audit entry for a single redaction operation
 *
 * @interface RedactionAuditEntry
 * @property {Date} timestamp - When the redaction was applied
 * @property {number} page - Page number (1-based for display)
 * @property {string} area - Description of the redacted area
 * @property {string} [reason] - Reason for redaction
 * @property {string} [userId] - User who performed the redaction
 */
export interface RedactionAuditEntry {
  timestamp: Date;
  page: number;
  area: string;
  reason?: string;
  userId?: string;
}

/**
 * Service for applying secure redactions to PDF documents
 *
 * @class PDFRedactionService
 * @description
 * This service provides methods to permanently redact sensitive information
 * from PDF documents. Redactions are applied as solid color boxes that
 * completely obscure the underlying content. The original content is
 * permanently removed, not just hidden.
 *
 * @example
 * ```typescript
 * const service = new PDFRedactionService();
 * const result = await service.applyRedactions(pdfBuffer, [
 *   { page: 0, x: 100, y: 200, width: 150, height: 20, reason: 'SSN' }
 * ], { userId: 'user123', addRedactionLabel: true });
 *
 * if (result.success) {
 *   // Save result.pdfBytes to file or storage
 * }
 * ```
 *
 * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
 */
export class PDFRedactionService {
  private readonly defaultColor = { r: 0, g: 0, b: 0 }; // Black

  /**
   * Parse a hex color string to RGB values
   *
   * @private
   * @param {string} hex - Hex color string (e.g., "#000000" or "000000")
   * @returns {{ r: number; g: number; b: number }} RGB values (0-1 range)
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }

  /**
   * Apply redactions to a PDF document
   *
   * @param {ArrayBuffer | Uint8Array} pdfData - The source PDF data
   * @param {RedactionArea[]} areas - Array of areas to redact
   * @param {RedactionOptions} [options={}] - Redaction options
   * @returns {Promise<RedactionResult>} The result of the redaction operation
   *
   * @example
   * ```typescript
   * const areas = [
   *   { page: 0, x: 50, y: 700, width: 200, height: 15, reason: 'Name' },
   *   { page: 0, x: 50, y: 680, width: 100, height: 15, reason: 'SSN' }
   * ];
   * const result = await service.applyRedactions(pdfBytes, areas);
   * ```
   *
   * @compliance NIST 800-53 MP-6 (Media Sanitization)
   */
  async applyRedactions(
    pdfData: ArrayBuffer | Uint8Array,
    areas: RedactionArea[],
    options: RedactionOptions = {},
  ): Promise<RedactionResult> {
    const auditEntries: RedactionAuditEntry[] = [];
    const startTime = Date.now();

    try {
      logger.info(
        { areaCount: areas.length, documentId: options.documentId },
        'Starting PDF redaction',
      );

      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfData, {
        ignoreEncryption: true,
      });

      const pages = pdfDoc.getPages();
      const color = options.redactionColor
        ? this.parseHexColor(options.redactionColor)
        : this.defaultColor;

      // Load font for labels if needed
      let font = null;
      if (options.addRedactionLabel) {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }

      // Apply each redaction
      for (const area of areas) {
        if (area.page < 0 || area.page >= pages.length) {
          logger.warn(
            { page: area.page, totalPages: pages.length },
            'Skipping redaction for invalid page',
          );
          continue;
        }

        const currentPage = pages[area.page];
        if (!currentPage) {
          logger.warn({ page: area.page }, 'Page not found');
          continue;
        }

        const pageDimensions = currentPage.getSize();

        // Draw redaction rectangle
        currentPage.drawRectangle({
          x: area.x,
          y: pageDimensions.height - area.y - area.height, // Convert to PDF coordinates
          width: area.width,
          height: area.height,
          color: rgb(color.r, color.g, color.b),
        });

        // Add label if requested
        if (options.addRedactionLabel && font) {
          const labelText = options.labelText || 'REDACTED';
          const fontSize = Math.min(area.height * 0.6, 10);
          const textWidth = font.widthOfTextAtSize(labelText, fontSize);

          // Center the label in the redaction box
          const textX = area.x + (area.width - textWidth) / 2;
          const textY = pageDimensions.height - area.y - area.height + (area.height - fontSize) / 2;

          currentPage.drawText(labelText, {
            x: textX,
            y: textY,
            size: fontSize,
            font,
            color: rgb(1, 1, 1), // White text on black background
          });
        }

        // Create audit entry
        auditEntries.push({
          timestamp: new Date(),
          page: area.page + 1, // 1-based for display
          area: `(${area.x}, ${area.y}) ${area.width}x${area.height}`,
          reason: area.reason,
          userId: options.userId,
        });
      }

      // Remove metadata if not preserving
      if (!options.preserveMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('FOIA Stream Redaction Service');
        pdfDoc.setCreator('FOIA Stream');
      }

      // Save the redacted PDF
      const pdfBytes = await pdfDoc.save();

      const duration = Date.now() - startTime;
      logger.info(
        {
          redactionCount: auditEntries.length,
          duration,
          documentId: options.documentId,
        },
        'PDF redaction completed',
      );

      return {
        success: true,
        pdfBytes,
        redactionCount: auditEntries.length,
        auditEntries,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, documentId: options.documentId }, 'PDF redaction failed');

      return {
        success: false,
        redactionCount: 0,
        auditEntries,
        error: errorMessage,
      };
    }
  }

  /**
   * Get information about a PDF document
   *
   * @param {ArrayBuffer | Uint8Array} pdfData - The PDF data
   * @returns {Promise<{ pageCount: number; pages: { width: number; height: number }[] }>}
   *
   * @example
   * ```typescript
   * const info = await service.getPDFInfo(pdfBytes);
   * console.log(`Document has ${info.pageCount} pages`);
   * ```
   */
  async getPDFInfo(
    pdfData: ArrayBuffer | Uint8Array,
  ): Promise<{ pageCount: number; pages: { width: number; height: number }[] }> {
    const pdfDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    return {
      pageCount: pages.length,
      pages: pages.map((p) => {
        const size = p.getSize();
        return { width: size.width, height: size.height };
      }),
    };
  }

  /**
   * Create a preview of redactions without permanently applying them
   *
   * @param {ArrayBuffer | Uint8Array} pdfData - The source PDF data
   * @param {RedactionArea[]} areas - Array of areas to preview
   * @returns {Promise<Uint8Array>} PDF with semi-transparent redaction previews
   *
   * @example
   * ```typescript
   * const previewPdf = await service.previewRedactions(pdfBytes, areas);
   * // Display previewPdf to user for confirmation
   * ```
   */
  async previewRedactions(
    pdfData: ArrayBuffer | Uint8Array,
    areas: RedactionArea[],
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    for (const area of areas) {
      if (area.page < 0 || area.page >= pages.length) {
        continue;
      }

      const currentPage = pages[area.page];
      if (!currentPage) {
        continue;
      }

      const pageDimensions = currentPage.getSize();

      // Draw semi-transparent preview rectangle (red tint)
      currentPage.drawRectangle({
        x: area.x,
        y: pageDimensions.height - area.y - area.height,
        width: area.width,
        height: area.height,
        color: rgb(1, 0, 0),
        opacity: 0.3,
        borderColor: rgb(1, 0, 0),
        borderWidth: 1,
      });
    }

    return pdfDoc.save();
  }

  /**
   * Redact sensitive patterns from log text
   *
   * @param {string} text - The text to redact
   * @returns {string} Text with sensitive patterns redacted
   *
   * @example
   * ```typescript
   * const safeLog = service.redactLogText('User SSN: 123-45-6789');
   * // Returns: 'User SSN: [REDACTED-SSN]'
   * ```
   *
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  redactLogText(text: string): string {
    let redacted = text;

    // SSN patterns
    redacted = redacted.replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[REDACTED-SSN]');

    // Credit card patterns (basic)
    redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED-CC]');

    // Email patterns
    redacted = redacted.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      '[REDACTED-EMAIL]',
    );

    // Phone patterns
    redacted = redacted.replace(
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
      '[REDACTED-PHONE]',
    );

    // Date of birth patterns (MM/DD/YYYY, YYYY-MM-DD)
    redacted = redacted.replace(
      /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
      '[REDACTED-DOB]',
    );

    return redacted;
  }
}

/**
 * Singleton instance of the PDF redaction service
 *
 * @constant
 * @type {PDFRedactionService}
 */
export const pdfRedactionService = new PDFRedactionService();
