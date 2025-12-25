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
});

/**
 * Auth response schema (login/register)
 */
const AuthResponseSchema = S.Struct({
  token: S.String.pipe(S.minLength(1)),
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
  foiaUrl: S.NullOr(S.String),
  foiaPhone: S.NullOr(S.String),
  foiaPortalUrl: S.NullOr(S.String),
  description: S.NullOr(S.String),
  category: S.NullOr(S.String),
  processingTimeAvg: S.NullOr(S.Number),
  isActive: S.Boolean,
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Template schema for template responses
 */
const TemplateSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  userId: S.String.pipe(S.minLength(1)),
  name: S.String.pipe(S.minLength(1)),
  description: S.NullOr(S.String),
  category: S.String,
  content: S.String,
  tags: S.optional(S.Array(S.String)),
  isPublic: S.Boolean,
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
  'appealed',
  'closed',
);

/**
 * FOIA Request schema
 * @compliance NIST 800-53 AU-3 (Content of Audit Records)
 */
const FoiaRequestSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  userId: S.String.pipe(S.minLength(1)),
  agencyId: S.String.pipe(S.minLength(1)),
  templateId: S.NullOr(S.String),
  agency: S.optional(AgencySchema),
  title: S.optional(S.String),
  subject: S.String,
  description: S.optional(S.String),
  requestBody: S.String,
  category: S.optional(S.String),
  dateRange: S.optional(S.String),
  specificIndividuals: S.optional(S.String),
  trackingNumber: S.optional(S.String),
  status: RequestStatusSchema,
  referenceNumber: S.NullOr(S.String),
  submittedAt: S.NullOr(S.String),
  acknowledgedAt: S.NullOr(S.String),
  dueDate: S.NullOr(S.String),
  closedAt: S.NullOr(S.String),
  responseDeadline: S.NullOr(S.String),
  fees: S.NullOr(S.String),
  estimatedFee: S.NullOr(S.Number),
  actualFee: S.NullOr(S.Number),
  feeWaiverRequested: S.optional(S.Boolean),
  expeditedProcessing: S.optional(S.Boolean),
  notes: S.NullOr(S.String),
  attachments: S.optional(S.Array(S.String)),
  createdAt: S.String,
  updatedAt: S.String,
});

/**
 * Session schema for session management
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
const SessionSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  deviceName: S.NullOr(S.String),
  device: S.optional(S.String),
  ipAddress: S.NullOr(S.String),
  lastActiveAt: S.NullOr(S.String),
  lastActive: S.optional(S.String),
  createdAt: S.String,
  isCurrent: S.Boolean,
});

/**
 * MFA status schema
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
const MFAStatusSchema = S.Struct({
  enabled: S.Boolean,
  method: S.optional(S.String),
});

/**
 * MFA setup response schema
 */
const MFASetupResponseSchema = S.Struct({
  secret: S.String.pipe(S.minLength(1)),
  qrCode: S.String.pipe(S.minLength(1)),
  qrCodeUrl: S.optional(S.String),
  backupCodes: S.Array(S.String),
});

/**
 * API Key schema
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
const ApiKeySchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  key: S.optional(S.String),
  keyPreview: S.String,
  name: S.String,
  createdAt: S.String,
  lastUsedAt: S.NullOr(S.String),
});

/**
 * Simple message response schema
 */
const MessageResponseSchema = S.Struct({
  message: S.String,
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
  effect: Effect.Effect<T, FetcherError | FetcherValidationError, HttpClient.HttpClient>,
  schema?: S.Schema<T, I>,
): Promise<ApiResponse<T>> {
  const program = pipe(effect, Effect.provide(HttpClientLive));
  const result = await Effect.runPromiseExit(program);

  if (result._tag === 'Success') {
    const data = result.value;

    // Validate response data if schema is provided
    if (schema) {
      const decoded = S.decodeUnknownEither(schema)(data);
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

    return { success: true, data };
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
      get<User>(`${this.baseUrl}/auth/profile`, { headers: getAuthHeaders() }),
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
    subject?: string;
    requestBody?: string;
    templateId?: string;
    title?: string;
    description?: string;
    category?: string;
    dateRange?: string;
    specificIndividuals?: string;
    expeditedProcessing?: boolean;
    feeWaiverRequested?: boolean;
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
      subject: string;
      requestBody: string;
      status: FoiaRequest['status'];
      notes: string;
    }>,
  ): Promise<ApiResponse<FoiaRequest>> {
    return runEffect(
      patch<FoiaRequest>(`${this.baseUrl}/requests/${id}`, data, { headers: getAuthHeaders() }),
      FoiaRequestSchema,
    );
  }

  /**
   * Delete a FOIA request
   * @compliance NIST 800-53 AU-3 (Content of Audit Records)
   */
  async deleteRequest(id: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      del<{ message: string }>(`${this.baseUrl}/requests/${id}`, { headers: getAuthHeaders() }),
      MessageResponseSchema,
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
    description?: string;
    category: string;
    content: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<ApiResponse<Template>> {
    return runEffect(
      post<Template>(`${this.baseUrl}/templates`, data, { headers: getAuthHeaders() }),
      TemplateSchema,
    );
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      content: string;
      tags: string[];
      isPublic: boolean;
    }>,
  ): Promise<ApiResponse<Template>> {
    return runEffect(
      patch<Template>(`${this.baseUrl}/templates/${id}`, data, { headers: getAuthHeaders() }),
      TemplateSchema,
    );
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
    return runEffect(
      del<{ message: string }>(`${this.baseUrl}/templates/${id}`, { headers: getAuthHeaders() }),
      MessageResponseSchema,
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
      patch<User>(`${this.baseUrl}/auth/profile`, data, { headers: getAuthHeaders() }),
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
}

export const api = new ApiClient();
