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
 * @file Type Definitions
 * @module types
 * @author FOIA Stream Team
 * @description Central type definitions for the FOIA Stream API.
 *              Defines all interfaces, types, and DTOs used across the application.
 */

// ============================================
// FOIA Stream - Type Definitions
// ============================================

// ============================================
// User Types
// ============================================

/**
 * User role types for role-based access control (RBAC)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export type UserRole =
  | 'civilian'
  | 'journalist'
  | 'researcher'
  | 'attorney'
  | 'community_advocate'
  | 'agency_official'
  | 'admin';

/**
 * User account representation
 * @interface
 */
export interface User {
  /** Unique user identifier (nanoid) */
  id: string;
  /** User's email address (unique) */
  email: string;
  /** Argon2 hashed password */
  passwordHash: string;
  /** User's role for RBAC */
  role: UserRole;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Organization/employer name */
  organization?: string | null;
  /** Email verification status */
  isVerified: boolean;
  /** Whether user is anonymous */
  isAnonymous: boolean;
  /** MFA enabled status */
  twoFactorEnabled: boolean;
  /** Account creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * User session for JWT token management
 * @interface
 */
export interface UserSession {
  /** Session identifier */
  id: string;
  /** Associated user ID */
  userId: string;
  /** JWT token */
  token: string;
  /** Token expiration timestamp */
  expiresAt: string;
  /** Session creation timestamp */
  createdAt: string;
}

// ============================================
// Agency Types
// ============================================

/**
 * Government agency jurisdiction levels
 */
export type JurisdictionLevel = 'federal' | 'state' | 'local' | 'county';

/**
 * Government agency that can receive FOIA requests
 * @interface
 */
export interface Agency {
  /** Agency identifier */
  id: string;
  /** Official agency name */
  name: string;
  /** Common abbreviation (e.g., FBI, DOJ) */
  abbreviation: string;
  /** Jurisdiction level */
  jurisdictionLevel: JurisdictionLevel;
  /** State code for state/local agencies */
  state?: string | null;
  /** City name for local agencies */
  city?: string | null;
  /** County name for county agencies */
  county?: string | null;
  /** FOIA request email address */
  foiaEmail?: string | null;
  /** FOIA request mailing address */
  foiaAddress?: string | null;
  /** Online FOIA portal URL */
  foiaPortalUrl?: string | null;
  /** Days allowed for initial response */
  responseDeadlineDays: number;
  /** Days allowed to file appeal */
  appealDeadlineDays: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

// ============================================
// FOIA Request Types
// ============================================

/**
 * FOIA request lifecycle status
 */
export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'processing'
  | 'fulfilled'
  | 'partially_fulfilled'
  | 'denied'
  | 'appealed'
  | 'appeal_pending'
  | 'appeal_granted'
  | 'appeal_denied'
  | 'withdrawn';

export type RecordCategory =
  | 'body_cam_footage'
  | 'incident_report'
  | 'arrest_record'
  | 'use_of_force_report'
  | 'policy_document'
  | 'budget_record'
  | 'contract'
  | 'complaint_record'
  | 'training_material'
  | 'personnel_record'
  | 'communication'
  | 'other';

export interface FOIARequest {
  id: string;
  userId: string;
  agencyId: string;
  status: RequestStatus;
  category: RecordCategory;
  title: string;
  description: string;
  dateRangeStart?: string | null;
  dateRangeEnd?: string | null;
  templateId?: string | null;
  trackingNumber?: string | null;
  estimatedFee?: number | null;
  actualFee?: number | null;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  denialReason?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestTemplate {
  id: string;
  name: string;
  category: RecordCategory;
  description: string;
  templateText: string;
  jurisdictionLevel?: JurisdictionLevel | null;
  createdBy: string;
  isOfficial: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Document Types
export type DocumentType =
  | 'body_cam_video'
  | 'pdf'
  | 'image'
  | 'audio'
  | 'spreadsheet'
  | 'text'
  | 'other';

export interface Document {
  id: string;
  requestId?: string | null;
  agencyId: string;
  uploadedBy: string;
  type: DocumentType;
  title: string;
  description?: string | null;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  isRedacted: boolean;
  isPublic: boolean;
  transcript?: string | null;
  metadata: DocumentMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMetadata {
  date?: string;
  location?: string;
  officerIds?: string[];
  incidentNumber?: string;
  duration?: number; // for videos/audio in seconds
  tags?: string[];
}

// Comment and Review Types
export type CommentType =
  | 'general'
  | 'misconduct_flag'
  | 'positive_interaction'
  | 'training_issue'
  | 'policy_violation'
  | 'context';

export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  type: CommentType;
  content: string;
  timestamp?: number | null; // for video comments - seconds into video
  isAnonymous: boolean;
  upvotes: number;
  downvotes: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Appeal Types
export interface Appeal {
  id: string;
  requestId: string;
  userId: string;
  grounds: string;
  submittedAt: string;
  status: 'pending' | 'granted' | 'denied' | 'partial';
  responseAt?: string | null;
  responseText?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Audit Log Types
export type AuditAction =
  | 'user_created'
  | 'user_login'
  | 'user_logout'
  | 'request_created'
  | 'request_submitted'
  | 'request_updated'
  | 'document_uploaded'
  | 'document_viewed'
  | 'document_downloaded'
  | 'comment_created'
  | 'appeal_filed'
  | 'admin_action';

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

// Statistics Types
export interface AgencyStats {
  agencyId: string;
  totalRequests: number;
  pendingRequests: number;
  fulfilledRequests: number;
  deniedRequests: number;
  appealedRequests: number;
  averageResponseDays: number;
  complianceRate: number;
  lastUpdated: string;
}

export interface UseOfForceStats {
  agencyId: string;
  year: number;
  totalIncidents: number;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  officerInvolvedShootings: number;
  complaints: number;
  sustainedComplaints: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// Request/Response DTOs
export interface CreateUserDTO {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  organization?: string;
  isAnonymous?: boolean;
}

export interface CreateRequestDTO {
  agencyId: string;
  category: RecordCategory;
  title: string;
  description: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  templateId?: string;
  isPublic?: boolean;
}

export interface UpdateRequestDTO {
  status?: RequestStatus;
  trackingNumber?: string;
  estimatedFee?: number;
  actualFee?: number;
  denialReason?: string;
}

export interface CreateCommentDTO {
  documentId: string;
  type: CommentType;
  content: string;
  timestamp?: number;
  isAnonymous?: boolean;
}

export interface SearchFilters {
  query?: string;
  agencyId?: string;
  category?: RecordCategory;
  status?: RequestStatus;
  dateFrom?: string;
  dateTo?: string;
  jurisdictionLevel?: JurisdictionLevel;
  state?: string;
}

/**
 * Generic paginated result structure
 * @interface
 * @template T - Type of data items
 */
export interface PaginatedResult<T> {
  /** Array of result items */
  data: T[];
  /** Pagination metadata */
  pagination: PaginationInfo;
}
