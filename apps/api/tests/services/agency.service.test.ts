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
// FOIA Stream - Agency Service Tests
// ============================================

import type { Database } from 'better-sqlite3';
import { eq, like } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';
import { applyMigrations, cleanupTestDb, clearTestData, createTestDb, testData } from '../utils';

let testSqlite: Database;
let testDb: ReturnType<typeof drizzle>;
const dbPath = `./data/test-agency-${Date.now()}.db`;

describe('AgencyService', () => {
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

  describe('createAgency', () => {
    it('should create a federal agency', async () => {
      const agencyData = testData.agency({
        name: 'Federal Bureau of Investigation',
        abbreviation: 'FBI',
        jurisdictionLevel: 'federal',
      });

      const result = await testDb
        .insert(schema.agencies)
        .values({
          id: 'agency-1',
          name: agencyData.name,
          abbreviation: agencyData.abbreviation,
          jurisdictionLevel: agencyData.jurisdictionLevel,
          foiaEmail: agencyData.foiaEmail,
          responseDeadlineDays: agencyData.responseDeadlineDays,
          appealDeadlineDays: agencyData.appealDeadlineDays,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Federal Bureau of Investigation');
      expect(result[0].abbreviation).toBe('FBI');
      expect(result[0].jurisdictionLevel).toBe('federal');
    });

    it('should create a state agency with state field', async () => {
      const result = await testDb
        .insert(schema.agencies)
        .values({
          id: 'agency-state-1',
          name: 'California Department of Justice',
          abbreviation: 'CA DOJ',
          jurisdictionLevel: 'state',
          state: 'CA',
          foiaEmail: 'foia@doj.ca.gov',
          responseDeadlineDays: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result[0].jurisdictionLevel).toBe('state');
      expect(result[0].state).toBe('CA');
    });

    it('should create a local agency with city field', async () => {
      const result = await testDb
        .insert(schema.agencies)
        .values({
          id: 'agency-local-1',
          name: 'New York Police Department',
          abbreviation: 'NYPD',
          jurisdictionLevel: 'local',
          state: 'NY',
          city: 'New York',
          foiaEmail: 'foil@nypd.org',
          responseDeadlineDays: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result[0].jurisdictionLevel).toBe('local');
      expect(result[0].city).toBe('New York');
    });

    it('should create a county agency', async () => {
      const result = await testDb
        .insert(schema.agencies)
        .values({
          id: 'agency-county-1',
          name: 'Los Angeles County Sheriff',
          abbreviation: 'LASD',
          jurisdictionLevel: 'county',
          state: 'CA',
          county: 'Los Angeles',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result[0].jurisdictionLevel).toBe('county');
      expect(result[0].county).toBe('Los Angeles');
    });
  });

  describe('updateAgency', () => {
    it('should update agency information', async () => {
      // Create agency
      await testDb.insert(schema.agencies).values({
        id: 'agency-update-1',
        name: 'Original Name',
        jurisdictionLevel: 'federal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update agency
      const result = await testDb
        .update(schema.agencies)
        .set({
          name: 'Updated Name',
          foiaEmail: 'new-email@agency.gov',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.agencies.id, 'agency-update-1'))
        .returning();

      expect(result[0].name).toBe('Updated Name');
      expect(result[0].foiaEmail).toBe('new-email@agency.gov');
    });

    it('should update response deadline days', async () => {
      await testDb.insert(schema.agencies).values({
        id: 'agency-deadline-1',
        name: 'Test Agency',
        jurisdictionLevel: 'federal',
        responseDeadlineDays: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .update(schema.agencies)
        .set({ responseDeadlineDays: 30 })
        .where(eq(schema.agencies.id, 'agency-deadline-1'))
        .returning();

      expect(result[0].responseDeadlineDays).toBe(30);
    });
  });

  describe('searchAgencies', () => {
    beforeEach(async () => {
      // Seed test agencies
      await testDb.insert(schema.agencies).values([
        {
          id: 'search-agency-1',
          name: 'Federal Bureau of Investigation',
          abbreviation: 'FBI',
          jurisdictionLevel: 'federal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'search-agency-2',
          name: 'Central Intelligence Agency',
          abbreviation: 'CIA',
          jurisdictionLevel: 'federal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'search-agency-3',
          name: 'California Highway Patrol',
          abbreviation: 'CHP',
          jurisdictionLevel: 'state',
          state: 'CA',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'search-agency-4',
          name: 'Los Angeles Police Department',
          abbreviation: 'LAPD',
          jurisdictionLevel: 'local',
          state: 'CA',
          city: 'Los Angeles',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    });

    it('should search by name', async () => {
      const results = await testDb
        .select()
        .from(schema.agencies)
        .where(like(schema.agencies.name, '%Bureau%'));

      expect(results).toHaveLength(1);
      expect(results[0].name).toContain('Bureau');
    });

    it('should search by abbreviation', async () => {
      const results = await testDb
        .select()
        .from(schema.agencies)
        .where(eq(schema.agencies.abbreviation, 'FBI'));

      expect(results).toHaveLength(1);
      expect(results[0].abbreviation).toBe('FBI');
    });

    it('should filter by jurisdiction level', async () => {
      const results = await testDb
        .select()
        .from(schema.agencies)
        .where(eq(schema.agencies.jurisdictionLevel, 'federal'));

      expect(results).toHaveLength(2);
      expect(results.every((a) => a.jurisdictionLevel === 'federal')).toBe(true);
    });

    it('should filter by state', async () => {
      const results = await testDb
        .select()
        .from(schema.agencies)
        .where(eq(schema.agencies.state, 'CA'));

      expect(results).toHaveLength(2);
      expect(results.every((a) => a.state === 'CA')).toBe(true);
    });

    it('should return all agencies when no filters', async () => {
      const results = await testDb.select().from(schema.agencies);

      expect(results).toHaveLength(4);
    });
  });

  describe('getAgencyById', () => {
    it('should return agency by ID', async () => {
      await testDb.insert(schema.agencies).values({
        id: 'get-agency-1',
        name: 'Test Get Agency',
        jurisdictionLevel: 'federal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await testDb
        .select()
        .from(schema.agencies)
        .where(eq(schema.agencies.id, 'get-agency-1'))
        .get();

      expect(result).toBeDefined();
      expect(result?.name).toBe('Test Get Agency');
    });

    it('should return undefined for non-existent ID', async () => {
      const result = await testDb
        .select()
        .from(schema.agencies)
        .where(eq(schema.agencies.id, 'non-existent-id'))
        .get();

      expect(result).toBeUndefined();
    });
  });

  describe('agency statistics', () => {
    it('should track request counts per agency', async () => {
      // Create agency
      await testDb.insert(schema.agencies).values({
        id: 'stats-agency-1',
        name: 'Statistics Agency',
        jurisdictionLevel: 'federal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create user
      await testDb.insert(schema.users).values({
        id: 'stats-user-1',
        email: 'stats@example.com',
        passwordHash: 'hash',
        role: 'civilian',
        firstName: 'Stats',
        lastName: 'User',
        isAnonymous: false,
        isVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create requests
      await testDb.insert(schema.foiaRequests).values([
        {
          id: 'stats-request-1',
          userId: 'stats-user-1',
          agencyId: 'stats-agency-1',
          category: 'incident_report',
          title: 'Request 1',
          description: 'Description 1',
          status: 'submitted',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'stats-request-2',
          userId: 'stats-user-1',
          agencyId: 'stats-agency-1',
          category: 'body_cam_footage',
          title: 'Request 2',
          description: 'Description 2',
          status: 'fulfilled',
          isPublic: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      // Count requests for agency
      const requests = await testDb
        .select()
        .from(schema.foiaRequests)
        .where(eq(schema.foiaRequests.agencyId, 'stats-agency-1'));

      expect(requests).toHaveLength(2);

      // Count by status
      const submitted = requests.filter((r) => r.status === 'submitted');
      const fulfilled = requests.filter((r) => r.status === 'fulfilled');

      expect(submitted).toHaveLength(1);
      expect(fulfilled).toHaveLength(1);
    });
  });

  describe('US States', () => {
    it('should have valid US state codes', () => {
      const validStates = [
        'AL',
        'AK',
        'AZ',
        'AR',
        'CA',
        'CO',
        'CT',
        'DE',
        'FL',
        'GA',
        'HI',
        'ID',
        'IL',
        'IN',
        'IA',
        'KS',
        'KY',
        'LA',
        'ME',
        'MD',
        'MA',
        'MI',
        'MN',
        'MS',
        'MO',
        'MT',
        'NE',
        'NV',
        'NH',
        'NJ',
        'NM',
        'NY',
        'NC',
        'ND',
        'OH',
        'OK',
        'OR',
        'PA',
        'RI',
        'SC',
        'SD',
        'TN',
        'TX',
        'UT',
        'VT',
        'VA',
        'WA',
        'WV',
        'WI',
        'WY',
        'DC',
        'PR',
        'VI',
        'GU',
        'AS',
        'MP',
      ];

      expect(validStates).toHaveLength(56);
      expect(validStates).toContain('CA');
      expect(validStates).toContain('NY');
      expect(validStates).toContain('TX');
    });
  });
});
