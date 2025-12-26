/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Upload Routes for PDF and File Handling
 * @module routes/upload.routes
 * @description Handles file uploads with validation, virus scanning, and sanitization.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */

import { Hono } from 'hono';
import { env } from '../config/env';
import { authMiddleware } from '../middleware/auth.middleware';
import { pdfService } from '../services/pdf.service';
import { virusTotalService } from '../services/virustotal.service';

const uploadRoutes = new Hono();

// All upload routes require authentication
uploadRoutes.use('*', authMiddleware);

// Maximum file size (from env or default 50MB)
const MAX_FILE_SIZE = Math.min(env.MAX_FILE_SIZE, 50 * 1024 * 1024);

/**
 * POST /upload/pdf
 * Upload and scan a PDF file
 */
uploadRoutes.post('/pdf', async (c) => {
  try {
    const contentType = c.req.header('Content-Type') || '';

    // Check content type
    if (!contentType.includes('multipart/form-data')) {
      return c.json(
        {
          error: 'Invalid content type',
          message: 'Request must be multipart/form-data',
        },
        400,
      );
    }

    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          error: 'No file provided',
          message: 'Please provide a file in the "file" field',
        },
        400,
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        {
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        400,
      );
    }

    // Check MIME type
    if (file.type !== 'application/pdf') {
      return c.json(
        {
          error: 'Invalid file type',
          message: 'Only PDF files are allowed',
        },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Run full PDF scan (validation + virus scan)
    const scanResult = await pdfService.scanPDFAsync(buffer, file.name);

    // Return scan results
    return c.json({
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
          version: scanResult.validation.version,
          warnings: scanResult.validation.warnings,
          errors: scanResult.validation.errors,
        },
        virusScan: {
          scanned: scanResult.virusScan.scanned,
          safe: scanResult.virusScan.safe,
          message: scanResult.virusScan.message,
        },
      },
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    return c.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

/**
 * POST /upload/validate
 * Validate a PDF without virus scanning (faster)
 */
uploadRoutes.post('/validate', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          error: 'No file provided',
          message: 'Please provide a file in the "file" field',
        },
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await pdfService.validatePDFAsync(buffer);
    const hash = virusTotalService.calculateSHA256(buffer);

    return c.json({
      success: validation.valid,
      filename: file.name,
      hash,
      validation,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return c.json(
      {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

/**
 * GET /upload/status
 * Check VirusTotal configuration status
 */
uploadRoutes.get('/status', (c) => {
  return c.json({
    virusTotalConfigured: virusTotalService.isConfigured(),
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    supportedTypes: ['application/pdf'],
  });
});

export { uploadRoutes };
