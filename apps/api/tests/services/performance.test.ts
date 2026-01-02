/**
 * Copyright (c) 2025 Foia Stream
 * MIT License - See LICENSE file
 */

/**
 * @file Performance Tests - PostgreSQL
 * @description Tests for database query performance
 */

import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';
import type { AuditAction } from '../../src/types';
import { cleanupTestDb, clearTestData, createTestDb } from '../utils';

let testDb: NodePgDatabase<typeof schema>;

describe('Database Performance Tests', () => {
  beforeAll(async () => {
    const { db } = await createTestDb();
    testDb = db;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await clearTestData(testDb);
  });

  describe('Index Creation', () => {
    it('should have indexes on sessions table', async () => {
      const result = await testDb.execute(sql`
        SELECT indexname FROM pg_indexes WHERE tablename = 'sessions'
      `);
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should have indexes on foia_requests table', async () => {
      const result = await testDb.execute(sql`
        SELECT indexname FROM pg_indexes WHERE tablename = 'foia_requests'
      `);
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      await testDb.insert(schema.users).values({
        id: 'test-user-perf',
        email: 'perf@example.com',
        passwordHash: 'hash',
        role: 'civilian',
        firstName: 'Test',
        lastName: 'User',
        isAnonymous: false,
        isVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testDb.insert(schema.agencies).values({
        id: 'test-agency-perf',
        name: 'Performance Agency',
        jurisdictionLevel: 'federal',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push({
          id: `request-perf-${i}`,
          userId: 'test-user-perf',
          agencyId: 'test-agency-perf',
          category: 'incident_report' as const,
          title: `Test Request ${i}`,
          description: `Description ${i}`,
          status: (i % 2 === 0 ? 'draft' : 'submitted') as 'draft' | 'submitted',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      await testDb.insert(schema.foiaRequests).values(requests);
    });

    it('should execute user_id lookup efficiently', async () => {
      const start = Date.now();
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(sql`user_id = 'test-user-perf'`);
      const duration = Date.now() - start;

      expect(results.length).toBe(10);
      expect(duration).toBeLessThan(100);
    });

    it('should execute status lookup efficiently', async () => {
      const start = Date.now();
      const results = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(sql`status = 'submitted'`);
      const duration = Date.now() - start;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('N+1 Query Prevention', () => {
    beforeEach(async () => {
      await testDb.insert(schema.users).values({
        id: 'test-user-n1',
        email: 'n1@example.com',
        passwordHash: 'hash',
        role: 'civilian',
        firstName: 'Test',
        lastName: 'User',
        isAnonymous: false,
        isVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await testDb.insert(schema.agencies).values({
        id: 'test-agency-n1',
        name: 'N+1 Test Agency',
        jurisdictionLevel: 'federal',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push({
          id: `request-n1-${i}`,
          userId: 'test-user-n1',
          agencyId: 'test-agency-n1',
          category: 'incident_report' as const,
          title: `Test ${i}`,
          description: `Desc ${i}`,
          status: 'draft' as const,
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      await testDb.insert(schema.foiaRequests).values(requests);
    });

    it('should fetch requests with agencies via JOIN', async () => {
      const result = await testDb.execute(sql`
        SELECT r.id, r.title, a.name as agency_name
        FROM foia_requests r
        INNER JOIN agencies a ON r.agency_id = a.id
        WHERE r.user_id = 'test-user-n1'
      `);

      expect(result.rows.length).toBe(5);
    });
  });

  describe('Audit Log Performance', () => {
    beforeEach(async () => {
      await testDb
        .insert(schema.users)
        .values({
          id: 'test-user-audit',
          email: 'audit@example.com',
          passwordHash: 'hash',
          role: 'civilian',
          firstName: 'Test',
          lastName: 'User',
          isAnonymous: false,
          isVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      const actions = ['user_login', 'user_logout', 'request_created', 'document_viewed'] as const;
      const logs: (typeof schema.auditLogs.$inferInsert)[] = [];
      for (let i = 0; i < 20; i++) {
        logs.push({
          id: `audit-perf-${i}`,
          userId: 'test-user-audit',
          action: actions[i % 4] as AuditAction,
          resourceType: 'user',
          resourceId: 'test-user-audit',
          createdAt: new Date(Date.now() - i * 3600000),
        });
      }
      await testDb.insert(schema.auditLogs).values(logs);
    });

    it('should query audit logs by action efficiently', async () => {
      const start = Date.now();
      const results = await testDb
        .select()
        .from(schema.auditLogs)
        .where(sql`action = 'user_login'`);
      const duration = Date.now() - start;

      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(100);
    });

    it('should query audit logs by user efficiently', async () => {
      const start = Date.now();
      const results = await testDb
        .select()
        .from(schema.auditLogs)
        .where(sql`user_id = 'test-user-audit'`);
      const duration = Date.now() - start;

      expect(results.length).toBe(20);
      expect(duration).toBeLessThan(100);
    });
  });
});
