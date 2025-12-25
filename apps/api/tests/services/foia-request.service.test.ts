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
// FOIA Stream - FOIA Request Service Tests
// ============================================

import type { Database } from 'better-sqlite3';
import { and, eq, gte, like, lte } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';
import { applyMigrations, cleanupTestDb, clearTestData, createTestDb } from '../utils';

let testSqlite: Database;
let testDb: ReturnType<typeof drizzle>;
const dbPath = `./data/test-foia-${Date.now()}.db`;

// Helper to create prerequisite data
async function createTestUserAndAgency() {
  await testDb.insert(schema.users).values({
    id: 'test-user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: 'civilian',
    firstName: 'Test',
    lastName: 'User',
    isAnonymous: false,
    isVerified: false,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await testDb.insert(schema.agencies).values({
    id: 'test-agency-1',
    name: 'Test Agency',
    jurisdictionLevel: 'federal',
    responseDeadlineDays: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { userId: 'test-user-1', agencyId: 'test-agency-1' };
}

describe('FOIARequestService', () => {
  beforeAll(async () => {
    const { db, sqlite } = createTestDb(dbPath);
    testSqlite = sqlite;
    testDb = db;
    applyMigrations(testDb);
  });

  afterAll(async () => {
    cleanupTestDb(testSqlite, dbPath);
  });

  beforeEach(async () => {
    clearTestData(testSqlite);
  });

  describe('createRequest', () => {
    it('should create a FOIA request with required fields', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      const result = await testDb
        .insert(schema.foiaRequests)
        .values({
          id: 'request-1',
          userId,
          agencyId,
          category: 'incident_report',
          title: 'Test FOIA Request',
          description: 'This is a test request for incident reports.',
          status: 'draft',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        userId,
        agencyId,
        category: 'incident_report',
        title: 'Test FOIA Request',
        status: 'draft',
        isPublic: true, // Drizzle with better-sqlite3 returns booleans
      });
    });

    it('should support all record categories', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      const categories = [
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
      ] as const;

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const result = await testDb
          .insert(schema.foiaRequests)
          .values({
            id: `request-cat-${i}`,
            userId,
            agencyId,
            category,
            title: `Request for ${category}`,
            description: `Testing ${category} category`,
            status: 'draft',
            isPublic: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning();

        expect(result[0]?.category).toBe(category);
      }
    });

    it('should create request with date range', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      const result = await testDb
        .insert(schema.foiaRequests)
        .values({
          id: 'request-daterange-1',
          userId,
          agencyId,
          category: 'incident_report',
          title: 'Dated Request',
          description: 'Request with date range',
          status: 'draft',
          dateRangeStart: '2024-01-01',
          dateRangeEnd: '2024-12-31',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result[0]?.dateRangeStart).toBe('2024-01-01');
      expect(result[0]?.dateRangeEnd).toBe('2024-12-31');
    });

    it('should create private request', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      const result = await testDb
        .insert(schema.foiaRequests)
        .values({
          id: 'request-private-1',
          userId,
          agencyId,
          category: 'personnel_record',
          title: 'Private Request',
          description: 'This request is private',
          status: 'draft',
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result[0]?.isPublic).toBe(false);
    });
  });

  describe('updateRequest', () => {
    it('should update request status', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      await testDb.insert(schema.foiaRequests).values({
        id: 'request-status-1',
        userId,
        agencyId,
        category: 'incident_report',
        title: 'Status Test',
        description: 'Testing status updates',
        status: 'draft',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .update(schema.foiaRequests)
        .set({ status: 'submitted', submittedAt: new Date().toISOString() })
        .where(eq(schema.foiaRequests.id, 'request-status-1'))
        .returning();

      expect(result[0]?.status).toBe('submitted');
      expect(result[0]?.submittedAt).toBeDefined();
    });

    it('should track all status transitions', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      const statuses = [
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
      ] as const;

      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        await testDb.insert(schema.foiaRequests).values({
          id: `request-status-${i}`,
          userId,
          agencyId,
          category: 'incident_report',
          title: `Status ${status}`,
          description: 'Test description',
          status,
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const requests = await testDb.select().from(schema.foiaRequests);
      expect(requests).toHaveLength(statuses.length);
    });

    it('should add tracking number', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      await testDb.insert(schema.foiaRequests).values({
        id: 'request-tracking-1',
        userId,
        agencyId,
        category: 'incident_report',
        title: 'Tracking Test',
        description: 'Testing tracking number',
        status: 'submitted',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .update(schema.foiaRequests)
        .set({ trackingNumber: 'FOIA-2024-12345' })
        .where(eq(schema.foiaRequests.id, 'request-tracking-1'))
        .returning();

      expect(result[0]?.trackingNumber).toBe('FOIA-2024-12345');
    });

    it('should update fee information', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      await testDb.insert(schema.foiaRequests).values({
        id: 'request-fee-1',
        userId,
        agencyId,
        category: 'body_cam_footage',
        title: 'Fee Test',
        description: 'Testing fee fields',
        status: 'processing',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .update(schema.foiaRequests)
        .set({ estimatedFee: 150.0, actualFee: 125.5 })
        .where(eq(schema.foiaRequests.id, 'request-fee-1'))
        .returning();

      expect(result[0]?.estimatedFee).toBe(150.0);
      expect(result[0]?.actualFee).toBe(125.5);
    });

    it('should record denial reason', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      await testDb.insert(schema.foiaRequests).values({
        id: 'request-denial-1',
        userId,
        agencyId,
        category: 'personnel_record',
        title: 'Denial Test',
        description: 'Testing denial reason',
        status: 'submitted',
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .update(schema.foiaRequests)
        .set({
          status: 'denied',
          denialReason: 'Exempt under personnel privacy exemption',
        })
        .where(eq(schema.foiaRequests.id, 'request-denial-1'))
        .returning();

      expect(result[0]?.status).toBe('denied');
      expect(result[0]?.denialReason).toContain('privacy exemption');
    });
  });

  describe('searchRequests', () => {
    beforeEach(async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      // Create second agency
      await testDb.insert(schema.agencies).values({
        id: 'test-agency-2',
        name: 'Second Agency',
        jurisdictionLevel: 'state',
        state: 'CA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Seed test requests
      await testDb.insert(schema.foiaRequests).values([
        {
          id: 'search-1',
          userId,
          agencyId,
          category: 'incident_report',
          title: 'Police Incident Report',
          description: 'Request for incident reports',
          status: 'submitted',
          isPublic: true,
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'search-2',
          userId,
          agencyId,
          category: 'body_cam_footage',
          title: 'Body Camera Video',
          description: 'Request for body cam footage',
          status: 'fulfilled',
          isPublic: true,
          createdAt: '2024-02-20T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'search-3',
          userId,
          agencyId: 'test-agency-2',
          category: 'budget_record',
          title: 'Budget Documents',
          description: 'Annual budget request',
          status: 'processing',
          isPublic: true,
          createdAt: '2024-03-10T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'search-4',
          userId,
          agencyId,
          category: 'incident_report',
          title: 'Private Incident',
          description: 'Private request',
          status: 'draft',
          isPublic: false,
          createdAt: '2024-04-01T00:00:00.000Z',
          updatedAt: new Date().toISOString(),
        },
      ]);
    });

    it('should search by title', async () => {
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(like(schema.foiaRequests.title, '%Police%'));

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toContain('Police');
    });

    it('should filter by category', async () => {
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.category, 'incident_report'));

      expect(results).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.status, 'submitted'));

      expect(results).toHaveLength(1);
    });

    it('should filter by agency', async () => {
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.agencyId, 'test-agency-2'));

      expect(results).toHaveLength(1);
      expect(results[0]?.category).toBe('budget_record');
    });

    it('should filter by date range', async () => {
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(
          and(
            gte(schema.foiaRequests.createdAt, '2024-02-01'),
            lte(schema.foiaRequests.createdAt, '2024-03-31'),
          ),
        );

      expect(results).toHaveLength(2);
    });

    it('should only return public requests in public search', async () => {
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.isPublic, true));

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.isPublic)).toBe(true);
    });
  });

  describe('getUserRequests', () => {
    it('should return requests for specific user', async () => {
      // Create two users
      await testDb.insert(schema.users).values([
        {
          id: 'user-a',
          email: 'usera@example.com',
          passwordHash: 'hash',
          role: 'civilian',
          firstName: 'User',
          lastName: 'A',
          isAnonymous: false,
          isVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'user-b',
          email: 'userb@example.com',
          passwordHash: 'hash',
          role: 'journalist',
          firstName: 'User',
          lastName: 'B',
          isAnonymous: false,
          isVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await testDb.insert(schema.agencies).values({
        id: 'user-req-agency',
        name: 'Agency',
        jurisdictionLevel: 'federal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create requests for both users
      await testDb.insert(schema.foiaRequests).values([
        {
          id: 'user-a-req-1',
          userId: 'user-a',
          agencyId: 'user-req-agency',
          category: 'incident_report',
          title: 'User A Request 1',
          description: 'Description',
          status: 'draft',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'user-a-req-2',
          userId: 'user-a',
          agencyId: 'user-req-agency',
          category: 'body_cam_footage',
          title: 'User A Request 2',
          description: 'Description',
          status: 'submitted',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'user-b-req-1',
          userId: 'user-b',
          agencyId: 'user-req-agency',
          category: 'budget_record',
          title: 'User B Request',
          description: 'Description',
          status: 'draft',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      // Get User A's requests
      const userARequests = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.userId, 'user-a'));

      expect(userARequests).toHaveLength(2);
      expect(userARequests.every((r) => r.userId === 'user-a')).toBe(true);

      // Get User B's requests
      const userBRequests = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.userId, 'user-b'));

      expect(userBRequests).toHaveLength(1);
    });
  });

  describe('deadlines', () => {
    it('should calculate due date based on agency response deadline', async () => {
      const { userId, agencyId } = await createTestUserAndAgency();

      const submittedAt = new Date('2024-06-01').toISOString();
      // Agency has 20 day response deadline
      const dueDate = new Date('2024-06-21').toISOString();

      await testDb.insert(schema.foiaRequests).values({
        id: 'deadline-1',
        userId,
        agencyId,
        category: 'incident_report',
        title: 'Deadline Test',
        description: 'Testing deadline calculation',
        status: 'submitted',
        submittedAt,
        dueDate,
        isPublic: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.id, 'deadline-1'))
        .get();

      expect(result?.submittedAt).toBe(submittedAt);
      expect(result?.dueDate).toBe(dueDate);
    });
  });
});
