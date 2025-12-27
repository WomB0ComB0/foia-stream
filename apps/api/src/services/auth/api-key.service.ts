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
 * @file API Key Service
 * @module services/api-key
 * @author FOIA Stream Team
 * @description Manages user API keys for programmatic access.
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */

import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '@/db';

/**
 * API Key Service
 *
 * @class ApiKeyService
 * @description Manages API key generation, validation, and revocation.
 */
export class ApiKeyService {
  /**
   * Generate a secure API key
   */
  private generateKey(): string {
    const prefix = 'foia';
    const key = randomBytes(32).toString('base64url');
    return `${prefix}_${key}`;
  }

  /**
   * Get the current API key info for a user (without the actual key)
   */
  async getApiKey(userId: string) {
    const apiKey = await db
      .select({
        id: schema.apiKeys.id,
        keyPreview: schema.apiKeys.keyPreview,
        name: schema.apiKeys.name,
        createdAt: schema.apiKeys.createdAt,
        lastUsedAt: schema.apiKeys.lastUsedAt,
      })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId))
      .get();

    return apiKey || null;
  }

  /**
   * Create a new API key for a user (replaces existing if any)
   */
  async createApiKey(
    userId: string,
  ): Promise<{ id: string; key: string; name: string; createdAt: string }> {
    // Delete existing key if any
    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.userId, userId));

    // Generate new key
    const rawKey = this.generateKey();
    const keyHash = await argon2.hash(rawKey, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const id = nanoid();
    const keyPreview = `...${rawKey.slice(-8)}`;
    const now = new Date().toISOString();

    await db.insert(schema.apiKeys).values({
      id,
      userId,
      keyHash,
      keyPreview,
      name: 'Default',
      createdAt: now,
    });

    // Log the creation
    await db.insert(schema.auditLogs).values({
      id: nanoid(),
      userId,
      action: 'security_api_key_created',
      resourceType: 'api_key',
      resourceId: id,
      createdAt: now,
    });

    return {
      id,
      key: rawKey,
      name: 'Default',
      createdAt: now,
    };
  }

  /**
   * Delete the API key for a user
   */
  async deleteApiKey(userId: string): Promise<void> {
    const existing = await db
      .select({ id: schema.apiKeys.id })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId))
      .get();

    if (existing) {
      await db.delete(schema.apiKeys).where(eq(schema.apiKeys.userId, userId));

      // Log the revocation
      await db.insert(schema.auditLogs).values({
        id: nanoid(),
        userId,
        action: 'security_api_key_revoked',
        resourceType: 'api_key',
        resourceId: existing.id,
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Validate an API key and return the user ID if valid
   */
  async validateApiKey(key: string): Promise<string | null> {
    // Get all API keys (in a real app, you'd want to optimize this)
    const apiKeys = await db.select().from(schema.apiKeys).all();

    for (const apiKey of apiKeys) {
      const isValid = await argon2.verify(apiKey.keyHash, key);
      if (isValid) {
        // Update last used
        await db
          .update(schema.apiKeys)
          .set({ lastUsedAt: new Date().toISOString() })
          .where(eq(schema.apiKeys.id, apiKey.id));

        return apiKey.userId;
      }
    }

    return null;
  }
}

export const apiKeyService = new ApiKeyService();
