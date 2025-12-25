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
// FOIA Stream - API Integration Tests
// ============================================

import type { Database } from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { Hono } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';
import { applyMigrations, cleanupTestDb, clearTestData, createTestDb, testData } from '../utils';

let testSqlite: Database;
let testDb: ReturnType<typeof drizzle>;
const dbPath = `./data/test-api-${Date.now()}.db`;

// Create a minimal test app that mimics the main app structure
function createTestApp() {
  const app = new Hono();

  // Health check
  app.get('/', (c) => {
    return c.json({
      name: 'FOIA Stream API',
      version: '1.0.0',
      status: 'healthy',
    });
  });

  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

describe('API Integration Tests', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    const { db, sqlite } = createTestDb(dbPath);
    testSqlite = sqlite;
    testDb = db;
    applyMigrations(testDb);
    app = createTestApp();
  });

  afterAll(async () => {
    cleanupTestDb(testSqlite, dbPath);
  });

  beforeEach(async () => {
    clearTestData(testSqlite);
  });

  describe('Health Endpoints', () => {
    it('should return API info on root endpoint', async () => {
      const res = await app.request('/');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.name).toBe('FOIA Stream API');
      expect(data.version).toBe('1.0.0');
      expect(data.status).toBe('healthy');
    });

    it('should return health status', async () => {
      const res = await app.request('/health');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return JSON content type', async () => {
      const res = await app.request('/');

      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });
});

describe('Auth API Tests', () => {
  let app: Hono;

  beforeAll(async () => {
    const { db, sqlite } = createTestDb(`./data/test-auth-api-${Date.now()}.db`);
    testSqlite = sqlite;
    testDb = db;
    applyMigrations(testDb);

    // Create a test auth app
    app = new Hono();

    // Mock register endpoint
    app.post('/api/v1/auth/register', async (c) => {
      try {
        const body = await c.req.json();

        // Validate required fields
        if (!body.email || !body.password || !body.firstName || !body.lastName) {
          return c.json(
            {
              success: false,
              error: 'Validation Error',
              message: 'Missing required fields',
            },
            400,
          );
        }

        // Check email format
        if (!body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          return c.json(
            {
              success: false,
              error: 'Validation Error',
              message: 'Invalid email address',
            },
            400,
          );
        }

        // Check password length
        if (body.password.length < 8) {
          return c.json(
            {
              success: false,
              error: 'Validation Error',
              message: 'Password must be at least 8 characters',
            },
            400,
          );
        }

        // Insert user
        const result = await testDb
          .insert(schema.users)
          .values({
            id: `user-${Date.now()}`,
            email: body.email.toLowerCase(),
            passwordHash: `hashed_${body.password}`,
            role: body.role || 'civilian',
            firstName: body.firstName,
            lastName: body.lastName,
            organization: body.organization,
            isAnonymous: body.isAnonymous || false,
            isVerified: false,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning();

        const { passwordHash, ...user } = result[0] || {};

        return c.json(
          {
            success: true,
            data: user,
            message: 'Account created successfully',
          },
          201,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        return c.json({ success: false, error: message }, 400);
      }
    });

    // Mock login endpoint
    app.post('/api/v1/auth/login', async (c) => {
      try {
        const body = await c.req.json();

        if (!body.email || !body.password) {
          return c.json(
            {
              success: false,
              error: 'Validation Error',
            },
            400,
          );
        }

        // Find user
        const users = await testDb
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, body.email.toLowerCase()));

        const user = users[0];

        if (!user || user.passwordHash !== `hashed_${body.password}`) {
          return c.json(
            {
              success: false,
              error: 'Invalid credentials',
            },
            401,
          );
        }

        const { passwordHash, ...userWithoutPassword } = user;

        return c.json({
          success: true,
          data: {
            token: 'test-jwt-token',
            user: userWithoutPassword,
          },
          message: 'Login successful',
        });
      } catch (_error) {
        return c.json({ success: false, error: 'Login failed' }, 401);
      }
    });
  });

  afterAll(async () => {
    cleanupTestDb(testSqlite, `./data/test-auth-api-${Date.now()}.db`);
  });

  beforeEach(async () => {
    clearTestData(testSqlite);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = testData.user();

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(userData.email.toLowerCase());
      expect(data.data.firstName).toBe(userData.firstName);
      expect(data.data.lastName).toBe(userData.lastName);
      expect(data.data.passwordHash).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = testData.user({ email: 'invalid-email' });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Validation Error');
    });

    it('should reject registration with short password', async () => {
      const userData = testData.user({ password: 'short' });

      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should reject registration with missing fields', async () => {
      const res = await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const userData = testData.user();
      await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // Then login
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
        }),
      });

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.user).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      // First register a user
      const userData = testData.user();
      await app.request('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      // Try login with wrong password
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: 'wrong-password',
        }),
      });

      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'somepassword123',
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});

describe('Agency API Tests', () => {
  let app: Hono;

  beforeAll(async () => {
    const { db, sqlite } = createTestDb(`./data/test-agency-api-${Date.now()}.db`);
    testSqlite = sqlite;
    testDb = db;
    applyMigrations(testDb);

    app = new Hono();

    // Mock GET /api/v1/agencies
    app.get('/api/v1/agencies', async (c) => {
      try {
        const query = c.req.query('query');
        const jurisdictionLevel = c.req.query('jurisdictionLevel');
        const state = c.req.query('state');

        let results = await testDb.select().from(schema.agencies);

        if (query) {
          results = results.filter(
            (a) =>
              a.name.toLowerCase().includes(query.toLowerCase()) ||
              a.abbreviation?.toLowerCase().includes(query.toLowerCase()),
          );
        }

        if (jurisdictionLevel) {
          results = results.filter((a) => a.jurisdictionLevel === jurisdictionLevel);
        }

        if (state) {
          results = results.filter((a) => a.state === state);
        }

        return c.json({
          success: true,
          data: results,
          pagination: {
            page: 1,
            pageSize: 20,
            total: results.length,
          },
        });
      } catch (_error) {
        return c.json({ success: false, error: 'Search failed' }, 400);
      }
    });

    // Mock GET /api/v1/agencies/states
    app.get('/api/v1/agencies/states', (c) => {
      return c.json({
        success: true,
        data: [
          { code: 'CA', name: 'California' },
          { code: 'NY', name: 'New York' },
          { code: 'TX', name: 'Texas' },
        ],
      });
    });
  });

  beforeEach(async () => {
    clearTestData(testSqlite);

    // Seed agencies
    await testDb.insert(schema.agencies).values([
      {
        id: 'api-agency-1',
        name: 'Federal Bureau of Investigation',
        abbreviation: 'FBI',
        jurisdictionLevel: 'federal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'api-agency-2',
        name: 'California Highway Patrol',
        abbreviation: 'CHP',
        jurisdictionLevel: 'state',
        state: 'CA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  describe('GET /api/v1/agencies', () => {
    it('should return list of agencies', async () => {
      const res = await app.request('/api/v1/agencies');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toBeDefined();
    });

    it('should search agencies by query', async () => {
      const res = await app.request('/api/v1/agencies?query=FBI');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].abbreviation).toBe('FBI');
    });

    it('should filter by jurisdiction level', async () => {
      const res = await app.request('/api/v1/agencies?jurisdictionLevel=federal');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].jurisdictionLevel).toBe('federal');
    });

    it('should filter by state', async () => {
      const res = await app.request('/api/v1/agencies?state=CA');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].state).toBe('CA');
    });
  });

  describe('GET /api/v1/agencies/states', () => {
    it('should return list of US states', async () => {
      const res = await app.request('/api/v1/agencies/states');

      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data[0]).toHaveProperty('code');
      expect(data.data[0]).toHaveProperty('name');
    });
  });
});

describe('Request Validation Tests', () => {
  it('should validate email format', () => {
    const validEmails = ['test@example.com', 'user.name@domain.org', 'user+tag@example.co.uk'];

    const invalidEmails = ['invalid', '@example.com', 'test@', 'test @example.com'];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('should validate password requirements', () => {
    const validPasswords = ['password123', 'MySecureP@ss', 'abcdefgh'];

    const invalidPasswords = ['short', '1234567', 'abc'];

    validPasswords.forEach((password) => {
      expect(password.length >= 8).toBe(true);
    });

    invalidPasswords.forEach((password) => {
      expect(password.length >= 8).toBe(false);
    });
  });
});
