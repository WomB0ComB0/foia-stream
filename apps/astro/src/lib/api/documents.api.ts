/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Documents API Client
 * @module lib/api/documents.api
 * @description Document management API using Effect-based fetcher pattern.
 *              Replaces vanilla fetch with structured, type-safe HTTP client.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */

import { del, get, post } from '@foia-stream/shared';
import { Schema as S } from 'effect';

import { API_BASE } from '../config';

import { type ApiResponse, getAuthHeaders, runEffect } from './utils';

export type { ApiResponse } from './utils';

// ============================================
// Schemas
// ============================================

const DocumentStatusSchema = S.Literal(
  'pending_scan',
  'scanning',
  'clean',
  'infected',
  'scan_failed',
  'redacted',
  'archived',
);

const DocumentSchema = S.mutable(
  S.Struct({
    id: S.String,
    originalFileName: S.String,
    fileSize: S.Number,
    mimeType: S.String,
    status: DocumentStatusSchema,
    requiresMfa: S.Boolean,
    hasPassword: S.Boolean,
    expiresAt: S.NullOr(S.String),
    accessCount: S.Number,
    lastAccessedAt: S.NullOr(S.String),
    createdAt: S.String,
  }),
);

export type Document = S.Schema.Type<typeof DocumentSchema>;

const RedactionPatternSchema = S.mutable(
  S.Struct({
    id: S.String,
    name: S.String,
    sensitivity: S.String,
  }),
);

const RedactionTemplateSchema = S.mutable(
  S.Struct({
    id: S.String,
    name: S.String,
    description: S.String,
    category: S.String,
    patterns: S.Array(RedactionPatternSchema),
    disclaimer: S.String,
  }),
);

export type RedactionTemplate = S.Schema.Type<typeof RedactionTemplateSchema>;

const RedactionTemplatesResponseSchema = S.mutable(
  S.Struct({
    system: S.mutable(S.Array(RedactionTemplateSchema)),
  }),
);

const AccessTokenResponseSchema = S.mutable(
  S.Struct({
    accessToken: S.String,
  }),
);

const TextRedactionResultSchema = S.mutable(
  S.Struct({
    redacted: S.String,
  }),
);

// Full redaction pattern schema (for getRedactionPatterns)
const FullRedactionPatternSchema = S.mutable(
  S.Struct({
    id: S.String,
    name: S.String,
    description: S.String,
    pattern: S.String,
    flags: S.optional(S.String),
    category: S.String,
    sensitivity: S.Literal('low', 'medium', 'high', 'critical'),
    enabledByDefault: S.Boolean,
    examples: S.Array(S.String),
    redactionLabel: S.String,
  }),
);

export type FullRedactionPattern = S.Schema.Type<typeof FullRedactionPatternSchema>;

// Document access log entry schema
const DocumentAccessLogSchema = S.mutable(
  S.Struct({
    id: S.String,
    documentId: S.String,
    userId: S.String,
    accessType: S.Literal(
      'view',
      'download',
      'preview_redaction',
      'apply_redaction',
      'share',
      'delete',
    ),
    mfaVerified: S.Boolean,
    ipAddress: S.NullOr(S.String),
    userAgent: S.NullOr(S.String),
    metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
    createdAt: S.String,
  }),
);

export type DocumentAccessLogEntry = S.Schema.Type<typeof DocumentAccessLogSchema>;

// ============================================
// Documents API
// ============================================

/**
 * Documents API client using Effect-based fetcher
 */
export const documentsApi = {
  /**
   * Fetch all documents for the current user
   */
  async getDocuments(): Promise<ApiResponse<Document[]>> {
    const DocumentsListSchema = S.mutable(S.Array(DocumentSchema));
    return runEffect(
      get<Document[]>(`${API_BASE}/documents`, { headers: getAuthHeaders() }),
      DocumentsListSchema,
    );
  },

  /**
   * Fetch redaction templates
   */
  async getRedactionTemplates(): Promise<ApiResponse<{ system: RedactionTemplate[] }>> {
    return runEffect(
      get<{ system: RedactionTemplate[] }>(`${API_BASE}/documents/templates/redaction`, {
        headers: getAuthHeaders(),
      }),
      RedactionTemplatesResponseSchema,
    );
  },

  /**
   * Verify MFA code for document access
   */
  async verifyMfa(documentId: string, code: string): Promise<ApiResponse<{ accessToken: string }>> {
    return runEffect(
      post<{ accessToken: string }>(
        `${API_BASE}/documents/${documentId}/verify-mfa`,
        { code },
        { headers: getAuthHeaders() },
      ),
      AccessTokenResponseSchema,
    );
  },

  /**
   * Verify password for document access
   */
  async verifyPassword(
    documentId: string,
    password: string,
  ): Promise<ApiResponse<{ accessToken: string }>> {
    return runEffect(
      post<{ accessToken: string }>(
        `${API_BASE}/documents/${documentId}/verify-password`,
        { password },
        { headers: getAuthHeaders() },
      ),
      AccessTokenResponseSchema,
    );
  },

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<ApiResponse<Document>> {
    return runEffect(
      get<Document>(`${API_BASE}/documents/${documentId}`, { headers: getAuthHeaders() }),
      DocumentSchema,
    );
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    return runEffect(
      del<void>(`${API_BASE}/documents/${documentId}`, { headers: getAuthHeaders() }),
    );
  },

  /**
   * Get available redaction patterns
   */
  async getRedactionPatterns(): Promise<ApiResponse<FullRedactionPattern[]>> {
    return runEffect(
      get<FullRedactionPattern[]>(`${API_BASE}/documents/templates/redaction/patterns`, {
        headers: getAuthHeaders(),
      }),
      S.mutable(S.Array(FullRedactionPatternSchema)),
    );
  },

  /**
   * Get document access log
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async getDocumentAccessLog(documentId: string): Promise<ApiResponse<DocumentAccessLogEntry[]>> {
    return runEffect(
      get<DocumentAccessLogEntry[]>(`${API_BASE}/documents/${documentId}/access-log`, {
        headers: getAuthHeaders(),
      }),
      S.mutable(S.Array(DocumentAccessLogSchema)),
    );
  },

  /**
   * Redact text using templates
   */
  async redactText(text: string, templateId?: string): Promise<ApiResponse<{ redacted: string }>> {
    return runEffect(
      post<{ redacted: string }>(
        `${API_BASE}/documents/redact-text`,
        { text, templateId },
        { headers: getAuthHeaders() },
      ),
      TextRedactionResultSchema,
    );
  },

  /**
   * Upload a document (uses vanilla fetch for FormData support)
   * The fetcher doesn't support FormData multipart, so we use fetch here
   */
  async uploadDocument(
    file: File,
    options?: {
      requiresMfa?: boolean;
      accessPassword?: string;
      expiresInDays?: number | null;
    },
  ): Promise<ApiResponse<Document>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (options && Object.keys(options).length > 0) {
        formData.append('options', JSON.stringify(options));
      }

      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { success: false, error: result.error || 'Upload failed' };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  /**
   * Download a document (returns blob - uses vanilla fetch)
   * Binary downloads aren't supported by the JSON-based fetcher
   */
  async downloadDocument(
    documentId: string,
    accessToken?: string,
  ): Promise<{
    success: boolean;
    blob?: Blob;
    error?: string;
    requiresMfa?: boolean;
    requiresPassword?: boolean;
  }> {
    try {
      const url = new URL(`${API_BASE}/documents/${documentId}/download`);
      if (accessToken) {
        url.searchParams.set('accessToken', accessToken);
      }

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const result = await response.json();
        return {
          success: false,
          error: result.error || 'Download failed',
          requiresMfa: result.requiresMfa,
          requiresPassword: result.requiresPassword,
        };
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  },
};

// ============================================
// Redaction API
// ============================================

/**
 * Redaction API client for PDF operations
 */
export const redactionApi = {
  /**
   * Get redaction info for a document
   */
  async getRedactionInfo(
    documentId: string,
  ): Promise<ApiResponse<{ patterns: unknown[]; suggestions: unknown[] }>> {
    return runEffect(
      post<{ patterns: unknown[]; suggestions: unknown[] }>(
        `${API_BASE}/redaction/info`,
        { documentId },
        { headers: getAuthHeaders() },
      ),
    );
  },

  /**
   * Preview redactions on a document
   */
  async previewRedaction(data: {
    documentId: string;
    patterns: string[];
    customRedactions?: unknown[];
  }): Promise<ApiResponse<{ previewUrl: string; matchCount: number }>> {
    return runEffect(
      post<{ previewUrl: string; matchCount: number }>(`${API_BASE}/redaction/preview`, data, {
        headers: getAuthHeaders(),
      }),
    );
  },

  /**
   * Apply redactions to a document (returns blob - uses vanilla fetch)
   */
  async applyRedaction(data: {
    documentId: string;
    patterns: string[];
    customRedactions?: unknown[];
  }): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/redaction/apply`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Redaction failed' };
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redaction failed',
      };
    }
  },
};
