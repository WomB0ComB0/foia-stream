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

// ============================================
// FOIA Stream - Validation Schemas (Effect Schema)
// ============================================

import { Schema as S } from 'effect';

// ============================================
// User Schemas
// ============================================

export const UserRole = S.Literal(
  'civilian',
  'journalist',
  'researcher',
  'attorney',
  'community_advocate',
  'agency_official',
  'admin',
);
export type UserRole = typeof UserRole.Type;

export const CreateUserSchema = S.Struct({
  email: S.String.pipe(
    S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => 'Invalid email address',
    }),
  ),
  password: S.String.pipe(
    S.minLength(8, { message: () => 'Password must be at least 8 characters' }),
  ),
  role: UserRole.pipe(S.optionalWith({ default: () => 'civilian' as const })),
  firstName: S.String.pipe(S.minLength(1, { message: () => 'First name is required' })),
  lastName: S.String.pipe(S.minLength(1, { message: () => 'Last name is required' })),
  organization: S.optional(S.String),
  isAnonymous: S.Boolean.pipe(S.optionalWith({ default: () => false })),
});
export type CreateUser = typeof CreateUserSchema.Type;

export const LoginSchema = S.Struct({
  email: S.String.pipe(
    S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
      message: () => 'Invalid email address',
    }),
  ),
  password: S.String.pipe(S.minLength(1, { message: () => 'Password is required' })),
});
export type Login = typeof LoginSchema.Type;

export const UpdateUserSchema = S.Struct({
  firstName: S.optional(S.String.pipe(S.minLength(1))),
  lastName: S.optional(S.String.pipe(S.minLength(1))),
  organization: S.optional(S.String),
  isAnonymous: S.optional(S.Boolean),
});
export type UpdateUser = typeof UpdateUserSchema.Type;

export const ChangePasswordSchema = S.Struct({
  currentPassword: S.String.pipe(S.minLength(1, { message: () => 'Current password is required' })),
  newPassword: S.String.pipe(
    S.minLength(8, { message: () => 'New password must be at least 8 characters' }),
  ),
});
export type ChangePassword = typeof ChangePasswordSchema.Type;

// ============================================
// Agency Schemas
// ============================================

export const JurisdictionLevel = S.Literal('federal', 'state', 'local', 'county');
export type JurisdictionLevel = typeof JurisdictionLevel.Type;

export const CreateAgencySchema = S.Struct({
  name: S.String.pipe(S.minLength(1, { message: () => 'Agency name is required' })),
  abbreviation: S.optional(S.String),
  jurisdictionLevel: JurisdictionLevel,
  state: S.optional(S.String),
  city: S.optional(S.String),
  county: S.optional(S.String),
  foiaEmail: S.optional(S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
  foiaAddress: S.optional(S.String),
  foiaPortalUrl: S.optional(S.String.pipe(S.pattern(/^https?:\/\//))),
  responseDeadlineDays: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 20 })),
  appealDeadlineDays: S.Number.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 30 })),
});
export type CreateAgency = typeof CreateAgencySchema.Type;

// Define UpdateAgencySchema explicitly without using partial on transformed schema
export const UpdateAgencySchema = S.Struct({
  name: S.optional(S.String.pipe(S.minLength(1))),
  abbreviation: S.optional(S.String),
  jurisdictionLevel: S.optional(JurisdictionLevel),
  state: S.optional(S.String),
  city: S.optional(S.String),
  county: S.optional(S.String),
  foiaEmail: S.optional(S.String.pipe(S.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
  foiaAddress: S.optional(S.String),
  foiaPortalUrl: S.optional(S.String.pipe(S.pattern(/^https?:\/\//))),
  responseDeadlineDays: S.optional(S.Number.pipe(S.int(), S.positive())),
  appealDeadlineDays: S.optional(S.Number.pipe(S.int(), S.positive())),
});
export type UpdateAgency = typeof UpdateAgencySchema.Type;

export const AgencySearchSchema = S.Struct({
  query: S.optional(S.String),
  jurisdictionLevel: S.optional(JurisdictionLevel),
  state: S.optional(S.String),
  page: S.NumberFromString.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 1 })),
  pageSize: S.NumberFromString.pipe(
    S.int(),
    S.positive(),
    S.lessThanOrEqualTo(100),
    S.optionalWith({ default: () => 20 }),
  ),
});
export type AgencySearch = typeof AgencySearchSchema.Type;

// ============================================
// FOIA Request Schemas
// ============================================

export const RecordCategory = S.Literal(
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
export type RecordCategory = typeof RecordCategory.Type;

export const RequestStatus = S.Literal(
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
export type RequestStatus = typeof RequestStatus.Type;

export const CreateRequestSchema = S.Struct({
  agencyId: S.String.pipe(S.minLength(1, { message: () => 'Agency is required' })),
  category: RecordCategory,
  title: S.String.pipe(S.minLength(1, { message: () => 'Title is required' }), S.maxLength(200)),
  description: S.String.pipe(
    S.minLength(10, { message: () => 'Description must be at least 10 characters' }),
  ),
  dateRangeStart: S.optional(S.String),
  dateRangeEnd: S.optional(S.String),
  templateId: S.optional(S.String),
  isPublic: S.Boolean.pipe(S.optionalWith({ default: () => true })),
});
export type CreateRequest = typeof CreateRequestSchema.Type;

export const UpdateRequestSchema = S.Struct({
  status: S.optional(RequestStatus),
  trackingNumber: S.optional(S.String),
  estimatedFee: S.optional(S.Number.pipe(S.nonNegative())),
  actualFee: S.optional(S.Number.pipe(S.nonNegative())),
  denialReason: S.optional(S.String),
});
export type UpdateRequest = typeof UpdateRequestSchema.Type;

export const RequestSearchSchema = S.Struct({
  query: S.optional(S.String),
  agencyId: S.optional(S.String),
  category: S.optional(RecordCategory),
  status: S.optional(RequestStatus),
  dateFrom: S.optional(S.String),
  dateTo: S.optional(S.String),
  jurisdictionLevel: S.optional(JurisdictionLevel),
  state: S.optional(S.String),
  page: S.NumberFromString.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 1 })),
  pageSize: S.NumberFromString.pipe(
    S.int(),
    S.positive(),
    S.lessThanOrEqualTo(100),
    S.optionalWith({ default: () => 20 }),
  ),
});
export type RequestSearch = typeof RequestSearchSchema.Type;

// ============================================
// Template Schemas
// ============================================

export const CreateTemplateSchema = S.Struct({
  name: S.String.pipe(S.minLength(1, { message: () => 'Template name is required' })),
  category: RecordCategory,
  description: S.String.pipe(S.minLength(1, { message: () => 'Description is required' })),
  templateText: S.String.pipe(
    S.minLength(10, { message: () => 'Template text must be at least 10 characters' }),
  ),
  jurisdictionLevel: S.optional(JurisdictionLevel),
  isOfficial: S.Boolean.pipe(S.optionalWith({ default: () => false })),
});
export type CreateTemplate = typeof CreateTemplateSchema.Type;

export const TemplateSearchSchema = S.Struct({
  query: S.optional(S.String),
  category: S.optional(RecordCategory),
  page: S.NumberFromString.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 1 })),
  pageSize: S.NumberFromString.pipe(
    S.int(),
    S.positive(),
    S.lessThanOrEqualTo(100),
    S.optionalWith({ default: () => 20 }),
  ),
});
export type TemplateSearch = typeof TemplateSearchSchema.Type;

// ============================================
// Comment Schemas
// ============================================

export const CommentType = S.Literal(
  'general',
  'misconduct_flag',
  'positive_interaction',
  'training_issue',
  'policy_violation',
  'context',
);
export type CommentType = typeof CommentType.Type;

export const CreateCommentSchema = S.Struct({
  documentId: S.String.pipe(S.minLength(1, { message: () => 'Document ID is required' })),
  type: CommentType.pipe(S.optionalWith({ default: () => 'general' as const })),
  content: S.String.pipe(S.minLength(1, { message: () => 'Comment content is required' })),
  timestamp: S.optional(S.Number.pipe(S.int(), S.nonNegative())),
  isAnonymous: S.Boolean.pipe(S.optionalWith({ default: () => false })),
});
export type CreateComment = typeof CreateCommentSchema.Type;

// ============================================
// Appeal Schema
// ============================================

export const CreateAppealSchema = S.Struct({
  requestId: S.String.pipe(S.minLength(1, { message: () => 'Request ID is required' })),
  grounds: S.String.pipe(
    S.minLength(10, { message: () => 'Appeal grounds must be at least 10 characters' }),
  ),
});
export type CreateAppeal = typeof CreateAppealSchema.Type;

// ============================================
// Pagination Schema
// ============================================

export const PaginationSchema = S.Struct({
  page: S.NumberFromString.pipe(S.int(), S.positive(), S.optionalWith({ default: () => 1 })),
  pageSize: S.NumberFromString.pipe(
    S.int(),
    S.positive(),
    S.lessThanOrEqualTo(100),
    S.optionalWith({ default: () => 20 }),
  ),
});
export type Pagination = typeof PaginationSchema.Type;

// ============================================
// ID Param Schema
// ============================================

export const IdParamSchema = S.Struct({
  id: S.String.pipe(S.minLength(1, { message: () => 'ID is required' })),
});
export type IdParam = typeof IdParamSchema.Type;

// ============================================
// Category Param Schema
// ============================================

export const CategoryParamSchema = S.Struct({
  category: RecordCategory,
});
export type CategoryParam = typeof CategoryParamSchema.Type;
