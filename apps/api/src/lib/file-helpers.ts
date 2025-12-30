/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file File Handling Helpers
 * @module lib/file-helpers
 * @description Utility functions for file handling in routes.
 *              Extracts common file processing logic to reduce duplication.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */

import { Schema as S } from 'effect';
import type { Context } from 'hono';

import { env } from '@/config/env';
import { pdfService, virusTotalService } from '@/services/documents/index.js';

// ============================================
// Constants
// ============================================

export const MAX_FILE_SIZE = Math.min(env.MAX_FILE_SIZE, 50 * 1024 * 1024); // 50MB max
export const ALLOWED_PDF_TYPES = ['application/pdf'];

// ============================================
// Types
// ============================================

export interface FileParseResult {
  success: true;
  file: File;
  buffer: Buffer;
  formData: FormData;
}

export interface FileParseError {
  success: false;
  error: string;
  status: 400;
}

export interface PdfScanResult {
  safe: boolean;
  canProcess: boolean;
  hash: string;
  validation: {
    valid: boolean;
    isEncrypted: boolean;
    hasJavaScript: boolean;
    hasEmbeddedFiles: boolean;
    version?: string;
    warnings: readonly string[];
    errors: readonly string[];
  };
  virusScan: {
    scanned: boolean;
    safe: boolean;
    message: string;
  };
}

// ============================================
// File Parsing Helpers
// ============================================

/**
 * Parse a file from form data
 */
export async function parseFormDataFile(
  c: Context,
  fieldName: string = 'file',
): Promise<FileParseResult | FileParseError> {
  try {
    const contentType = c.req.header('Content-Type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return {
        success: false,
        error: 'Request must be multipart/form-data',
        status: 400,
      };
    }

    const formData = await c.req.formData();
    const file = formData.get(fieldName);

    if (!file || !(file instanceof File)) {
      return {
        success: false,
        error: `No file provided in "${fieldName}" field`,
        status: 400,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        status: 400,
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return {
      success: true,
      file,
      buffer,
      formData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse form data',
      status: 400,
    };
  }
}

/**
 * Parse a PDF file from form data with validation
 */
export async function parsePdfFile(
  c: Context,
  fieldName: string = 'file',
): Promise<FileParseResult | FileParseError> {
  const result = await parseFormDataFile(c, fieldName);

  if (!result.success) {
    return result;
  }

  // Check magic bytes first - this is the authoritative check
  if (!pdfService.hasPDFMagicBytes(result.buffer)) {
    return {
      success: false,
      error: 'File does not appear to be a valid PDF',
      status: 400,
    };
  }

  // Check MIME type (only if magic bytes passed, allow common PDF types)
  const validPdfTypes = ['application/pdf', 'application/x-pdf', 'application/octet-stream', ''];
  if (!validPdfTypes.includes(result.file.type)) {
    return {
      success: false,
      error: 'Only PDF files are allowed',
      status: 400,
    };
  }

  return result;
}

// ============================================
// PDF Scanning Helpers
// ============================================

/**
 * Scan a PDF file for viruses and validate structure
 */
export async function scanPdfFile(buffer: Buffer, filename: string): Promise<PdfScanResult> {
  const result = await pdfService.scanPDFAsync(buffer, filename);

  return {
    safe: result.safe,
    canProcess: result.canProcess,
    hash: result.virusScan.hash,
    validation: {
      valid: result.validation.valid,
      isEncrypted: result.validation.isEncrypted,
      hasJavaScript: result.validation.hasJavaScript,
      hasEmbeddedFiles: result.validation.hasEmbeddedFiles,
      version: result.validation.version,
      warnings: result.validation.warnings,
      errors: result.validation.errors,
    },
    virusScan: {
      scanned: result.virusScan.scanned,
      safe: result.virusScan.safe,
      message: result.virusScan.message,
    },
  };
}

/**
 * Validate a PDF file without virus scanning (faster)
 */
export async function validatePdfFile(
  buffer: Buffer,
): Promise<PdfScanResult['validation'] & { hash: string }> {
  const validation = await pdfService.validatePDFAsync(buffer);
  const hash = virusTotalService.calculateSHA256(buffer);

  return {
    ...validation,
    hash,
  };
}

// ============================================
// JSON Parsing Helpers
// ============================================

/**
 * Parse JSON from form data field
 */
export function parseFormDataJson<T>(
  formData: FormData,
  fieldName: string,
  schema: S.Schema<T>,
): { success: true; data: T } | { success: false; error: string } {
  const jsonString = formData.get(fieldName);

  if (!jsonString || typeof jsonString !== 'string') {
    return {
      success: false,
      error: `Missing "${fieldName}" field in form data`,
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    const decoded = S.decodeUnknownSync(schema)(parsed);
    return { success: true, data: decoded };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON data',
    };
  }
}

// ============================================
// File Response Helpers
// ============================================

/**
 * Create a PDF response with appropriate headers
 */
export function pdfResponse(
  pdfBytes: Uint8Array | ArrayBuffer,
  filename: string = 'document.pdf',
  options?: { inline?: boolean; headers?: Record<string, string> },
): Response {
  const disposition = options?.inline ? 'inline' : 'attachment';

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      ...options?.headers,
    },
  });
}
