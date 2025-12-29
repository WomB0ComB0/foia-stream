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
 * @file API client for FOIA Stream application with Effect Schema validation
 * @module api
 * @author FOIA Stream Team
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */

import { FetchHttpClient, type HttpClient } from '@effect/platform';
import { del, FetcherError, FetcherValidationError, get, patch, post } from '@foia-stream/shared';
import { Effect, ParseResult, pipe, Schema as S } from 'effect';

import { API_BASE } from './config';

// ============================================
// Effect Schema Definitions for API Responses
// ============================================

/**
 * Pagination schema for paginated API responses
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
const PaginationSchema = S.Struct({
  page: S.Number.pipe(S.int(), S.positive()),
  limit: S.Number.pipe(S.int(), S.positive()),
  total: S.Number.pipe(S.int(), S.nonNegative()),
  totalPages: S.Number.pipe(S.int(), S.nonNegative()),
});

/**
 * Generic API response wrapper schema (available for future use)
 * @template T Schema for the data payload
 */
const _ApiResponseSchema = <T, I, R>(dataSchema: S.Schema<T, I, R>) =>
  S.Struct({
    success: S.Boolean,
    data: S.optional(dataSchema),
    error: S.optional(S.String),
    message: S.optional(S.String),
    pagination: S.optional(PaginationSchema),
  });

/**
 * User role enum schema
 */
const UserRoleSchema = S.Literal(
  'civilian',
  'journalist',
  'researcher',
  'attorney',
  'community_advocate',
  'agency_official',
  'admin',
);

/**
 * User schema for profile responses
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 */
const UserSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  email: S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  role: UserRoleSchema,
  firstName: S.String,
  lastName: S.String,
  organization: S.NullOr(S.String),
  isVerified: S.Boolean,
  isAnonymous: S.Boolean,
  createdAt: S.String,
  updatedAt: S.optional(S.String),
});

/**
 * Auth response schema (login/register)
 * Note: token can be empty string when requiresMFA is true
 */
const AuthResponseSchema = S.Struct({
  token: S.String,
  user: UserSchema,
  requiresMFA: S.optional(S.Boolean),
  mfaToken: S.optional(S.String),
});

/**
 * MFA token response schema
 */
const MFATokenResponseSchema = S.Struct({
  token: S.String.pipe(S.minLength(1)),
});

/**
 * Jurisdiction level enum schema
 */
const JurisdictionLevelSchema = S.Literal('federal', 'state', 'local', 'county');

/**
 * Agency schema for agency responses
 */
const AgencySchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1)),
  abbreviation: S.String,
  jurisdictionLevel: JurisdictionLevelSchema,
  state: S.NullOr(S.String),
  city: S.NullOr(S.String),
  county: S.NullOr(S.String),
  foiaEmail: S.NullOr(S.String),
  foiaAddress: S.NullOr(S.String),
  foiaPortalUrl: S.NullOr(S.String),
  responseDeadlineDays: S.Number,
  appealDeadlineDays: S.Number,
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Template schema for template responses
 */
const TemplateSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1)),
  category: S.String,
  description: S.String,
  templateText: S.String,
  jurisdictionLevel: S.optional(S.NullOr(S.String)),
  createdBy: S.String,
  isOfficial: S.Boolean,
  usageCount: S.Number.pipe(S.int(), S.nonNegative()),
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Request status enum schema
 */
const RequestStatusSchema = S.Literal(
  'draft',
  'submitted',
  'acknowledged',
  'processing',
  'fulfilled',
  'partially_fulfilled',
  'denied',
  'appealed',
  'appeal_pending',
  'appeal_granted',
  'appeal_denied',
  'withdrawn',
);

/**
 * Record category enum schema
 */
const RecordCategorySchema = S.Literal(
  'body_cam_footage',
  'incident_report',
  'arrest_record',
  'use_of_force_report',
  'policy_document',
  'budget_record',
  'contract',
  'complaint_record',
  'training_material',
  'personnel_record',
  'communication',
  'other',
);

/**
 * FOIA Request schema
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const FoiaRequestSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  userId: S.String.pipe(S.minLength(1)),
  agencyId: S.String.pipe(S.minLength(1)),
  status: RequestStatusSchema,
  category: RecordCategorySchema,
  title: S.String,
  description: S.String,
  dateRangeStart: S.optional(S.NullOr(S.String)),
  dateRangeEnd: S.optional(S.NullOr(S.String)),
  templateId: S.optional(S.NullOr(S.String)),
  trackingNumber: S.optional(S.NullOr(S.String)),
  estimatedFee: S.optional(S.NullOr(S.Number)),
  actualFee: S.optional(S.NullOr(S.Number)),
  submittedAt: S.optional(S.NullOr(S.String)),
  acknowledgedAt: S.optional(S.NullOr(S.String)),
  dueDate: S.optional(S.NullOr(S.String)),
  completedAt: S.optional(S.NullOr(S.String)),
  denialReason: S.optional(S.NullOr(S.String)),
  isPublic: S.Boolean,
  createdAt: S.String,
  updatedAt: S.String,
  agency: S.optional(
    S.Struct({
      id: S.String,
      name: S.String,
      abbreviation: S.optional(S.NullOr(S.String)),
      jurisdictionLevel: S.String,
    }),
  ),
});

/**
 * Session schema for session management
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
const SessionSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  deviceName: S.NullOr(S.String),
  ipAddress: S.NullOr(S.String),
  lastActiveAt: S.NullOr(S.String),
  createdAt: S.String,
  isCurrent: S.Boolean,
});

/**
 * MFA status schema
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
const MFAStatusSchema = S.Struct({
  enabled: S.Boolean,
  backupCodesRemaining: S.optional(S.Number),
});

/**
 * MFA setup response schema
 */
const MFASetupResponseSchema = S.Struct({
  secret: S.String.pipe(S.minLength(1)),
  qrCodeUrl: S.String.pipe(S.minLength(1)),
  backupCodes: S.Array(S.String),
});

/**
 * API Key schema
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
const ApiKeySchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  key: S.optional(S.String),
  keyPreview: S.optional(S.String),
  name: S.String,
  createdAt: S.String,
  lastUsedAt: S.optional(S.NullOr(S.String)),
});

/**
 * Simple message response schema
 */
const MessageResponseSchema = S.Struct({
  message: S.String,
});

// ============================================
// Document Management Schemas
// ============================================

/**
 * Document status enum schema
 */
const DocumentStatusSchema = S.Literal(
  'pending_scan',
  'scanning',
  'clean',
  'infected',
  'scan_failed',
  'redacted',
  'archived',
);

/**
 * Secure document schema
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 */
const SecureDocumentSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
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
  updatedAt: S.optional(S.String),
});

/**
 * Virus scan result schema
 */
const VirusScanResultSchema = S.Struct({
  scannedAt: S.optional(S.String),
  isSafe: S.optional(S.Boolean),
  status: S.optional(S.String),
  analysisId: S.optional(S.String),
  permalink: S.optional(S.String),
});

/**
 * Redaction pattern schema
 */
const RedactionPatternSchema = S.Struct({
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
});

/**
 * Redaction template schema
 */
const RedactionTemplateSchema = S.Struct({
  id: S.String,
  name: S.String,
  description: S.String,
  category: S.String,
  patterns: S.Array(RedactionPatternSchema),
  isSystem: S.Boolean,
  disclaimer: S.String,
  version: S.String,
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Custom redaction template schema
 */
const CustomRedactionTemplateSchema = S.Struct({
  id: S.String,
  userId: S.String,
  name: S.String,
  description: S.NullOr(S.String),
  category: S.String,
  patterns: S.Array(
    S.Struct({
      id: S.String,
      name: S.String,
      pattern: S.String,
      flags: S.optional(S.String),
      sensitivity: S.Literal('low', 'medium', 'high', 'critical'),
      redactionLabel: S.String,
    }),
  ),
  isShared: S.Boolean,
  usageCount: S.Number,
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Redaction templates response schema
 */
const RedactionTemplatesResponseSchema = S.Struct({
  system: S.Array(RedactionTemplateSchema),
  custom: S.Array(CustomRedactionTemplateSchema),
  disclaimer: S.String,
});

/**
 * Pattern match schema
 */
const PatternMatchSchema = S.Struct({
  patternId: S.String,
  patternName: S.String,
  matchedText: S.String,
  startIndex: S.Number,
  endIndex: S.Number,
  sensitivity: S.Literal('low', 'medium', 'high', 'critical'),
  redactionLabel: S.String,
});

/**
 * Text redaction result schema
 */
const TextRedactionResultSchema = S.Struct({
  original: S.String,
  redacted: S.String,
  hasChanges: S.Boolean,
  matches: S.Array(PatternMatchSchema),
  matchesByPattern: S.Record({ key: S.String, value: S.Array(PatternMatchSchema) }),
  matchesBySensitivity: S.Record({ key: S.String, value: S.Array(PatternMatchSchema) }),
  disclaimer: S.String,
});

/**
 * Document access log entry schema
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const DocumentAccessLogSchema = S.Struct({
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
});

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: S.Schema.Type<typeof PaginationSchema>;
};

export type User = S.Schema.Type<typeof UserSchema>;
export type AuthResponse = S.Schema.Type<typeof AuthResponseSchema>;
export type Agency = S.Schema.Type<typeof AgencySchema>;
export type Template = S.Schema.Type<typeof TemplateSchema>;
export type FoiaRequest = S.Schema.Type<typeof FoiaRequestSchema>;
export type Session = S.Schema.Type<typeof SessionSchema>;
export type MFAStatus = S.Schema.Type<typeof MFAStatusSchema>;
export type MFASetupResponse = S.Schema.Type<typeof MFASetupResponseSchema>;
export type ApiKey = S.Schema.Type<typeof ApiKeySchema>;

// Document Management Types
export type SecureDocument = S.Schema.Type<typeof SecureDocumentSchema>;
export type VirusScanResult = S.Schema.Type<typeof VirusScanResultSchema>;
export type RedactionPattern = S.Schema.Type<typeof RedactionPatternSchema>;
export type RedactionTemplate = S.Schema.Type<typeof RedactionTemplateSchema>;
export type CustomRedactionTemplate = S.Schema.Type<typeof CustomRedactionTemplateSchema>;
export type RedactionTemplatesResponse = S.Schema.Type<typeof RedactionTemplatesResponseSchema>;
export type PatternMatch = S.Schema.Type<typeof PatternMatchSchema>;
export type TextRedactionResult = S.Schema.Type<typeof TextRedactionResultSchema>;
export type DocumentAccessLogEntry = S.Schema.Type<typeof DocumentAccessLogSchema>;

const HttpClientLive = FetchHttpClient.layer;

/**
 * Retrieves the authentication token from local storage
 * @returns The auth token or null if not found
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Builds authorization headers with the current token
 * @returns Headers object with Authorization if token exists
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality)
 */
function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Executes an Effect with schema validation and returns an ApiResponse
 * @template T The expected type of the response data
 * @param effect The Effect to execute
 * @param schema Optional Effect Schema for runtime validation
 * @returns ApiResponse with validated data or error
 * @compliance NIST 800-53 SI-10 (Information Input Validation)
 */
async function runEffect<T, I = T>(
  effect: Effect.Effect<unknown, FetcherError | FetcherValidationError, HttpClient.HttpClient>,
  schema?: S.Schema<T, I>,
): Promise<ApiResponse<T>> {
  const program = pipe(effect, Effect.provide(HttpClientLive));
  const result = await Effect.runPromiseExit(program);

  if (result._tag === 'Success') {
    const response = result.value as Record<string, unknown>;
    console.log('[API] runEffect success:', response);

    // Handle standard API envelope
    if (response && typeof response === 'object' && 'success' in response) {
      if (!response.success) {
        console.error('[API] Response success=false:', response);
        return {
          success: false,
          error: (response.error as string) || (response.message as string) || 'Unknown error',
          message: response.message as string | undefined,
        };
      }

      // Some endpoints return data in `data` field, others return message at top level
      const innerData =
        response.data !== undefined
          ? response.data
          : response.message !== undefined
            ? { message: response.message }
            : undefined;

      // Validate inner data if schema is provided
      if (schema) {
        const decoded = S.decodeUnknownEither(schema)(innerData);
        if (decoded._tag === 'Left') {
          const errors = ParseResult.TreeFormatter.formatIssueSync(decoded.left.issue);
          console.error('[API] Response validation failed:', errors, innerData);
          return {
            success: false,
            error: `Response validation failed: ${errors}`,
          };
        }
        return { success: true, data: decoded.right } as ApiResponse<T>;
      }

      return { success: response.success as boolean, data: response.data as T } as ApiResponse<T>;
    }

    // Fallback for non-envelope responses
    // Validate response data if schema is provided
    if (schema) {
      const decoded = S.decodeUnknownEither(schema)(response);
      if (decoded._tag === 'Left') {
        const errors = ParseResult.TreeFormatter.formatIssueSync(decoded.left.issue);
        console.error('[API] Response validation failed:', errors);
        return {
          success: false,
          error: `Response validation failed: ${errors}`,
        };
      }
      return { success: true, data: decoded.right };
    }

    return { success: true, data: response as T };
  }

  const error = result.cause;
  let errorMessage = 'An unexpected error occurred';

  if (error._tag === 'Fail') {
    const failError = error.error;
    if (failError instanceof FetcherError) {
      errorMessage = failError.message;
    } else if (failError instanceof FetcherValidationError) {
      errorMessage = failError.message;
    }
  }

  return { success: false, error: errorMessage };
}

/**
 * API client class for FOIA Stream application
 * @compliance NIST 800-53 SC-8 (Transmission Confidentiality)
 */
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  /**
   * Register a new user account
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organization?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return runEffect(post<AuthResponse>(`${this.baseUrl}/auth/register`, data), AuthResponseSchema);
  }

  /**
   * Login with email and password
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return runEffect(
      post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password }),
      AuthResponseSchema,
    );
  }

  /**
   * Verify MFA code during login
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async verifyMFALogin(mfaToken: string, code: string): Promise<ApiResponse<{ token: string }>> {
    return runEffect(
      post<{ token: string }>(`${this.baseUrl}/auth/login/mfa`, { mfaToken, code }),
      MFATokenResponseSchema,
    );
  }

  /**
   * Logout and invalidate the current session
   * @compliance NIST 800-53 AC-12 (Session Termination)
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(`${this.baseUrl}/auth/logout`, {}, { headers: getAuthHeaders() }),
      MessageResponseSchema,
    );
  }

  /**
   * Get the current user's profile
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async getProfile(): Promise<ApiResponse<User>> {
    return runEffect(
      get<User>(`${this.baseUrl}/auth/me`, { headers: getAuthHeaders() }),
      UserSchema,
    );
  }

  /**
   * Refresh the authentication token
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    return runEffect(
      post<AuthResponse>(`${this.baseUrl}/auth/refresh`, {}, { headers: getAuthHeaders() }),
      AuthResponseSchema,
    );
  }

  /**
   * Get FOIA requests with optional filtering
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async getRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    agencyId?: string;
  }): Promise<ApiResponse<FoiaRequest[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.agencyId) searchParams.set('agencyId', params.agencyId);

    const queryString = searchParams.toString();
    const url = queryString
      ? `${this.baseUrl}/requests?${queryString}`
      : `${this.baseUrl}/requests`;

    return runEffect(
      get<FoiaRequest[]>(url, { headers: getAuthHeaders() }),
      S.mutable(S.Array(FoiaRequestSchema)),
    );
  }

  /**
   * Get a single FOIA request by ID
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async getRequest(id: string): Promise<ApiResponse<FoiaRequest>> {
    return runEffect(
      get<FoiaRequest>(`${this.baseUrl}/requests/${id}`, { headers: getAuthHeaders() }),
      FoiaRequestSchema,
    );
  }

  /**
   * Create a new FOIA request
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async createRequest(data: {
    agencyId: string;
    category: string;
    title: string;
    description: string;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    templateId?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<FoiaRequest>> {
    return runEffect(
      post<FoiaRequest>(`${this.baseUrl}/requests`, data, { headers: getAuthHeaders() }),
      FoiaRequestSchema,
    );
  }

  /**
   * Update an existing FOIA request
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async updateRequest(
    id: string,
    data: Partial<{
      status: FoiaRequest['status'];
      trackingNumber: string;
      estimatedFee: number;
      actualFee: number;
      dueDate: string;
      denialReason: string;
      isPublic: boolean;
    }>,
  ): Promise<ApiResponse<FoiaRequest>> {
    return runEffect(
      patch<FoiaRequest>(`${this.baseUrl}/requests/${id}`, data, { headers: getAuthHeaders() }),
      FoiaRequestSchema,
    );
  }

  /**
   * Withdraw a FOIA request
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async withdrawRequest(id: string): Promise<ApiResponse<FoiaRequest>> {
    return runEffect(
      post<FoiaRequest>(
        `${this.baseUrl}/requests/${id}/withdraw`,
        {},
        { headers: getAuthHeaders() },
      ),
      FoiaRequestSchema,
    );
  }

  /**
   * Submit a FOIA request to the agency
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async submitRequest(id: string): Promise<ApiResponse<FoiaRequest>> {
    return runEffect(
      post<FoiaRequest>(`${this.baseUrl}/requests/${id}/submit`, {}, { headers: getAuthHeaders() }),
      FoiaRequestSchema,
    );
  }

  /**
   * Get agencies with optional filtering
   */
  async getAgencies(params?: {
    page?: number;
    limit?: number;
    jurisdictionLevel?: string;
    state?: string;
    search?: string;
  }): Promise<ApiResponse<Agency[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.jurisdictionLevel) searchParams.set('jurisdictionLevel', params.jurisdictionLevel);
    if (params?.state) searchParams.set('state', params.state);
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const url = queryString
      ? `${this.baseUrl}/agencies?${queryString}`
      : `${this.baseUrl}/agencies`;

    return runEffect(
      get<Agency[]>(url, { headers: getAuthHeaders() }),
      S.mutable(S.Array(AgencySchema)),
    );
  }

  /**
   * Get a single agency by ID
   */
  async getAgency(id: string): Promise<ApiResponse<Agency>> {
    return runEffect(
      get<Agency>(`${this.baseUrl}/agencies/${id}`, { headers: getAuthHeaders() }),
      AgencySchema,
    );
  }

  /**
   * Search agencies by query string
   */
  async searchAgencies(query: string): Promise<ApiResponse<Agency[]>> {
    return runEffect(
      get<Agency[]>(`${this.baseUrl}/agencies?search=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
      }),
      S.mutable(S.Array(AgencySchema)),
    );
  }

  /**
   * Get templates with optional filtering
   */
  async getTemplates(params?: {
    page?: number;
    limit?: number;
    category?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<Template[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.isPublic !== undefined) searchParams.set('isPublic', params.isPublic.toString());

    const queryString = searchParams.toString();
    const url = queryString
      ? `${this.baseUrl}/templates?${queryString}`
      : `${this.baseUrl}/templates`;

    return runEffect(
      get<Template[]>(url, { headers: getAuthHeaders() }),
      S.mutable(S.Array(TemplateSchema)),
    );
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<Template>> {
    return runEffect(
      get<Template>(`${this.baseUrl}/templates/${id}`, { headers: getAuthHeaders() }),
      TemplateSchema,
    );
  }

  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    category: string;
    description: string;
    templateText: string;
    jurisdictionLevel?: string;
    isOfficial?: boolean;
  }): Promise<ApiResponse<Template>> {
    return runEffect(
      post<Template>(`${this.baseUrl}/templates`, data, { headers: getAuthHeaders() }),
      TemplateSchema,
    );
  }

  /**
   * Update user profile
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    organization?: string;
  }): Promise<ApiResponse<User>> {
    return runEffect(
      patch<User>(`${this.baseUrl}/auth/me`, data, { headers: getAuthHeaders() }),
      UserSchema,
    );
  }

  /**
   * Change user password
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(
        `${this.baseUrl}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: getAuthHeaders() },
      ),
      MessageResponseSchema,
    );
  }

  /**
   * Request password reset email
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(`${this.baseUrl}/auth/forgot-password`, { email }),
      MessageResponseSchema,
    );
  }

  /**
   * Reset password with token
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(`${this.baseUrl}/auth/reset-password`, data),
      MessageResponseSchema,
    );
  }

  /**
   * Verify email address
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(`${this.baseUrl}/auth/verify-email`, { token }),
      MessageResponseSchema,
    );
  }

  /**
   * Resend verification email
   * @compliance NIST 800-53 IA-2 (Identification and Authentication)
   */
  async resendVerificationEmail(): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(
        `${this.baseUrl}/auth/resend-verification`,
        {},
        { headers: getAuthHeaders() },
      ),
      MessageResponseSchema,
    );
  }

  /**
   * Get MFA status
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async getMFAStatus(): Promise<ApiResponse<MFAStatus>> {
    return runEffect(
      get<MFAStatus>(`${this.baseUrl}/auth/mfa/status`, { headers: getAuthHeaders() }),
      MFAStatusSchema,
    );
  }

  /**
   * Setup MFA for the account
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async setupMFA(password: string): Promise<ApiResponse<MFASetupResponse>> {
    return runEffect(
      post<MFASetupResponse>(
        `${this.baseUrl}/auth/mfa/setup`,
        { password },
        { headers: getAuthHeaders() },
      ),
      MFASetupResponseSchema,
    );
  }

  /**
   * Verify MFA code
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async verifyMFA(code: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(
        `${this.baseUrl}/auth/mfa/verify`,
        { code },
        { headers: getAuthHeaders() },
      ),
      MessageResponseSchema,
    );
  }

  /**
   * Disable MFA for the account
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async disableMFA(password: string, code: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(
        `${this.baseUrl}/auth/mfa/disable`,
        { password, code },
        { headers: getAuthHeaders() },
      ),
      MessageResponseSchema,
    );
  }

  /**
   * Regenerate MFA backup codes
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async regenerateBackupCodes(
    password: string,
    code: string,
  ): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return runEffect(
      post<{ backupCodes: string[] }>(
        `${this.baseUrl}/auth/mfa/backup-codes/regenerate`,
        { password, code },
        { headers: getAuthHeaders() },
      ),
      S.Struct({ backupCodes: S.mutable(S.Array(S.String)) }),
    );
  }

  /**
   * Get all active sessions
   * @compliance NIST 800-53 AC-12 (Session Termination)
   */
  async getSessions(): Promise<ApiResponse<Session[]>> {
    return runEffect(
      get<Session[]>(`${this.baseUrl}/auth/sessions`, { headers: getAuthHeaders() }),
      S.mutable(S.Array(SessionSchema)),
    );
  }

  /**
   * Revoke a specific session
   * @compliance NIST 800-53 AC-12 (Session Termination)
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      del<{ message: string }>(`${this.baseUrl}/auth/sessions/${sessionId}`, {
        headers: getAuthHeaders(),
      }),
      MessageResponseSchema,
    );
  }

  /**
   * Get the current API key
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  async getApiKey(): Promise<ApiResponse<ApiKey | null>> {
    return runEffect(
      get<ApiKey | null>(`${this.baseUrl}/auth/api-key`, { headers: getAuthHeaders() }),
      S.NullOr(ApiKeySchema),
    );
  }

  /**
   * Create a new API key
   * @compliance NIST 800-53 IA-5 (Authenticator Management)
   */
  async createApiKey(password: string, twoFactorCode?: string): Promise<ApiResponse<ApiKey>> {
    return runEffect(
      post<ApiKey>(
        `${this.baseUrl}/auth/api-key`,
        { password, twoFactorCode },
        { headers: getAuthHeaders() },
      ),
      ApiKeySchema,
    );
  }

  /**
   * Delete user account
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async deleteAccount(
    password: string,
    twoFactorCode?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(
        `${this.baseUrl}/auth/delete-account`,
        { password, twoFactorCode },
        { headers: getAuthHeaders() },
      ),
      MessageResponseSchema,
    );
  }

  /**
   * Delete all user data (GDPR compliance)
   * @compliance GDPR Article 17 (Right to Erasure)
   */
  async deleteUserData(
    password: string,
    twoFactorCode?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      post<{ message: string }>(
        `${this.baseUrl}/auth/delete-data`,
        { password, twoFactorCode },
        { headers: getAuthHeaders() },
      ),
      MessageResponseSchema,
    );
  }

  // ============================================
  // Document Management
  // ============================================

  /**
   * Get list of user's documents
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async getDocuments(): Promise<ApiResponse<SecureDocument[]>> {
    return runEffect(
      get<SecureDocument[]>(`${this.baseUrl}/documents`, { headers: getAuthHeaders() }),
      S.mutable(S.Array(SecureDocumentSchema)),
    );
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<ApiResponse<SecureDocument>> {
    return runEffect(
      get<SecureDocument>(`${this.baseUrl}/documents/${id}`, { headers: getAuthHeaders() }),
      SecureDocumentSchema,
    );
  }

  /**
   * Verify MFA for document access
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async verifyDocumentMfa(
    documentId: string,
    code: string,
  ): Promise<ApiResponse<{ accessToken: string; expiresIn: number }>> {
    return runEffect(
      post<{ accessToken: string; expiresIn: number }>(
        `${this.baseUrl}/documents/${documentId}/verify-mfa`,
        { code },
        { headers: getAuthHeaders() },
      ),
      S.Struct({
        accessToken: S.String,
        expiresIn: S.Number,
      }),
    );
  }

  /**
   * Verify password for document access
   */
  async verifyDocumentPassword(
    documentId: string,
    password: string,
  ): Promise<ApiResponse<{ accessToken: string; expiresIn: number }>> {
    return runEffect(
      post<{ accessToken: string; expiresIn: number }>(
        `${this.baseUrl}/documents/${documentId}/verify-password`,
        { password },
        { headers: getAuthHeaders() },
      ),
      S.Struct({
        accessToken: S.String,
        expiresIn: S.Number,
      }),
    );
  }

  /**
   * Get redaction templates
   * @compliance NIST 800-53 MP-6 (Media Sanitization)
   */
  async getRedactionTemplates(): Promise<ApiResponse<RedactionTemplatesResponse>> {
    return runEffect(
      get<RedactionTemplatesResponse>(`${this.baseUrl}/documents/templates/redaction`, {
        headers: getAuthHeaders(),
      }),
      RedactionTemplatesResponseSchema,
    );
  }

  /**
   * Get available redaction patterns
   */
  async getRedactionPatterns(): Promise<ApiResponse<RedactionPattern[]>> {
    return runEffect(
      get<RedactionPattern[]>(`${this.baseUrl}/documents/templates/redaction/patterns`, {
        headers: getAuthHeaders(),
      }),
      S.mutable(S.Array(RedactionPatternSchema)),
    );
  }

  /**
   * Redact sensitive text
   * @compliance NIST 800-53 SI-12 (Information Handling and Retention)
   */
  async redactText(
    text: string,
    templateId?: string,
    patternIds?: string[],
  ): Promise<ApiResponse<TextRedactionResult>> {
    return runEffect(
      post<TextRedactionResult>(
        `${this.baseUrl}/documents/redact-text`,
        { text, templateId, patternIds },
        { headers: getAuthHeaders() },
      ),
      TextRedactionResultSchema,
    );
  }

  /**
   * Delete a document
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async deleteDocument(id: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      del<{ message: string }>(`${this.baseUrl}/documents/${id}`, { headers: getAuthHeaders() }),
      MessageResponseSchema,
    );
  }

  /**
   * Get document access log
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async getDocumentAccessLog(documentId: string): Promise<ApiResponse<DocumentAccessLogEntry[]>> {
    return runEffect(
      get<DocumentAccessLogEntry[]>(`${this.baseUrl}/documents/${documentId}/access-log`, {
        headers: getAuthHeaders(),
      }),
      S.mutable(S.Array(DocumentAccessLogSchema)),
    );
  }
}

export const api = new ApiClient();
