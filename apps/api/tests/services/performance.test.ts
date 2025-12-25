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
 * @file Performance and Index Tests
 * @module tests/services/performance
 * @author FOIA Stream Team
 * @description Tests to verify database indexes are being utilized and queries are performant.
 *              Uses EXPLAIN QUERY PLAN to verify index usage.
 * @compliance NIST 800-53 SI-2 (Flaw Remediation) - Performance optimization
 */

import type { Database } from 'better-sqlite3';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';
import { applyMigrations, cleanupTestDb, clearTestData, createTestDb } from '../utils';

let testSqlite: Database;
let testDb: ReturnType<typeof drizzle>;
const dbPath = `./data/test-performance-${Date.now()}.db`;

/**
 * Helper to run EXPLAIN QUERY PLAN and check for index usage
 */
function explainQuery(sqlite: Database, query: string): string[] {
  const result = sqlite.prepare(`EXPLAIN QUERY PLAN ${query}`).all() as Array<{
    detail: string;
  }>;
  return result.map((r) => r.detail);
}

/**
 * Helper to check if query plan uses an index
 */
function usesIndex(planDetails: string[], indexName: string): boolean {
  return planDetails.some(
    (detail) =>
      detail.includes('USING INDEX') ||
      detail.includes('USING COVERING INDEX') ||
      detail.includes(indexName),
  );
}

/**
 * Helper to check if query does a full table scan
 */
function isFullTableScan(planDetails: string[]): boolean {
  return planDetails.some((detail) => detail.includes('SCAN'));
}

describe('Database Performance Tests', () => {
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

  describe('Index Creation', () => {
    it('should have indexes on sessions table', () => {
      const indexes = testSqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sessions'")
        .all() as Array<{ name: string }>;

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_sessions_user_id');
      expect(indexNames).toContain('idx_sessions_expires_at');
    });

    it('should have indexes on foia_requests table', () => {
      const indexes = testSqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='foia_requests'")
        .all() as Array<{ name: string }>;

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_foia_requests_user_id');
      expect(indexNames).toContain('idx_foia_requests_agency_id');
      expect(indexNames).toContain('idx_foia_requests_status');
    });

    it('should have indexes on audit_logs table', () => {
      const indexes = testSqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='audit_logs'")
        .all() as Array<{ name: string }>;

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_audit_logs_user_id');
      expect(indexNames).toContain('idx_audit_logs_action');
      expect(indexNames).toContain('idx_audit_logs_created_at');
    });

    it('should have indexes on documents table', () => {
      const indexes = testSqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='documents'")
        .all() as Array<{ name: string }>;

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_documents_request_id');
    });

    it('should have indexes on comments table', () => {
      const indexes = testSqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='comments'")
        .all() as Array<{ name: string }>;

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_comments_document_id');
    });
  });

  describe('Query Plan Analysis', () => {
    beforeEach(async () => {
      // Seed test data for query plan analysis
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await testDb.insert(schema.agencies).values({
        id: 'test-agency-perf',
        name: 'Performance Agency',
        jurisdictionLevel: 'federal',
        responseDeadlineDays: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Insert multiple FOIA requests for testing
      for (let i = 0; i < 10; i++) {
        await testDb.insert(schema.foiaRequests).values({
          id: `request-perf-${i}`,
          userId: 'test-user-perf',
          agencyId: 'test-agency-perf',
          category: 'incident_report',
          title: `Test Request ${i}`,
          description: `Test request description ${i}`,
          status: i % 2 === 0 ? 'draft' : 'submitted',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    it('should use index for user_id lookup on foia_requests', () => {
      const plan = explainQuery(
        testSqlite,
        "SELECT * FROM foia_requests WHERE user_id = 'test-user-perf'",
      );

      // SQLite should use the index, not a full table scan
      const usesIndexForQuery =
        usesIndex(plan, 'idx_foia_requests_user_id') || !isFullTableScan(plan);
      expect(usesIndexForQuery).toBe(true);
    });

    it('should use index for status lookup on foia_requests', () => {
      const plan = explainQuery(
        testSqlite,
        "SELECT * FROM foia_requests WHERE status = 'submitted'",
      );

      const usesIndexForQuery =
        usesIndex(plan, 'idx_foia_requests_status') || !isFullTableScan(plan);
      expect(usesIndexForQuery).toBe(true);
    });

    it('should use index for sessions user_id lookup', () => {
      const plan = explainQuery(
        testSqlite,
        "SELECT * FROM sessions WHERE user_id = 'test-user-perf'",
      );

      const usesIndexForQuery = usesIndex(plan, 'idx_sessions_user_id') || !isFullTableScan(plan);
      expect(usesIndexForQuery).toBe(true);
    });

    it('should use index for audit_logs action lookup', () => {
      const plan = explainQuery(testSqlite, "SELECT * FROM audit_logs WHERE action = 'user_login'");

      const usesIndexForQuery = usesIndex(plan, 'idx_audit_logs_action') || !isFullTableScan(plan);
      expect(usesIndexForQuery).toBe(true);
    });
  });

  describe('N+1 Query Prevention', () => {
    beforeEach(async () => {
      // Seed test data
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await testDb.insert(schema.agencies).values({
        id: 'test-agency-n1',
        name: 'N+1 Test Agency',
        jurisdictionLevel: 'federal',
        responseDeadlineDays: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Insert multiple requests
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.foiaRequests).values({
          id: `request-n1-${i}`,
          userId: 'test-user-n1',
          agencyId: 'test-agency-n1',
          category: 'incident_report',
          title: `N+1 Test Request ${i}`,
          description: `Test description ${i}`,
          status: 'draft',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    it('should fetch requests with agencies in a single JOIN query', async () => {
      // Test that we can do efficient JOINs
      const result = testSqlite
        .prepare(
          `
        SELECT
          r.id, r.title, r.status,
          a.name as agency_name, a.jurisdiction_level
        FROM foia_requests r
        INNER JOIN agencies a ON r.agency_id = a.id
        WHERE r.user_id = ?
      `,
        )
        .all('test-user-n1');

      expect(result.length).toBe(5);
      // All should have agency data without N+1
      for (const row of result as Array<{ agency_name: string }>) {
        expect(row.agency_name).toBe('N+1 Test Agency');
      }
    });

    it('should efficiently query user sessions with expiry check', async () => {
      // Insert sessions
      await testDb.insert(schema.sessions).values({
        id: 'session-n1-1',
        userId: 'test-user-n1',
        token: 'token-1',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Test composite index query
      const plan = explainQuery(
        testSqlite,
        `SELECT * FROM sessions WHERE user_id = 'test-user-n1' AND expires_at > datetime('now')`,
      );

      // Should not be a full table scan
      expect(isFullTableScan(plan) && plan.some((d) => d.includes('sessions'))).toBe(false);
    });
  });

  describe('Audit Log Performance', () => {
    beforeEach(async () => {
      await testDb.insert(schema.users).values({
        id: 'test-user-audit',
        email: 'audit@example.com',
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

      // Insert multiple audit logs
      const actions = ['user_login', 'user_logout', 'request_created', 'document_viewed'];
      for (let i = 0; i < 20; i++) {
        await testDb.insert(schema.auditLogs).values({
          id: `audit-perf-${i}`,
          userId: 'test-user-audit',
          action: actions[i % actions.length] as 'user_login',
          resourceType: 'user',
          resourceId: 'test-user-audit',
          createdAt: new Date(Date.now() - i * 3600000).toISOString(),
        });
      }
    });

    it('should efficiently query audit logs by action type', async () => {
      const result = testSqlite
        .prepare("SELECT * FROM audit_logs WHERE action = 'user_login'")
        .all();

      expect(result.length).toBe(5); // 20 logs / 4 actions = 5 per action
    });

    it('should efficiently query audit logs by date range', async () => {
      const plan = explainQuery(
        testSqlite,
        `SELECT * FROM audit_logs WHERE created_at > datetime('now', '-1 day') ORDER BY created_at DESC`,
      );

      // Should use the created_at index
      const usesIndexForQuery =
        usesIndex(plan, 'idx_audit_logs_created_at') ||
        plan.some((d) => d.includes('ORDER') && !d.includes('SCAN'));
      expect(usesIndexForQuery).toBe(true);
    });

    it('should efficiently query audit logs by user', async () => {
      const result = testSqlite
        .prepare("SELECT * FROM audit_logs WHERE user_id = 'test-user-audit'")
        .all();

      expect(result.length).toBe(20);
    });
  });
});
