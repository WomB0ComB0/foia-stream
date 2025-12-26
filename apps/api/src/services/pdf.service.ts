/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file PDF Validation and Sanitization Service
 * @module services/pdf.service
 * @description Validates and sanitizes PDF files before processing.
 *              Checks file structure, magic bytes, and strips potentially dangerous elements.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */

import { Effect, Schema as S } from 'effect';
import { virusTotalService } from './virustotal.service';

// ============================================
// Effect Schemas
// ============================================

/**
 * Schema for PDF validation result
 */
const PDFValidationResultSchema = S.Struct({
  valid: S.Boolean,
  isEncrypted: S.Boolean,
  hasJavaScript: S.Boolean,
  hasEmbeddedFiles: S.Boolean,
  pageCount: S.Number.pipe(S.optional),
  version: S.String.pipe(S.optional),
  errors: S.Array(S.String),
  warnings: S.Array(S.String),
});

export type PDFValidationResult = typeof PDFValidationResultSchema.Type;

/**
 * Schema for complete PDF scan result
 */
const PDFScanResultSchema = S.Struct({
  validation: PDFValidationResultSchema,
  virusScan: S.Struct({
    safe: S.Boolean,
    scanned: S.Boolean,
    message: S.String,
    hash: S.String,
  }),
  safe: S.Boolean,
  canProcess: S.Boolean,
  message: S.String,
});

export type PDFScanResult = typeof PDFScanResultSchema.Type;

// ============================================
// PDF Magic Bytes and Patterns
// ============================================

const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const PDF_EOF_MARKER = '%%EOF';

// Dangerous patterns to detect in PDF content
const DANGEROUS_PATTERNS = [
  /\/JavaScript/i,
  /\/JS\s/i,
  /\/Launch/i,
  /\/EmbeddedFile/i,
  /\/OpenAction/i,
  /\/AA\s/i, // Additional Actions
  /\/URI\s/i, // External URI actions
];

// ============================================
// PDF Service Functions
// ============================================

/**
 * Check if buffer has valid PDF magic bytes
 */
function hasPDFMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer.slice(0, 4).equals(PDF_MAGIC_BYTES);
}

/**
 * Check if buffer has PDF EOF marker
 */
function hasPDFEOF(buffer: Buffer): boolean {
  const tail = buffer.slice(-1024).toString('ascii');
  return tail.includes(PDF_EOF_MARKER);
}

/**
 * Extract PDF version from header
 */
function extractPDFVersion(buffer: Buffer): string | undefined {
  const header = buffer.slice(0, 20).toString('ascii');
  const match = header.match(/%PDF-(\d+\.\d+)/);
  return match ? match[1] : undefined;
}

/**
 * Check for encrypted PDF
 */
function isEncrypted(buffer: Buffer): boolean {
  const content = buffer.toString('ascii');
  return content.includes('/Encrypt') && content.includes('/Filter');
}

/**
 * Check for JavaScript in PDF
 */
function hasJavaScript(buffer: Buffer): boolean {
  const content = buffer.toString('ascii');
  return /\/JavaScript/i.test(content) || /\/JS\s/i.test(content);
}

/**
 * Check for embedded files
 */
function hasEmbeddedFiles(buffer: Buffer): boolean {
  const content = buffer.toString('ascii');
  return /\/EmbeddedFile/i.test(content);
}

/**
 * Detect dangerous patterns in PDF
 */
function detectDangerousPatterns(buffer: Buffer): string[] {
  const content = buffer.toString('ascii');
  const found: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      found.push(pattern.source);
    }
  }

  return found;
}

/**
 * Validate PDF structure and content
 *
 * @param buffer - PDF file buffer
 * @returns Effect with validation result
 */
function validatePDF(buffer: Buffer): Effect.Effect<PDFValidationResult, Error> {
  return Effect.try({
    try: () => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check magic bytes
      if (!hasPDFMagicBytes(buffer)) {
        errors.push('Invalid PDF: Missing magic bytes (%PDF)');
        return {
          valid: false,
          isEncrypted: false,
          hasJavaScript: false,
          hasEmbeddedFiles: false,
          errors,
          warnings,
        };
      }

      // Check EOF marker
      if (!hasPDFEOF(buffer)) {
        warnings.push('PDF may be truncated: Missing %%EOF marker');
      }

      // Check for dangerous patterns
      const dangerous = detectDangerousPatterns(buffer);
      if (dangerous.length > 0) {
        warnings.push(`Detected potentially dangerous patterns: ${dangerous.join(', ')}`);
      }

      const encrypted = isEncrypted(buffer);
      const hasJS = hasJavaScript(buffer);
      const hasEmbedded = hasEmbeddedFiles(buffer);

      if (encrypted) {
        warnings.push('PDF is encrypted - content cannot be verified');
      }

      if (hasJS) {
        warnings.push('PDF contains JavaScript');
      }

      if (hasEmbedded) {
        warnings.push('PDF contains embedded files');
      }

      return {
        valid: true,
        isEncrypted: encrypted,
        hasJavaScript: hasJS,
        hasEmbeddedFiles: hasEmbedded,
        version: extractPDFVersion(buffer),
        errors,
        warnings,
      };
    },
    catch: (error) => new Error(`PDF validation failed: ${error}`),
  });
}

/**
 * Sanitize PDF by removing dangerous elements
 * Note: This is a basic implementation. For production, use a proper PDF library.
 *
 * @param buffer - PDF file buffer
 * @returns Sanitized buffer (currently returns original if safe)
 */
function sanitizePDF(buffer: Buffer): Effect.Effect<Buffer, Error> {
  return Effect.flatMap(validatePDF(buffer), (validation) => {
    if (!validation.valid) {
      return Effect.fail(new Error('Cannot sanitize invalid PDF'));
    }

    // For now, if the PDF has dangerous elements, reject it
    // A full implementation would use a PDF library to strip these elements
    if (validation.hasJavaScript || validation.hasEmbeddedFiles) {
      return Effect.fail(
        new Error('PDF contains JavaScript or embedded files - please remove them before upload'),
      );
    }

    // Return original buffer if safe
    return Effect.succeed(buffer);
  });
}

/**
 * Full PDF scan including validation and virus check
 *
 * @param buffer - PDF file buffer
 * @param filename - Original filename
 * @returns Effect with complete scan result
 */
function scanPDF(buffer: Buffer, filename: string): Effect.Effect<PDFScanResult, Error> {
  return Effect.all({
    validation: validatePDF(buffer),
    virusScan: virusTotalService.scanFile(buffer, filename),
  }).pipe(
    Effect.map(({ validation, virusScan }) => {
      const canProcess = validation.valid && virusScan.safe && !validation.hasJavaScript;
      const safe = virusScan.safe && validation.valid;

      let message = 'PDF scan complete';
      if (!validation.valid) {
        message = validation.errors.join('; ');
      } else if (!virusScan.safe) {
        message = virusScan.message;
      } else if (validation.warnings.length > 0) {
        message = validation.warnings.join('; ');
      }

      return {
        validation,
        virusScan: {
          safe: virusScan.safe,
          scanned: virusScan.scanned,
          message: virusScan.message,
          hash: virusScan.hash,
        },
        safe,
        canProcess,
        message,
      };
    }),
  );
}

/**
 * Async wrapper for PDF scanning
 */
async function scanPDFAsync(buffer: Buffer, filename: string): Promise<PDFScanResult> {
  return Effect.runPromise(scanPDF(buffer, filename));
}

/**
 * Async wrapper for PDF validation only (no virus scan)
 */
async function validatePDFAsync(buffer: Buffer): Promise<PDFValidationResult> {
  return Effect.runPromise(validatePDF(buffer));
}

// ============================================
// Export Service
// ============================================

export const pdfService = {
  validatePDF,
  validatePDFAsync,
  sanitizePDF,
  scanPDF,
  scanPDFAsync,
  hasPDFMagicBytes,
  extractPDFVersion,
};
