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
 * @file VirusTotal Integration Service
 * @module services/virustotal
 * @author FOIA Stream Team
 * @description Provides file scanning capabilities using VirusTotal API.
 *              Scans uploaded documents for malware, viruses, and malicious content
 *              before processing to ensure system security.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 SC-18 (Mobile Code)
 * @compliance SOC 2 CC6.6 (Logical Access Controls)
 */

import { createHash } from 'node:crypto';
import { logger } from '../lib/logger';

// ============================================
// Types
// ============================================

/**
 * Scan result from VirusTotal
 */
export interface VirusTotalScanResult {
  /** Whether the scan was successful */
  success: boolean;
  /** The file hash (SHA-256) */
  fileHash: string;
  /** Whether the file is considered safe */
  isSafe: boolean;
  /** Scan status */
  status: 'clean' | 'malicious' | 'suspicious' | 'undetected' | 'error' | 'pending';
  /** Detailed scan statistics */
  stats?: {
    harmless: number;
    malicious: number;
    suspicious: number;
    undetected: number;
    timeout: number;
  };
  /** Engines that detected threats */
  detections?: Array<{
    engine: string;
    result: string;
    category: string;
  }>;
  /** Analysis ID for tracking */
  analysisId?: string;
  /** Permalink to VirusTotal report */
  permalink?: string;
  /** Error message if scan failed */
  error?: string;
  /** Timestamp of the scan */
  scannedAt: string;
}

/**
 * File validation result combining multiple checks
 */
export interface FileValidationResult {
  /** Overall validation passed */
  isValid: boolean;
  /** File type validation */
  fileTypeValid: boolean;
  /** File size validation */
  fileSizeValid: boolean;
  /** Virus scan result */
  virusScan: VirusTotalScanResult | null;
  /** Validation errors */
  errors: string[];
  /** File metadata */
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    sha256: string;
  };
}

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
// Service Class
// ============================================

/**
 * Service for validating files using VirusTotal API
 *
 * @class VirusTotalService
 * @description
 * Provides comprehensive file validation including:
 * - File type verification
 * - File size limits
 * - Malware scanning via VirusTotal API
 * - Content analysis
 *
 * @example
 * ```typescript
 * const service = new VirusTotalService();
 * const result = await service.validateFile(buffer, 'document.pdf', 'application/pdf');
 * if (result.isValid) {
 *   // Proceed with file processing
 * }
 * ```
 *
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */
export class VirusTotalService {
  private readonly apiKey: string | null;
  private readonly baseUrl = 'https://www.virustotal.com/api/v3';

  constructor() {
    // VirusTotal API key is optional - if not set, skip virus scanning
    this.apiKey = process.env.VIRUSTOTAL_API_KEY || null;

    if (!this.apiKey) {
      logger.warn('VirusTotal API key not configured - virus scanning disabled');
    }
  }

  /**
   * Calculate SHA-256 hash of file data
   *
   * @param data - File buffer
   * @returns SHA-256 hash as hex string
   */
  private calculateHash(data: ArrayBuffer | Uint8Array): string {
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data);
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if file has already been scanned by VirusTotal
   *
   * @param hash - SHA-256 hash of the file
   * @returns Existing scan result or null
   */
  private async checkExistingScan(hash: string): Promise<VirusTotalScanResult | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${this.baseUrl}/files/${hash}`, {
        method: 'GET',
        headers: {
          'x-apikey': this.apiKey,
        },
      });

      if (response.status === 404) {
        // File not previously scanned
        return null;
      }

      if (!response.ok) {
        logger.warn({ status: response.status }, 'VirusTotal lookup failed');
        return null;
      }

      const data = await response.json();
      return this.parseAnalysisResult(data, hash);
    } catch (error) {
      logger.error({ error }, 'VirusTotal lookup error');
      return null;
    }
  }

  /**
   * Upload file to VirusTotal for scanning
   *
   * @param fileData - File buffer
   * @param fileName - Original file name
   * @returns Analysis ID for tracking
   */
  private async uploadForScan(
    fileData: ArrayBuffer | Uint8Array,
    fileName: string,
  ): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const formData = new FormData();
      const blob = new Blob([fileData]);
      formData.append('file', blob, fileName);

      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'x-apikey': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'VirusTotal upload failed');
        return null;
      }

      const data = (await response.json()) as { data?: { id?: string } };
      return data.data?.id || null;
    } catch (error) {
      logger.error({ error }, 'VirusTotal upload error');
      return null;
    }
  }

  /**
   * Get analysis results by ID
   *
   * @param analysisId - Analysis ID from upload
   * @returns Analysis result or null
   */
  private async getAnalysisResult(analysisId: string): Promise<any | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${this.baseUrl}/analyses/${analysisId}`, {
        method: 'GET',
        headers: {
          'x-apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'VirusTotal analysis lookup failed');
        return null;
      }

      return response.json();
    } catch (error) {
      logger.error({ error }, 'VirusTotal analysis error');
      return null;
    }
  }

  /**
   * Parse VirusTotal API response into our result format
   *
   * @param data - Raw API response
   * @param hash - File hash
   * @returns Parsed scan result
   */
  private parseAnalysisResult(data: any, hash: string): VirusTotalScanResult {
    const attributes = data.data?.attributes || {};
    const stats = attributes.last_analysis_stats || attributes.stats || {};

    const maliciousCount = stats.malicious || 0;
    const suspiciousCount = stats.suspicious || 0;

    let status: VirusTotalScanResult['status'] = 'clean';
    let isSafe = true;

    if (attributes.status === 'queued' || attributes.status === 'in-progress') {
      status = 'pending';
      isSafe = false;
    } else if (maliciousCount > 0) {
      status = 'malicious';
      isSafe = false;
    } else if (suspiciousCount > 0) {
      status = 'suspicious';
      isSafe = false;
    } else if (stats.undetected === 0 && stats.harmless === 0) {
      status = 'undetected';
    }

    // Extract detections if any
    const detections: VirusTotalScanResult['detections'] = [];
    const lastResults = attributes.last_analysis_results || attributes.results || {};

    for (const [engine, result] of Object.entries(lastResults)) {
      const engineResult = result as any;
      if (engineResult.category === 'malicious' || engineResult.category === 'suspicious') {
        detections.push({
          engine,
          result: engineResult.result || 'Detected',
          category: engineResult.category,
        });
      }
    }

    return {
      success: true,
      fileHash: hash,
      isSafe,
      status,
      stats: {
        harmless: stats.harmless || 0,
        malicious: maliciousCount,
        suspicious: suspiciousCount,
        undetected: stats.undetected || 0,
        timeout: stats.timeout || 0,
      },
      detections: detections.length > 0 ? detections : undefined,
      analysisId: data.data?.id,
      permalink: `https://www.virustotal.com/gui/file/${hash}`,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Scan a file for viruses using VirusTotal
   *
   * @param fileData - File buffer to scan
   * @param fileName - Original file name
   * @param waitForResult - Whether to wait for scan completion
   * @returns Scan result
   *
   * @example
   * ```typescript
   * const result = await virusTotal.scanFile(buffer, 'document.pdf');
   * if (result.isSafe) {
   *   console.log('File is clean');
   * }
   * ```
   *
   * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
   */
  async scanFile(
    fileData: ArrayBuffer | Uint8Array,
    fileName: string,
    waitForResult = true,
  ): Promise<VirusTotalScanResult> {
    const hash = this.calculateHash(fileData);

    // If API key not configured, return a skip result
    if (!this.apiKey) {
      return {
        success: true,
        fileHash: hash,
        isSafe: true,
        status: 'undetected',
        scannedAt: new Date().toISOString(),
        error: 'Virus scanning not configured - skipped',
      };
    }

    logger.info({ fileName, hash }, 'Starting virus scan');

    // First check if file was previously scanned
    const existingScan = await this.checkExistingScan(hash);
    if (existingScan && existingScan.status !== 'pending') {
      logger.info({ fileName, hash, status: existingScan.status }, 'Found existing scan result');
      return existingScan;
    }

    // Upload for new scan
    const analysisId = await this.uploadForScan(fileData, fileName);
    if (!analysisId) {
      return {
        success: false,
        fileHash: hash,
        isSafe: false,
        status: 'error',
        error: 'Failed to upload file for scanning',
        scannedAt: new Date().toISOString(),
      };
    }

    // If not waiting for result, return pending status
    if (!waitForResult) {
      return {
        success: true,
        fileHash: hash,
        isSafe: false,
        status: 'pending',
        analysisId,
        permalink: `https://www.virustotal.com/gui/file/${hash}`,
        scannedAt: new Date().toISOString(),
      };
    }

    // Poll for result (with timeout)
    const maxAttempts = 30;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const analysisResult = await this.getAnalysisResult(analysisId);
      if (!analysisResult) continue;

      const status = analysisResult.data?.attributes?.status;
      if (status === 'completed') {
        const result = this.parseAnalysisResult(analysisResult, hash);
        logger.info({ fileName, hash, status: result.status }, 'Virus scan completed');
        return result;
      }
    }

    // Timeout - return pending
    return {
      success: true,
      fileHash: hash,
      isSafe: false,
      status: 'pending',
      analysisId,
      error: 'Scan timed out - check back later',
      permalink: `https://www.virustotal.com/gui/file/${hash}`,
      scannedAt: new Date().toISOString(),
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
   * @example
   * ```typescript
   * const result = await virusTotal.validateFile(buffer, 'doc.pdf', 'application/pdf');
   * if (!result.isValid) {
   *   console.log('Validation failed:', result.errors);
   * }
   * ```
   *
   * @compliance NIST 800-53 SI-10 (Information Input Validation)
   */
  async validateFile(
    fileData: ArrayBuffer | Uint8Array,
    fileName: string,
    mimeType: string,
    skipVirusScan = false,
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const hash = this.calculateHash(fileData);
    const fileSize = fileData.byteLength;

    // File type validation
    const fileTypeValid = ALLOWED_MIME_TYPES.includes(mimeType as any);
    if (!fileTypeValid) {
      errors.push(`File type '${mimeType}' is not allowed`);
    }

    // File size validation
    const fileSizeValid = fileSize <= MAX_FILE_SIZE;
    if (!fileSizeValid) {
      errors.push(`File size ${(fileSize / (1024 * 1024)).toFixed(2)} MB exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)} MB`);
    }

    // Virus scan (if enabled and file type is valid)
    let virusScan: VirusTotalScanResult | null = null;
    if (!skipVirusScan && fileTypeValid && fileSizeValid) {
      virusScan = await this.scanFile(fileData, fileName);
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

  /**
   * Get scan status for a previously scanned file
   *
   * @param hash - SHA-256 hash of the file
   * @returns Current scan status
   */
  async getScanStatus(hash: string): Promise<VirusTotalScanResult | null> {
    return this.checkExistingScan(hash);
  }
}

/**
 * Singleton instance of the VirusTotal service
 *
 * @constant
 * @type {VirusTotalService}
 */
export const virusTotalService = new VirusTotalService();
