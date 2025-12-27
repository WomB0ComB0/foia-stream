/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file VirusTotal Integration Service
 * @module services/virustotal.service
 * @description Provides file scanning capabilities using VirusTotal API.
 *              Scans uploaded documents for malware, viruses, and malicious content
 *              before processing to ensure system security.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 SC-18 (Mobile Code)
 * @compliance SOC 2 CC6.6 (Logical Access Controls)
 */

import { env } from '@/config/env';
import { Effect, Schema as S, Schedule } from 'effect';
import * as crypto from 'node:crypto';

// ============================================
// Effect Schemas for VT API Responses
// ============================================

/**
 * Schema for VT scan result statistics
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
const VTStatsSchema = S.Struct({
  harmless: S.Number,
  malicious: S.Number,
  suspicious: S.Number,
  undetected: S.Number,
  timeout: S.Number,
});

export type VTStats = typeof VTStatsSchema.Type;

/**
 * Schema for VT analysis result response
 */
const VTAnalysisResultSchema = S.Struct({
  data: S.Struct({
    id: S.String,
    type: S.String,
    attributes: S.Struct({
      stats: VTStatsSchema.pipe(S.optional),
      status: S.String,
    }),
  }),
});

/**
 * Schema for VT file report response
 */
const VTFileReportSchema = S.Struct({
  data: S.Struct({
    id: S.String,
    type: S.String,
    attributes: S.Struct({
      last_analysis_stats: VTStatsSchema.pipe(S.optional),
      reputation: S.Number.pipe(S.optional),
      sha256: S.String.pipe(S.optional),
    }),
  }),
});

/**
 * Schema for VT analysis response (after upload)
 */
const VTUploadResponseSchema = S.Struct({
  data: S.Struct({
    id: S.String,
    type: S.Literal('analysis'),
  }),
});

// ============================================
// Types
// ============================================

/**
 * Schema for scan result
 */
const ScanResultSchema = S.Struct({
  safe: S.Boolean,
  hash: S.String,
  stats: S.NullOr(VTStatsSchema),
  message: S.String,
  scanned: S.Boolean,
});

export type ScanResult = typeof ScanResultSchema.Type;

/**
 * Comprehensive scan result schema with detailed information
 * @schema
 */
export const VirusTotalScanResultSchema = S.Struct({
  success: S.Boolean,
  fileHash: S.String,
  isSafe: S.Boolean,
  status: S.Literal('clean', 'malicious', 'suspicious', 'undetected', 'error', 'pending'),
  stats: S.optional(VTStatsSchema),
  detections: S.optional(
    S.Array(
      S.Struct({
        engine: S.String,
        result: S.String,
        category: S.String,
      }),
    ),
  ),
  analysisId: S.optional(S.String),
  permalink: S.optional(S.String),
  error: S.optional(S.String),
  scannedAt: S.String,
});
export type VirusTotalScanResult = typeof VirusTotalScanResultSchema.Type;

/**
 * File validation result schema combining multiple checks
 * @schema
 */
export const FileValidationResultSchema = S.Struct({
  isValid: S.Boolean,
  fileTypeValid: S.Boolean,
  fileSizeValid: S.Boolean,
  virusScan: S.NullOr(VirusTotalScanResultSchema),
  errors: S.mutable(S.Array(S.String)),
  metadata: S.Struct({
    fileName: S.String,
    fileSize: S.Number,
    mimeType: S.String,
    sha256: S.String,
  }),
});
export type FileValidationResult = typeof FileValidationResultSchema.Type;

// ============================================
// Constants
// ============================================

const VT_API_BASE = 'https://www.virustotal.com/api/v3';

/**
 * Allowed file types for upload
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/**
 * Maximum file size (100 MB)
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate SHA256 hash of a buffer
 */
function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if VirusTotal API is configured
 */
function isConfigured(): boolean {
  return Boolean(env.VIRUSTOTAL_API_KEY && env.VIRUSTOTAL_API_KEY.length > 0);
}

/**
 * Get authorization headers for VT API
 */
function getHeaders(): Record<string, string> {
  return {
    'x-apikey': env.VIRUSTOTAL_API_KEY ?? '',
    Accept: 'application/json',
  };
}

// ============================================
// Effect-based Functions
// ============================================

/**
 * Look up a file by its hash in VirusTotal
 *
 * @param hash - SHA256 hash of the file
 * @returns Effect with scan result or error
 */
function lookupByHash(hash: string): Effect.Effect<ScanResult, Error> {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${VT_API_BASE}/files/${hash}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (response.status === 404) {
        return {
          safe: true,
          hash,
          stats: null,
          message: 'File not found in VirusTotal database',
          scanned: false,
        };
      }

      if (!response.ok) {
        throw new Error(`VirusTotal API error: ${response.status}`);
      }

      const json = await response.json();
      const parsed = S.decodeUnknownSync(VTFileReportSchema)(json);
      const stats = parsed.data.attributes.last_analysis_stats;

      if (!stats) {
        return {
          safe: true,
          hash,
          stats: null,
          message: 'No analysis available',
          scanned: false,
        };
      }

      const isMalicious = stats.malicious > 0 || stats.suspicious > 2;

      return {
        safe: !isMalicious,
        hash,
        stats,
        message: isMalicious
          ? `Detected as malicious by ${stats.malicious} engines`
          : 'File appears safe',
        scanned: true,
      };
    },
    catch: (error) => new Error(`VT lookup failed: ${error}`),
  });
}

/**
 * Upload a file to VirusTotal for scanning
 *
 * @param buffer - File buffer to scan
 * @param filename - Original filename
 * @returns Effect with analysis ID
 */
function uploadForScan(buffer: Buffer, filename: string): Effect.Effect<string, Error> {
  return Effect.tryPromise({
    try: async () => {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      formData.append('file', blob, filename);

      const response = await fetch(`${VT_API_BASE}/files`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`VT upload failed: ${response.status} - ${text}`);
      }

      const json = await response.json();
      const parsed = S.decodeUnknownSync(VTUploadResponseSchema)(json);
      return parsed.data.id;
    },
    catch: (error) => new Error(`VT upload failed: ${error}`),
  });
}

/**
 * Get analysis results from VirusTotal
 *
 * @param analysisId - Analysis ID from upload
 * @returns Effect with scan result
 */
function getAnalysisResult(analysisId: string): Effect.Effect<ScanResult, Error> {
  return Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${VT_API_BASE}/analyses/${analysisId}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`VT analysis fetch failed: ${response.status}`);
      }

      const json = await response.json();
      const parsed = S.decodeUnknownSync(VTAnalysisResultSchema)(json);
      const status = parsed.data.attributes.status;

      if (status === 'queued' || status === 'in-progress') {
        return {
          safe: true,
          hash: '',
          stats: null,
          message: 'Scan in progress',
          scanned: false,
        };
      }

      const stats = parsed.data.attributes.stats;
      if (!stats) {
        return {
          safe: true,
          hash: '',
          stats: null,
          message: 'No scan results available',
          scanned: false,
        };
      }

      const isMalicious = stats.malicious > 0 || stats.suspicious > 2;

      return {
        safe: !isMalicious,
        hash: '',
        stats,
        message: isMalicious
          ? `Detected as malicious by ${stats.malicious} engines`
          : 'File appears safe',
        scanned: true,
      };
    },
    catch: (error) => new Error(`VT analysis failed: ${error}`),
  });
}

/**
 * Scan a file buffer for malware using Effect
 *
 * @param buffer - File buffer to scan
 * @param filename - Original filename
 * @returns Effect with scan result
 */
function scanFile(buffer: Buffer, filename: string): Effect.Effect<ScanResult, Error> {
  if (!isConfigured()) {
    return Effect.succeed({
      safe: true,
      hash: calculateSHA256(buffer),
      stats: null,
      message: 'VirusTotal not configured - skipping scan',
      scanned: false,
    });
  }

  const hash = calculateSHA256(buffer);

  // First lookup by hash to check if already scanned
  return Effect.flatMap(lookupByHash(hash), (existing) => {
    if (existing.scanned) {
      return Effect.succeed(existing);
    }

    // Upload for new scan and poll for results
    return Effect.flatMap(uploadForScan(buffer, filename), (analysisId) =>
      Effect.retry(
        getAnalysisResult(analysisId),
        Schedule.addDelay(Schedule.recurs(10), () => '2 seconds'),
      ).pipe(
        Effect.map((result) => ({
          ...result,
          hash,
        })),
      ),
    );
  });
}

/**
 * Async wrapper for scanning files
 */
async function scanFileAsync(buffer: Buffer, filename: string): Promise<ScanResult> {
  return Effect.runPromise(scanFile(buffer, filename));
}

// ============================================
// Comprehensive File Validation
// ============================================

/**
 * Convert ScanResult to comprehensive VirusTotalScanResult
 */
function toVirusTotalScanResult(result: ScanResult): VirusTotalScanResult {
  return {
    success: true,
    fileHash: result.hash,
    isSafe: result.safe,
    status: result.scanned ? (result.safe ? 'clean' : 'malicious') : 'undetected',
    stats: result.stats ?? undefined,
    scannedAt: new Date().toISOString(),
    permalink: result.hash ? `https://www.virustotal.com/gui/file/${result.hash}` : undefined,
  };
}

/**
 * Validate a file with comprehensive checks
 *
 * @param fileData - File buffer
 * @param fileName - Original file name
 * @param mimeType - File MIME type
 * @param skipVirusScan - Skip virus scanning (for testing)
 * @returns Comprehensive validation result
 *
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
async function validateFile(
  fileData: Buffer,
  fileName: string,
  mimeType: string,
  skipVirusScan = false,
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const hash = calculateSHA256(fileData);
  const fileSize = fileData.byteLength;

  /**
   * 🚩
   */
  // File type validation
  const fileTypeValid = ALLOWED_MIME_TYPES.includes(<(typeof ALLOWED_MIME_TYPES)[number]>mimeType);
  if (!fileTypeValid) {
    errors.push(`File type '${mimeType}' is not allowed`);
  }

  // File size validation
  const fileSizeValid = fileSize <= MAX_FILE_SIZE;
  if (!fileSizeValid) {
    errors.push(
      `File size ${(fileSize / (1024 * 1024)).toFixed(2)} MB exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
    );
  }

  // Virus scan (if enabled and file type is valid)
  let virusScan: VirusTotalScanResult | null = null;
  if (!skipVirusScan && fileTypeValid && fileSizeValid) {
    const scanResult = await scanFileAsync(fileData, fileName);
    virusScan = toVirusTotalScanResult(scanResult);
    if (!virusScan.isSafe) {
      errors.push(`File failed virus scan: ${virusScan.status}`);
    }
  }

  const isValid = fileTypeValid && fileSizeValid && (virusScan?.isSafe ?? true);

  return {
    isValid,
    fileTypeValid,
    fileSizeValid,
    virusScan,
    errors,
    metadata: {
      fileName,
      fileSize,
      mimeType,
      sha256: hash,
    },
  };
}

// ============================================
// Export Service
// ============================================

export const virusTotalService = {
  // Effect-based functions
  scanFile,
  lookupByHash,
  uploadForScan,
  getAnalysisResult,

  // Async wrappers
  scanFileAsync,
  validateFile,

  // Utility functions
  calculateSHA256,
  isConfigured,
};
