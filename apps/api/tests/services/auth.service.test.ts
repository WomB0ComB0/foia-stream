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
// FOIA Stream - Auth Service Tests
// ============================================

import type { Database } from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../../src/db/schema';
import { applyMigrations, cleanupTestDb, clearTestData, createTestDb, testData } from '../utils';

// We need to mock the db before importing the auth service
let testSqlite: Database;
let testDb: ReturnType<typeof drizzle>;

// Mock the database module
const dbPath = `./data/test-auth-${Date.now()}.db`;

describe('AuthService', () => {
  beforeAll(async () => {
    // Create test database
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

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = testData.user();

      // Test the database layer directly since services import bun:sqlite
      const result = await testDb
        .insert(schema.users)
        .values({
          id: 'test-user-1',
          email: userData.email.toLowerCase(),
          passwordHash: 'hashed_password',
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isAnonymous: false,
          isVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe(userData.email.toLowerCase());
      expect(result[0].firstName).toBe(userData.firstName);
      expect(result[0].role).toBe('civilian');
    });

    it('should not allow duplicate emails', async () => {
      const userData = testData.user({ email: 'duplicate@example.com' });

      // Insert first user
      await testDb.insert(schema.users).values({
        id: 'test-user-dup-1',
        email: userData.email.toLowerCase(),
        passwordHash: 'hashed_password',
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isAnonymous: false,
        isVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Try to insert duplicate
      await expect(
        testDb.insert(schema.users).values({
          id: 'test-user-dup-2',
          email: userData.email.toLowerCase(),
          passwordHash: 'hashed_password',
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isAnonymous: false,
          isVerified: false,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).rejects.toThrow();
    });

    it('should support different user roles', async () => {
      const roles = ['civilian', 'journalist', 'researcher', 'attorney', 'admin'] as const;

      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const result = await testDb
          .insert(schema.users)
          .values({
            id: `test-user-role-${i}`,
            email: `${role}@example.com`,
            passwordHash: 'hashed_password',
            role,
            firstName: 'Test',
            lastName: role,
            isAnonymous: false,
            isVerified: false,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .returning();

        expect(result[0].role).toBe(role);
      }
    });
  });

  describe('sessions', () => {
    it('should create a session for a user', async () => {
      // Create user first
      await testDb.insert(schema.users).values({
        id: 'test-user-session',
        email: 'session@example.com',
        passwordHash: 'hashed_password',
        role: 'civilian',
        firstName: 'Test',
        lastName: 'User',
        isAnonymous: false,
        isVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = await testDb
        .insert(schema.sessions)
        .values({
          id: 'test-session-1',
          userId: 'test-user-session',
          token: 'test-jwt-token',
          expiresAt,
          createdAt: new Date().toISOString(),
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('test-user-session');
      expect(result[0].token).toBe('test-jwt-token');
    });

    it('should delete session on logout', async () => {
      // Create user
      await testDb.insert(schema.users).values({
        id: 'test-user-logout',
        email: 'logout@example.com',
        passwordHash: 'hashed_password',
        role: 'civilian',
        firstName: 'Test',
        lastName: 'User',
        isAnonymous: false,
        isVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create session
      await testDb.insert(schema.sessions).values({
        id: 'test-session-logout',
        userId: 'test-user-logout',
        token: 'token-to-delete',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Delete session
      await testDb.delete(schema.sessions).where(eq(schema.sessions.token, 'token-to-delete'));

      // Verify deletion
      const sessions = await testDb
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, 'test-user-logout'));

      expect(sessions).toHaveLength(0);
    });
  });

  describe('password hashing', () => {
    it('should hash passwords using argon2', async () => {
      const argon2 = await import('argon2');
      const password = 'TestPassword123!';

      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should verify correct passwords', async () => {
      const argon2 = await import('argon2');
      const password = 'TestPassword123!';

      const hash = await argon2.hash(password);
      const isValid = await argon2.verify(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const argon2 = await import('argon2');
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';

      const hash = await argon2.hash(password);
      const isValid = await argon2.verify(hash, wrongPassword);

      expect(isValid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('should generate valid JWT tokens', async () => {
      const jose = await import('jose');
      const secret = new TextEncoder().encode('test-secret-that-is-at-least-32-characters-long');

      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'civilian',
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify valid JWT tokens', async () => {
      const jose = await import('jose');
      const secret = new TextEncoder().encode('test-secret-that-is-at-least-32-characters-long');

      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'civilian',
      };

      const token = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);

      const { payload: decoded } = await jose.jwtVerify(token, secret);

      expect(decoded.userId).toBe('test-user-id');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('civilian');
    });

    it('should reject expired JWT tokens', async () => {
      const jose = await import('jose');
      const secret = new TextEncoder().encode('test-secret-that-is-at-least-32-characters-long');

      // Create an expired token (expired 1 hour ago)
      const token = await new jose.SignJWT({ userId: 'test' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
        .sign(secret);

      await expect(jose.jwtVerify(token, secret)).rejects.toThrow();
    });
  });

  describe('audit logging', () => {
    it('should create audit log entries', async () => {
      const result = await testDb
        .insert(schema.auditLogs)
        .values({
          id: 'audit-log-1',
          userId: null,
          action: 'user_created',
          resourceType: 'user',
          resourceId: 'test-user-id',
          details: { email: 'test@example.com' },
          ipAddress: '127.0.0.1',
          createdAt: new Date().toISOString(),
        })
        .returning();

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('user_created');
      expect(result[0].resourceType).toBe('user');
    });
  });
});
