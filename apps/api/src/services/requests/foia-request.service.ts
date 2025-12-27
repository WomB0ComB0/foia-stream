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
 * @file FOIA Request Service
 * @module services/foia-request
 * @author FOIA Stream Team
 * @description Handles FOIA request lifecycle including creation, submission,
 *              status updates, deadline tracking, and statistics. Implements
 *              encryption for sensitive content and audit logging.
 * @compliance NIST 800-53 AU-2 (Audit Events)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */

// ============================================
// FOIA Stream - FOIA Request Service
// ============================================

import { db, schema } from '@/db';
import type {
  CreateRequestDTO,
  FOIARequest,
  PaginatedResult,
  RecordCategory,
  RequestStatus,
  SearchFilters,
  UpdateRequestDTO,
} from '@/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '@foia-stream/shared';
import dayjs from 'dayjs';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { nanoid } from 'nanoid';
import { decryptSensitiveFields, encryptSensitiveFields } from './encryption.service';

/**
 * FOIA request with joined agency information schema
 * @schema
 */
export const RequestWithAgencySchema = S.mutable(
  S.Struct({
    id: S.String,
    userId: S.String,
    agencyId: S.String,
    status: S.String as S.Schema<RequestStatus>,
    category: S.String as S.Schema<RecordCategory>,
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
    /** Associated agency details */
    agency: S.Struct({
      id: S.String,
      name: S.String,
      abbreviation: S.NullOr(S.String),
      jurisdictionLevel: S.String,
    }),
  }),
);
export type RequestWithAgency = typeof RequestWithAgencySchema.Type;

/**
 * FOIA Request Service
 *
 * @class FOIARequestService
 * @description Manages the complete FOIA request lifecycle from draft creation
 *              to completion. Handles encryption of sensitive content, deadline
 *              calculation, and maintains audit trail of all changes.
 * @compliance NIST 800-53 AU-2 (Audit Events) - All state changes are logged
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest) - Sensitive fields encrypted
 *
 * @example
 * ```typescript
 * const foiaService = new FOIARequestService();
 *
 * // Create draft request
 * const request = await foiaService.createRequest(userId, {
 *   title: 'Body Camera Footage Request',
 *   description: 'Requesting footage from incident...',
 *   agencyId: 'agency-123'
 * });
 *
 * // Submit the request
 * await foiaService.submitRequest(request.id, userId);
 * ```
 */
export class FOIARequestService {
  /**
   * Create a new FOIA request (draft)
   * Encrypts sensitive fields before storage
   *
   * @param {string} userId - ID of the user creating the request
   * @param {CreateRequestDTO} data - Request data
   * @returns {Promise<FOIARequest>} Created request
   * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
   */
  async createRequest(userId: string, data: CreateRequestDTO): Promise<FOIARequest> {
    const id = nanoid();
    const now = new Date().toISOString();

    // Encrypt sensitive fields (description may contain PII)
    const encryptedData = encryptSensitiveFields({ requestContent: data.description }, [
      'requestContent',
    ]);

    await db.insert(schema.foiaRequests).values({
      id,
      userId,
      agencyId: data.agencyId,
      category: data.category,
      title: data.title,
      description: (encryptedData.requestContent as string) ?? data.description,
      dateRangeStart: data.dateRangeStart,
      dateRangeEnd: data.dateRangeEnd,
      templateId: data.templateId,
      isPublic: data.isPublic ?? true,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });

    // Log audit event
    await this.logAudit(userId, 'request_created', 'foia_request', id);

    // Increment template usage if used
    if (data.templateId) {
      await db
        .update(schema.requestTemplates)
        .set({
          usageCount: sql`${schema.requestTemplates.usageCount} + 1`,
          updatedAt: now,
        })
        .where(eq(schema.requestTemplates.id, data.templateId));
    }

    return this.getRequestById(id) as Promise<FOIARequest>;
  }

  /**
   * Submit a draft request
   */
  async submitRequest(requestId: string, userId: string): Promise<FOIARequest> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw NotFoundError('Request not found');
    }

    if (request.userId !== userId) {
      throw ForbiddenError('Unauthorized');
    }

    if (request.status !== 'draft') {
      throw BadRequestError('Request has already been submitted');
    }

    // Get agency to calculate due date
    const agency = await db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.id, request.agencyId))
      .get();

    const now = new Date().toISOString();
    const dueDate = dayjs()
      .add(agency?.responseDeadlineDays ?? 20, 'day')
      .toISOString();

    await db
      .update(schema.foiaRequests)
      .set({
        status: 'submitted',
        submittedAt: now,
        dueDate,
        updatedAt: now,
      })
      .where(eq(schema.foiaRequests.id, requestId));

    // Log audit event
    await this.logAudit(userId, 'request_submitted', 'foia_request', requestId);

    // Update agency stats
    await this.updateAgencyStats(request.agencyId);

    return this.getRequestById(requestId) as Promise<FOIARequest>;
  }

  /**
   * Update request status (typically by agency officials)
   */
  async updateRequest(
    requestId: string,
    userId: string,
    data: UpdateRequestDTO,
  ): Promise<FOIARequest> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw NotFoundError('Request not found');
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { ...data, updatedAt: now };

    // Track completion
    if (data.status && ['fulfilled', 'partially_fulfilled', 'denied'].includes(data.status)) {
      updateData.completedAt = now;
    }

    // Track acknowledgment
    if (data.status === 'acknowledged' && !request.acknowledgedAt) {
      updateData.acknowledgedAt = now;
    }

    await db
      .update(schema.foiaRequests)
      .set(updateData)
      .where(eq(schema.foiaRequests.id, requestId));

    // Log audit event
    await this.logAudit(userId, 'request_updated', 'foia_request', requestId, { changes: data });

    // Update agency stats
    await this.updateAgencyStats(request.agencyId);

    return this.getRequestById(requestId) as Promise<FOIARequest>;
  }

  /**
   * Get request by ID
   * Decrypts sensitive fields on retrieval
   */
  async getRequestById(id: string): Promise<FOIARequest | null> {
    const request = await db
      .select()
      .from(schema.foiaRequests)
      .where(eq(schema.foiaRequests.id, id))
      .get();

    if (!request) return null;

    // Decrypt sensitive fields if encrypted
    const decrypted = decryptSensitiveFields({ requestContent: request.description }, [
      'requestContent',
    ]);

    return {
      ...request,
      description: (decrypted.requestContent as string) ?? request.description,
    } as FOIARequest;
  }

  /**
   * Get request with agency details
   */
  async getRequestWithAgency(id: string): Promise<RequestWithAgency | null> {
    const result = await db
      .select({
        request: schema.foiaRequests,
        agency: {
          id: schema.agencies.id,
          name: schema.agencies.name,
          abbreviation: schema.agencies.abbreviation,
          jurisdictionLevel: schema.agencies.jurisdictionLevel,
        },
      })
      .from(schema.foiaRequests)
      .innerJoin(schema.agencies, eq(schema.foiaRequests.agencyId, schema.agencies.id))
      .where(eq(schema.foiaRequests.id, id))
      .get();

    if (!result) return null;

    return {
      ...(result.request as FOIARequest),
      agency: result.agency,
    };
  }

  /**
   * Get all requests for a user
   */
  async getUserRequests(
    userId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<RequestWithAgency>> {
    const offset = (page - 1) * pageSize;

    const [requests, countResult] = await Promise.all([
      db
        .select({
          request: schema.foiaRequests,
          agency: {
            id: schema.agencies.id,
            name: schema.agencies.name,
            abbreviation: schema.agencies.abbreviation,
            jurisdictionLevel: schema.agencies.jurisdictionLevel,
          },
        })
        .from(schema.foiaRequests)
        .innerJoin(schema.agencies, eq(schema.foiaRequests.agencyId, schema.agencies.id))
        .where(eq(schema.foiaRequests.userId, userId))
        .orderBy(desc(schema.foiaRequests.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.userId, userId))
        .get(),
    ]);

    const totalItems = countResult?.count ?? 0;

    return {
      data: requests.map((r) => ({
        ...(r.request as FOIARequest),
        agency: r.agency,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Search public requests
   */
  async searchRequests(
    filters: SearchFilters,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<RequestWithAgency>> {
    const offset = (page - 1) * pageSize;
    const conditions = [eq(schema.foiaRequests.isPublic, true)];

    if (filters.agencyId) {
      conditions.push(eq(schema.foiaRequests.agencyId, filters.agencyId));
    }

    if (filters.category) {
      conditions.push(eq(schema.foiaRequests.category, filters.category));
    }

    if (filters.status) {
      conditions.push(eq(schema.foiaRequests.status, filters.status));
    }

    if (filters.query) {
      const queryCondition = or(
        like(schema.foiaRequests.title, `%${filters.query}%`),
        like(schema.foiaRequests.description, `%${filters.query}%`),
      );
      if (queryCondition) {
        conditions.push(queryCondition);
      }
    }

    if (filters.jurisdictionLevel) {
      conditions.push(eq(schema.agencies.jurisdictionLevel, filters.jurisdictionLevel));
    }

    if (filters.state) {
      conditions.push(eq(schema.agencies.state, filters.state));
    }

    const whereClause = and(...conditions);

    const [requests, countResult] = await Promise.all([
      db
        .select({
          request: schema.foiaRequests,
          agency: {
            id: schema.agencies.id,
            name: schema.agencies.name,
            abbreviation: schema.agencies.abbreviation,
            jurisdictionLevel: schema.agencies.jurisdictionLevel,
          },
        })
        .from(schema.foiaRequests)
        .innerJoin(schema.agencies, eq(schema.foiaRequests.agencyId, schema.agencies.id))
        .where(whereClause)
        .orderBy(desc(schema.foiaRequests.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.foiaRequests)
        .innerJoin(schema.agencies, eq(schema.foiaRequests.agencyId, schema.agencies.id))
        .where(whereClause)
        .get(),
    ]);

    const totalItems = countResult?.count ?? 0;

    return {
      data: requests.map((r) => ({
        ...(r.request as FOIARequest),
        agency: r.agency,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Get requests approaching deadline
   */
  async getUpcomingDeadlines(days = 7): Promise<RequestWithAgency[]> {
    const cutoffDate = dayjs().add(days, 'day').toISOString();
    const now = new Date().toISOString();

    const requests = await db
      .select({
        request: schema.foiaRequests,
        agency: {
          id: schema.agencies.id,
          name: schema.agencies.name,
          abbreviation: schema.agencies.abbreviation,
          jurisdictionLevel: schema.agencies.jurisdictionLevel,
        },
      })
      .from(schema.foiaRequests)
      .innerJoin(schema.agencies, eq(schema.foiaRequests.agencyId, schema.agencies.id))
      .where(
        and(
          or(
            eq(schema.foiaRequests.status, 'submitted'),
            eq(schema.foiaRequests.status, 'acknowledged'),
            eq(schema.foiaRequests.status, 'processing'),
          ),
          sql`${schema.foiaRequests.dueDate} <= ${cutoffDate}`,
          sql`${schema.foiaRequests.dueDate} >= ${now}`,
        ),
      )
      .orderBy(asc(schema.foiaRequests.dueDate));

    return requests.map((r) => ({
      ...(r.request as FOIARequest),
      agency: r.agency,
    }));
  }

  /**
   * Get overdue requests
   */
  async getOverdueRequests(): Promise<RequestWithAgency[]> {
    const now = new Date().toISOString();

    const requests = await db
      .select({
        request: schema.foiaRequests,
        agency: {
          id: schema.agencies.id,
          name: schema.agencies.name,
          abbreviation: schema.agencies.abbreviation,
          jurisdictionLevel: schema.agencies.jurisdictionLevel,
        },
      })
      .from(schema.foiaRequests)
      .innerJoin(schema.agencies, eq(schema.foiaRequests.agencyId, schema.agencies.id))
      .where(
        and(
          or(
            eq(schema.foiaRequests.status, 'submitted'),
            eq(schema.foiaRequests.status, 'acknowledged'),
            eq(schema.foiaRequests.status, 'processing'),
          ),
          sql`${schema.foiaRequests.dueDate} < ${now}`,
        ),
      )
      .orderBy(asc(schema.foiaRequests.dueDate));

    return requests.map((r) => ({
      ...(r.request as FOIARequest),
      agency: r.agency,
    }));
  }

  /**
   * Withdraw a request
   */
  async withdrawRequest(requestId: string, userId: string): Promise<FOIARequest> {
    const request = await this.getRequestById(requestId);

    if (!request) {
      throw NotFoundError('Request not found');
    }

    if (request.userId !== userId) {
      throw ForbiddenError('Unauthorized');
    }

    const completedStatuses: RequestStatus[] = [
      'fulfilled',
      'partially_fulfilled',
      'denied',
      'appeal_granted',
      'appeal_denied',
      'withdrawn',
    ];

    if (completedStatuses.includes(request.status)) {
      throw BadRequestError('Cannot withdraw a completed request');
    }

    const now = new Date().toISOString();

    await db
      .update(schema.foiaRequests)
      .set({
        status: 'withdrawn',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.foiaRequests.id, requestId));

    // Log audit event
    await this.logAudit(userId, 'request_updated', 'foia_request', requestId, {
      action: 'withdrawn',
    });

    return this.getRequestById(requestId) as Promise<FOIARequest>;
  }

  /**
   * Update agency statistics
   */
  private async updateAgencyStats(agencyId: string): Promise<void> {
    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`sum(case when ${schema.foiaRequests.status} in ('submitted', 'acknowledged', 'processing') then 1 else 0 end)`,
        fulfilled: sql<number>`sum(case when ${schema.foiaRequests.status} in ('fulfilled', 'partially_fulfilled') then 1 else 0 end)`,
        denied: sql<number>`sum(case when ${schema.foiaRequests.status} = 'denied' then 1 else 0 end)`,
        appealed: sql<number>`sum(case when ${schema.foiaRequests.status} like 'appeal%' then 1 else 0 end)`,
      })
      .from(schema.foiaRequests)
      .where(eq(schema.foiaRequests.agencyId, agencyId))
      .get();

    // Calculate average response time
    const responseTimeResult = await db
      .select({
        avgDays: sql<number>`avg(julianday(${schema.foiaRequests.completedAt}) - julianday(${schema.foiaRequests.submittedAt}))`,
      })
      .from(schema.foiaRequests)
      .where(
        and(
          eq(schema.foiaRequests.agencyId, agencyId),
          sql`${schema.foiaRequests.completedAt} is not null`,
          sql`${schema.foiaRequests.submittedAt} is not null`,
        ),
      )
      .get();

    const now = new Date().toISOString();
    const total = stats?.total ?? 0;
    const fulfilled = stats?.fulfilled ?? 0;

    await db
      .insert(schema.agencyStats)
      .values({
        id: nanoid(),
        agencyId,
        totalRequests: total,
        pendingRequests: stats?.pending ?? 0,
        fulfilledRequests: fulfilled,
        deniedRequests: stats?.denied ?? 0,
        appealedRequests: stats?.appealed ?? 0,
        averageResponseDays: responseTimeResult?.avgDays ?? null,
        complianceRate: total > 0 ? fulfilled / total : null,
        lastUpdated: now,
      })
      .onConflictDoUpdate({
        target: schema.agencyStats.agencyId,
        set: {
          totalRequests: total,
          pendingRequests: stats?.pending ?? 0,
          fulfilledRequests: fulfilled,
          deniedRequests: stats?.denied ?? 0,
          appealedRequests: stats?.appealed ?? 0,
          averageResponseDays: responseTimeResult?.avgDays ?? null,
          complianceRate: total > 0 ? fulfilled / total : null,
          lastUpdated: now,
        },
      });
  }

  /**
   * Log audit event
   */
  private async logAudit(
    userId: string,
    action: (typeof schema.auditLogs.$inferInsert)['action'],
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(schema.auditLogs).values({
      id: nanoid(),
      userId,
      action,
      resourceType,
      resourceId,
      details: details ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}

export const foiaRequestService = new FOIARequestService();
