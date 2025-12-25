/**
 * @file Data Retention Service
 * @module services/data-retention
 * @description Handles automatic data purging and retention policies for GDPR/CCPA compliance.
 *              Implements 90-day retention for FOIA request content after completion.
 * @compliance GDPR Article 5 (Storage limitation), CCPA 1798.105 (Right to deletion)
 * @compliance NIST 800-53 SI-12 (Information Management and Retention)
 */

import { and, eq, lt, sql } from 'drizzle-orm';

import { db } from '@/db';
import { auditLogs, foiaRequests, sessions } from '@/db/schema';

/**
 * Data retention configuration
 * @constant
 */
export const RETENTION_CONFIG = {
  /** Days to retain FOIA request content after completion */
  REQUEST_CONTENT_DAYS: 90,
  /** Days to retain inactive sessions */
  SESSION_INACTIVE_DAYS: 30,
  /** Days to retain audit logs */
  AUDIT_LOG_DAYS: 365,
} as const;

/**
 * Calculates the purge date for a completed request
 *
 * @param {Date} completedAt - Date the request was completed
 * @returns {Date} Date when content should be purged
 */
export function calculatePurgeDate(completedAt: Date): Date {
  const purgeDate = new Date(completedAt);
  purgeDate.setDate(purgeDate.getDate() + RETENTION_CONFIG.REQUEST_CONTENT_DAYS);
  return purgeDate;
}

/**
 * Sets the content purge date for a completed request
 *
 * @param {string} requestId - ID of the completed request
 * @returns {Promise<void>}
 */
export async function setContentPurgeDate(requestId: string): Promise<void> {
  const request = await db.query.foiaRequests.findFirst({
    where: eq(foiaRequests.id, requestId),
  });

  if (!request || !request.completedAt) {
    return;
  }

  const purgeDate = calculatePurgeDate(new Date(request.completedAt));

  await db
    .update(foiaRequests)
    .set({
      contentPurgeAt: purgeDate.toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(foiaRequests.id, requestId));
}

/**
 * Hashes content for reference after purge
 *
 * @param {string} content - Content to hash
 * @returns {Promise<string>} SHA-256 hash of the content
 */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Purges content from requests that have exceeded retention period
 * Replaces title and description with placeholder text, keeps metadata
 *
 * @returns {Promise<{purgedCount: number, errors: string[]}>} Results of purge operation
 * @compliance GDPR Article 17 (Right to erasure)
 */
export async function purgeExpiredRequestContent(): Promise<{
  purgedCount: number;
  errors: string[];
}> {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let purgedCount = 0;

  try {
    // Find requests with expired content that haven't been purged
    const expiredRequests = await db.query.foiaRequests.findMany({
      where: and(
        eq(foiaRequests.contentPurged, false),
        lt(foiaRequests.contentPurgeAt, now)
      ),
    });

    for (const request of expiredRequests) {
      try {
        // Hash the title for reference
        const titleHash = await hashContent(request.title);

        // Purge the content
        await db
          .update(foiaRequests)
          .set({
            title: '[Content purged per data retention policy]',
            description: '[Content purged per data retention policy - retained for 90 days after completion]',
            titleHash,
            contentPurged: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(foiaRequests.id, request.id));

        // Log the purge action
        await db.insert(auditLogs).values({
          id: crypto.randomUUID(),
          userId: request.userId,
          action: 'retention_content_purge',
          resourceType: 'foia_request',
          resourceId: request.id,
          details: {
            originalTitleHash: titleHash,
            purgeReason: 'automated_retention_policy',
            retentionDays: RETENTION_CONFIG.REQUEST_CONTENT_DAYS,
          },
        });

        purgedCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to purge request ${request.id}: ${errorMessage}`);
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Failed to query expired requests: ${errorMessage}`);
  }

  return { purgedCount, errors };
}

/**
 * Purges inactive sessions that exceed retention period
 *
 * @returns {Promise<{purgedCount: number}>} Number of sessions purged
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
export async function purgeInactiveSessions(): Promise<{ purgedCount: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.SESSION_INACTIVE_DAYS);
  const cutoffISO = cutoffDate.toISOString();
  const now = new Date().toISOString();

  // First count how many will be deleted
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(
      sql`${sessions.expiresAt} < ${now} OR
          (${sessions.lastActiveAt} IS NOT NULL AND ${sessions.lastActiveAt} < ${cutoffISO})`
    );

  const purgedCount = countResult[0]?.count ?? 0;

  // Delete sessions where lastActiveAt is older than cutoff or expired
  if (purgedCount > 0) {
    await db
      .delete(sessions)
      .where(
        sql`${sessions.expiresAt} < ${now} OR
            (${sessions.lastActiveAt} IS NOT NULL AND ${sessions.lastActiveAt} < ${cutoffISO})`
      );
  }

  return { purgedCount };
}

/**
 * Gets data retention statistics for monitoring
 *
 * @returns {Promise<Object>} Retention statistics
 */
export async function getRetentionStats(): Promise<{
  pendingPurge: number;
  purgedRequests: number;
  expiredSessions: number;
}> {
  const now = new Date().toISOString();

  // Count requests pending purge
  const pendingPurgeResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(foiaRequests)
    .where(
      and(
        eq(foiaRequests.contentPurged, false),
        lt(foiaRequests.contentPurgeAt, now)
      )
    );

  // Count already purged requests
  const purgedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(foiaRequests)
    .where(eq(foiaRequests.contentPurged, true));

  // Count expired sessions
  const expiredSessionsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(lt(sessions.expiresAt, now));

  return {
    pendingPurge: pendingPurgeResult[0]?.count ?? 0,
    purgedRequests: purgedResult[0]?.count ?? 0,
    expiredSessions: expiredSessionsResult[0]?.count ?? 0,
  };
}

/**
 * Runs all data retention cleanup tasks
 * Should be called periodically (e.g., daily cron job)
 *
 * @returns {Promise<Object>} Combined results of all cleanup operations
 */
export async function runRetentionCleanup(): Promise<{
  requestContentPurged: number;
  sessionsPurged: number;
  errors: string[];
  timestamp: string;
}> {
  const { purgedCount: requestContentPurged, errors } = await purgeExpiredRequestContent();
  const { purgedCount: sessionsPurged } = await purgeInactiveSessions();

  return {
    requestContentPurged,
    sessionsPurged,
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Data Retention Service
 * Provides methods for managing data retention policies
 */
export const dataRetentionService = {
  calculatePurgeDate,
  setContentPurgeDate,
  purgeExpiredRequestContent,
  purgeInactiveSessions,
  getRetentionStats,
  runRetentionCleanup,
  RETENTION_CONFIG,
};

export default dataRetentionService;
