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
 * @file Database Schema
 * @module db/schema
 * @author FOIA Stream Team
 * @description Drizzle ORM schema definitions for all database tables.
 *              Includes users, sessions, agencies, FOIA requests, documents,
 *              comments, appeals, audit logs, and statistics tables.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records), SC-28 (Protection at Rest)
 */

// ============================================
// FOIA Stream - Database Schema (Drizzle ORM)
// ============================================

import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ============================================
// Users & Authentication
// ============================================

/**
 * Users table - stores all user accounts and authentication data
 *
 * @table users
 * @description Core user table with authentication, profile, and security fields.
 *              Includes account lockout fields for brute-force protection (GAP-007).
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 */
export const users = sqliteTable('users', {
  /** Unique user identifier (UUID) */
  id: text('id').primaryKey(),
  /** User email address - used for login */
  email: text('email').notNull().unique(),
  /** Argon2id hashed password */
  passwordHash: text('password_hash').notNull(),
  /** User role for RBAC */
  role: text('role', {
    enum: [
      'civilian',
      'journalist',
      'researcher',
      'attorney',
      'community_advocate',
      'agency_official',
      'admin',
    ],
  })
    .notNull()
    .default('civilian'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  organization: text('organization'),
  isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
  /** MFA enabled flag */
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
  /** Encrypted TOTP secret for MFA */
  twoFactorSecret: text('two_factor_secret'),
  /**
   * Account lockout fields (GAP-007)
   * @compliance NIST 800-53 AC-7 (Unsuccessful Logon Attempts)
   */
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  lastFailedLoginAt: text('last_failed_login_at'),
  /** Password management */
  passwordChangedAt: text('password_changed_at'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  /**
   * Consent tracking fields (GDPR/CCPA compliance)
   * @compliance GDPR Article 7 (Conditions for consent), CCPA
   */
  termsAcceptedAt: text('terms_accepted_at'),
  privacyAcceptedAt: text('privacy_accepted_at'),
  dataProcessingConsentAt: text('data_processing_consent_at'),
  /** Marketing consent is optional and separate from required consents */
  marketingConsentAt: text('marketing_consent_at'),
  /** Timestamp when consent was last updated/withdrawn */
  consentUpdatedAt: text('consent_updated_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Sessions table - stores active user sessions
 *
 * @table sessions
 * @description Tracks active user sessions with JWT tokens and expiration.
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    /** Session metadata for device tracking */
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    deviceName: text('device_name'),
    lastActiveAt: text('last_active_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_expires_at').on(table.expiresAt),
    index('idx_sessions_user_expires').on(table.userId, table.expiresAt),
  ],
);

/**
 * API Keys table - stores user API keys for programmatic access
 *
 * @table api_keys
 * @description Allows users to generate API keys for external integrations.
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Hashed API key (we only store the hash) */
    keyHash: text('key_hash').notNull(),
    /** Last 4 characters of the key for display */
    keyPreview: text('key_preview').notNull(),
    name: text('name').notNull().default('Default'),
    lastUsedAt: text('last_used_at'),
    expiresAt: text('expires_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_api_keys_user_id').on(table.userId),
    uniqueIndex('idx_api_keys_key_hash').on(table.keyHash),
  ],
);

// ============================================
// Agencies
// ============================================

/**
 * Agencies table - government agencies that process FOIA requests
 *
 * @table agencies
 * @description Stores information about federal, state, local, and county agencies.
 */
export const agencies = sqliteTable(
  'agencies',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    abbreviation: text('abbreviation'),
    jurisdictionLevel: text('jurisdiction_level', {
      enum: ['federal', 'state', 'local', 'county'],
    }).notNull(),
    state: text('state'),
    city: text('city'),
    county: text('county'),
    foiaEmail: text('foia_email'),
    foiaAddress: text('foia_address'),
    foiaPortalUrl: text('foia_portal_url'),
    /** Default response deadline in business days */
    responseDeadlineDays: integer('response_deadline_days').notNull().default(20),
    /** Appeal deadline in business days */
    appealDeadlineDays: integer('appeal_deadline_days').notNull().default(30),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_agencies_jurisdiction').on(table.jurisdictionLevel),
    index('idx_agencies_state').on(table.state),
  ],
);

// ============================================
// FOIA Requests
// ============================================

/**
 * FOIA Requests table - tracks all public records requests
 *
 * @table foia_requests
 * @description Core table for FOIA request lifecycle management.
 *              Tracks status, deadlines, fees, and relationships to users/agencies.
 */
export const foiaRequests = sqliteTable(
  'foia_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    /** Request lifecycle status */
    status: text('status', {
      enum: [
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
      ],
    })
      .notNull()
      .default('draft'),
    /** Record category type */
    category: text('category', {
      enum: [
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
      ],
    }).notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    dateRangeStart: text('date_range_start'),
    dateRangeEnd: text('date_range_end'),
    templateId: text('template_id').references(() => requestTemplates.id),
    /** Agency-assigned tracking number */
    trackingNumber: text('tracking_number'),
    estimatedFee: real('estimated_fee'),
    actualFee: real('actual_fee'),
    submittedAt: text('submitted_at'),
    acknowledgedAt: text('acknowledged_at'),
    dueDate: text('due_date'),
    completedAt: text('completed_at'),
    denialReason: text('denial_reason'),
    /** Public visibility flag for transparency */
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
    /**
     * Data retention fields
     * @compliance GDPR Article 5 (Storage limitation), CCPA
     */
    /** When the request content should be purged (90 days after completion) */
    contentPurgeAt: text('content_purge_at'),
    /** Whether content has been purged (title/description cleared) */
    contentPurged: integer('content_purged', { mode: 'boolean' }).notNull().default(false),
    /** Original title stored as hash for reference after purge */
    titleHash: text('title_hash'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_foia_requests_user_id').on(table.userId),
    index('idx_foia_requests_agency_id').on(table.agencyId),
    index('idx_foia_requests_status').on(table.status),
    index('idx_foia_requests_category').on(table.category),
    index('idx_foia_requests_created_at').on(table.createdAt),
    index('idx_foia_requests_due_date').on(table.dueDate),
    index('idx_foia_requests_is_public').on(table.isPublic),
    // Composite indexes for common query patterns
    index('idx_foia_requests_user_status').on(table.userId, table.status),
    index('idx_foia_requests_agency_status').on(table.agencyId, table.status),
    index('idx_foia_requests_status_created').on(table.status, table.createdAt),
  ],
);

/**
 * Request Templates table - reusable FOIA request templates
 *
 * @table request_templates
 * @description Pre-built templates for common FOIA request types.
 */
export const requestTemplates = sqliteTable('request_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', {
    enum: [
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
    ],
  }).notNull(),
  description: text('description').notNull(),
  templateText: text('template_text').notNull(),
  jurisdictionLevel: text('jurisdiction_level', {
    enum: ['federal', 'state', 'local', 'county'],
  }),
  createdBy: text('created_by').references(() => users.id),
  isOfficial: integer('is_official', { mode: 'boolean' }).notNull().default(false),
  usageCount: integer('usage_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// Documents & Media
// ============================================

/**
 * Documents table - stores uploaded files and media
 *
 * @table documents
 * @description Tracks documents returned from FOIA requests including
 *              body cam footage, PDFs, images, and other media types.
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */
export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').references(() => foiaRequests.id),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => users.id),
    type: text('type', {
      enum: ['body_cam_video', 'pdf', 'image', 'audio', 'spreadsheet', 'text', 'other'],
    }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    fileName: text('file_name').notNull(),
    filePath: text('file_path').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    isRedacted: integer('is_redacted', { mode: 'boolean' }).notNull().default(false),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
    transcript: text('transcript'),
    metadata: text('metadata', { mode: 'json' }).$type<{
      date?: string;
      location?: string;
      officerIds?: string[];
      incidentNumber?: string;
      duration?: number;
      tags?: string[];
    }>(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_documents_request_id').on(table.requestId),
    index('idx_documents_agency_id').on(table.agencyId),
    index('idx_documents_uploaded_by').on(table.uploadedBy),
    index('idx_documents_type').on(table.type),
    index('idx_documents_is_public').on(table.isPublic),
    index('idx_documents_created_at').on(table.createdAt),
  ],
);

// ============================================
// Comments & Reviews
// ============================================

/**
 * Comments table - user comments on documents
 *
 * @table comments
 * @description Allows users to annotate documents with comments, flags,
 *              and timestamps (for video). Supports community review.
 */
export const comments = sqliteTable(
  'comments',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    type: text('type', {
      enum: [
        'general',
        'misconduct_flag',
        'positive_interaction',
        'training_issue',
        'policy_violation',
        'context',
      ],
    })
      .notNull()
      .default('general'),
    content: text('content').notNull(),
    timestamp: integer('timestamp'), // seconds into video for video comments
    isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    isVerified: integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_comments_document_id').on(table.documentId),
    index('idx_comments_user_id').on(table.userId),
    index('idx_comments_type').on(table.type),
    index('idx_comments_created_at').on(table.createdAt),
  ],
);

/**
 * Comment Votes table - tracks user votes on comments
 *
 * @table comment_votes
 */
export const commentVotes = sqliteTable(
  'comment_votes',
  {
    id: text('id').primaryKey(),
    commentId: text('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 1 for upvote, -1 for downvote */
    vote: integer('vote').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_comment_votes_comment_id').on(table.commentId),
    index('idx_comment_votes_user_id').on(table.userId),
    uniqueIndex('idx_comment_votes_user_comment').on(table.userId, table.commentId),
  ],
);

// ============================================
// Appeals
// ============================================

/**
 * Appeals table - tracks FOIA denial appeals
 *
 * @table appeals
 * @description Tracks administrative appeals of denied FOIA requests.
 */
export const appeals = sqliteTable(
  'appeals',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id')
      .notNull()
      .references(() => foiaRequests.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    grounds: text('grounds').notNull(),
    submittedAt: text('submitted_at').notNull(),
    status: text('status', {
      enum: ['pending', 'granted', 'denied', 'partial'],
    })
      .notNull()
      .default('pending'),
    responseAt: text('response_at'),
    responseText: text('response_text'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_appeals_request_id').on(table.requestId),
    index('idx_appeals_user_id').on(table.userId),
    index('idx_appeals_status').on(table.status),
  ],
);

// ============================================
// Audit Logs
// ============================================

/**
 * Audit Logs table - comprehensive activity logging
 *
 * @table audit_logs
 * @description Immutable audit trail for all system actions.
 *              Required for SOC 2 and NIST 800-53 compliance.
 * @compliance NIST 800-53 AU-3 (Content of Audit Records), AU-12 (Audit Generation)
 */
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    action: text('action', {
      enum: [
        // User actions
        'user_created',
        'user_login',
        'user_logout',
        'user_updated',
        'user_deleted',
        // Request actions
        'request_created',
        'request_submitted',
        'request_updated',
        // Document actions
        'document_uploaded',
        'document_viewed',
        'document_downloaded',
        // Comment/Appeal actions
        'comment_created',
        'appeal_filed',
        'admin_action',
        // Security events
        'security_failed_login',
        'security_successful_login',
        'security_account_lockout',
        'security_password_change',
        'security_mfa_enabled',
        'security_mfa_disabled',
        'security_privilege_escalation',
        'security_unauthorized_access',
        'security_rate_limit_exceeded',
        'security_suspicious_activity',
        'security_data_export',
        'security_bulk_data_access',
        'security_admin_action',
        'security_session_invalidated',
        'security_api_key_created',
        'security_api_key_revoked',
        // Data retention
        'retention_delete',
        'retention_archive',
        'retention_content_purge',
        'backup_created',
        'backup_restored',
        // Consent events
        'consent_given',
        'consent_withdrawn',
        'consent_updated',
      ],
    }).notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    details: text('details', { mode: 'json' }).$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_audit_logs_user_id').on(table.userId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_resource_type').on(table.resourceType),
    index('idx_audit_logs_resource_id').on(table.resourceId),
    index('idx_audit_logs_created_at').on(table.createdAt),
    // Composite indexes for compliance reporting queries
    index('idx_audit_logs_user_action').on(table.userId, table.action),
    index('idx_audit_logs_action_created').on(table.action, table.createdAt),
    index('idx_audit_logs_resource_type_id').on(table.resourceType, table.resourceId),
  ],
);

// ============================================
// Consent History (GDPR/CCPA Compliance)
// ============================================

/**
 * Consent History table - tracks all consent changes for compliance
 *
 * @table consent_history
 * @description Immutable audit trail of user consent actions.
 *              Required for GDPR Article 7 (proof of consent) and CCPA.
 * @compliance GDPR Article 7, CCPA 1798.100
 */
export const consentHistory = sqliteTable('consent_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Type of consent action */
  consentType: text('consent_type', {
    enum: ['terms', 'privacy', 'data_processing', 'marketing'],
  }).notNull(),
  /** Whether consent was given or withdrawn */
  action: text('action', {
    enum: ['given', 'withdrawn'],
  }).notNull(),
  /** Version of the policy consented to */
  policyVersion: text('policy_version'),
  /** IP address at time of consent (encrypted) */
  ipAddress: text('ip_address'),
  /** User agent at time of consent */
  userAgent: text('user_agent'),
  /** Timestamp of consent action */
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// Statistics & Metrics
// ============================================

export const agencyStats = sqliteTable('agency_stats', {
  id: text('id').primaryKey(),
  agencyId: text('agency_id')
    .notNull()
    .references(() => agencies.id)
    .unique(),
  totalRequests: integer('total_requests').notNull().default(0),
  pendingRequests: integer('pending_requests').notNull().default(0),
  fulfilledRequests: integer('fulfilled_requests').notNull().default(0),
  deniedRequests: integer('denied_requests').notNull().default(0),
  appealedRequests: integer('appealed_requests').notNull().default(0),
  averageResponseDays: real('average_response_days'),
  complianceRate: real('compliance_rate'),
  lastUpdated: text('last_updated').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const useOfForceStats = sqliteTable(
  'use_of_force_stats',
  {
    id: text('id').primaryKey(),
    agencyId: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    year: integer('year').notNull(),
    totalIncidents: integer('total_incidents').notNull().default(0),
    byType: text('by_type', { mode: 'json' }).$type<Record<string, number>>(),
    byOutcome: text('by_outcome', { mode: 'json' }).$type<Record<string, number>>(),
    officerInvolvedShootings: integer('officer_involved_shootings').notNull().default(0),
    complaints: integer('complaints').notNull().default(0),
    sustainedComplaints: integer('sustained_complaints').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_use_of_force_stats_agency_id').on(table.agencyId),
    index('idx_use_of_force_stats_year').on(table.year),
    index('idx_use_of_force_stats_agency_year').on(table.agencyId, table.year),
  ],
);

// ============================================
// Knowledge Base
// ============================================

export const knowledgeArticles = sqliteTable(
  'knowledge_articles',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    category: text('category', {
      enum: ['know_your_rights', 'foia_guide', 'policy_explainer', 'case_study', 'faq'],
    }).notNull(),
    content: text('content').notNull(),
    summary: text('summary'),
    state: text('state'), // for state-specific guides
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
    viewCount: integer('view_count').notNull().default(0),
    createdBy: text('created_by').references(() => users.id),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_knowledge_articles_category').on(table.category),
    index('idx_knowledge_articles_state').on(table.state),
    index('idx_knowledge_articles_is_published').on(table.isPublished),
  ],
);
