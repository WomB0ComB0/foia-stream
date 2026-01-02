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
 * @file Secure Session Service
 * @module services/secure-session
 * @author FOIA Stream Team
 * @description Handles session management with encrypted PII (IP addresses, user agents).
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { UAParser } from 'ua-parser-js';

import { env } from '@/config/env';
import { db, schema } from '@/db';
import { decryptData, encryptData } from '@/utils/security';

/**
 * Session metadata that gets encrypted
 */
interface SessionMetadata {
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
}

/**
 * Secure Session Service
 *
 * @class SecureSessionService
 * @description Manages sessions with encrypted IP addresses and device info.
 */
export class SecureSessionService {
  private encryptionKey: string;

  constructor() {
    this.encryptionKey = env.DATA_ENCRYPTION_KEY;
  }

  /**
   * Encrypt session metadata
   */
  private async encryptMetadata(metadata: SessionMetadata): Promise<{
    ipAddress: string | null;
    userAgent: string | null;
    deviceName: string | null;
  }> {
    return {
      ipAddress: metadata.ipAddress
        ? await encryptData(metadata.ipAddress, this.encryptionKey)
        : null,
      userAgent: metadata.userAgent
        ? await encryptData(metadata.userAgent, this.encryptionKey)
        : null,
      deviceName: metadata.deviceName
        ? await encryptData(metadata.deviceName, this.encryptionKey)
        : null,
    };
  }

  /**
   * Decrypt session metadata
   */
  private async decryptMetadata(encrypted: {
    ipAddress: string | null;
    userAgent: string | null;
    deviceName: string | null;
  }): Promise<SessionMetadata> {
    return {
      ipAddress: encrypted.ipAddress
        ? await decryptData(encrypted.ipAddress, this.encryptionKey)
        : null,
      userAgent: encrypted.userAgent
        ? await decryptData(encrypted.userAgent, this.encryptionKey)
        : null,
      deviceName: encrypted.deviceName
        ? await decryptData(encrypted.deviceName, this.encryptionKey)
        : null,
    };
  }

  /**
   * Parse user agent to get a friendly device name
   */
  private getDeviceName(userAgent: string | null): string | null {
    if (!userAgent) return null;

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    const browserName = browser.name || 'Unknown Browser';
    const osName = os.name || 'Unknown OS';

    return `${browserName} on ${osName}`;
  }

  /**
   * Create a new encrypted session
   */
  async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const sessionId = nanoid();
    const now = new Date();

    const encryptedMetadata = await this.encryptMetadata({
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      deviceName: this.getDeviceName(userAgent || null),
    });

    await db.insert(schema.sessions).values({
      id: sessionId,
      userId,
      token,
      expiresAt,
      ipAddress: encryptedMetadata.ipAddress,
      userAgent: encryptedMetadata.userAgent,
      deviceName: encryptedMetadata.deviceName,
      lastActiveAt: now,
      createdAt: now,
    });

    return sessionId;
  }

  /**
   * Update session last active time
   */
  async updateLastActive(sessionId: string): Promise<void> {
    await db
      .update(schema.sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));
  }

  /**
   * Get all sessions for a user with decrypted metadata
   */
  async getUserSessions(
    userId: string,
    currentToken?: string,
  ): Promise<
    Array<{
      id: string;
      deviceName: string | null;
      ipAddress: string | null;
      lastActiveAt: Date | null;
      createdAt: Date;
      isCurrent: boolean;
    }>
  > {
    const sessions = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, userId));

    const decryptedSessions = await Promise.all(
      sessions.map(async (session: typeof schema.sessions.$inferSelect) => {
        let decryptedMetadata: SessionMetadata = {
          ipAddress: null,
          userAgent: null,
          deviceName: null,
        };

        try {
          decryptedMetadata = await this.decryptMetadata({
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            deviceName: session.deviceName,
          });
        } catch {
          // If decryption fails (legacy data), use raw values masked
          decryptedMetadata = {
            ipAddress: session.ipAddress ? '***encrypted***' : null,
            userAgent: null,
            deviceName: session.deviceName || 'Unknown Device',
          };
        }

        // Mask IP for display (show only last octet for privacy)
        let maskedIp = decryptedMetadata.ipAddress;
        if (maskedIp && maskedIp !== '***encrypted***') {
          const parts = maskedIp.split('.');
          if (parts.length === 4) {
            maskedIp = `***.***.***.${parts[3]}`;
          }
        }

        return {
          id: session.id,
          deviceName: decryptedMetadata.deviceName,
          ipAddress: maskedIp,
          lastActiveAt: session.lastActiveAt,
          createdAt: session.createdAt,
          isCurrent: currentToken ? session.token === currentToken : false,
        };
      }),
    );

    return decryptedSessions;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  }
}

export const secureSessionService = new SecureSessionService();
