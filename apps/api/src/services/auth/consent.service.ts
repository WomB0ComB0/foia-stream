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
 * @file Consent Service
 * @module services/consent
 * @description Manages user consent tracking for GDPR/CCPA compliance.
 *              Records consent history and allows withdrawal.
 * @compliance GDPR Article 7 (Conditions for consent), GDPR Article 17 (Right to erasure)
 * @compliance CCPA 1798.100 (Right to know), CCPA 1798.120 (Right to opt-out)
 */

import { eq } from 'drizzle-orm';
import { Schema as S } from 'effect';

import { db } from '@/db';
import { auditLogs, consentHistory, users } from '@/db/schema';
import { encrypt } from '@/utils/security';

/**
 * Consent types that can be tracked
 */
export type ConsentType = 'terms' | 'privacy' | 'data_processing' | 'marketing';

/**
 * Consent action types
 */
export type ConsentAction = 'given' | 'withdrawn';

/**
 * Consent data schema from registration
 * @schema
 */
export const ConsentDataSchema = S.Struct({
  termsAccepted: S.Boolean,
  privacyAccepted: S.Boolean,
  dataProcessingAccepted: S.Boolean,
  consentTimestamp: S.String,
});
export type ConsentData = typeof ConsentDataSchema.Type;

/**
 * Current policy versions (update when policies change)
 */
export const POLICY_VERSIONS = {
  terms: '2024.12.25',
  privacy: '2024.12.25',
  data_processing: '2024.12.25',
  marketing: '2024.12.25',
} as const;

/**
 * Records a consent action in the consent history
 *
 * @param {string} userId - User ID
 * @param {ConsentType} consentType - Type of consent
 * @param {ConsentAction} action - Whether consent was given or withdrawn
 * @param {string} [ipAddress] - IP address (will be encrypted)
 * @param {string} [userAgent] - User agent string
 * @returns {Promise<void>}
 */
async function recordConsentAction(
  userId: string,
  consentType: ConsentType,
  action: ConsentAction,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  // Encrypt IP address for privacy
  const encryptedIp = ipAddress ? await encrypt(ipAddress) : null;

  await db.insert(consentHistory).values({
    id: crypto.randomUUID(),
    userId,
    consentType,
    action,
    policyVersion: POLICY_VERSIONS[consentType],
    ipAddress: encryptedIp,
    userAgent: userAgent || null,
  });

  // Also log in audit trail
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId,
    action: action === 'given' ? 'consent_given' : 'consent_withdrawn',
    resourceType: 'consent',
    resourceId: consentType,
    details: {
      consentType,
      policyVersion: POLICY_VERSIONS[consentType],
    },
    ipAddress: encryptedIp,
    userAgent,
  });
}

/**
 * Records initial consent during user registration
 *
 * @param {string} userId - User ID
 * @param {ConsentData} consents - Consent data from registration
 * @param {string} [ipAddress] - IP address
 * @param {string} [userAgent] - User agent
 * @returns {Promise<void>}
 */
export async function recordRegistrationConsent(
  userId: string,
  consents: ConsentData,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  const timestamp = consents.consentTimestamp || new Date().toISOString();

  // Update user record with consent timestamps
  await db
    .update(users)
    .set({
      termsAcceptedAt: consents.termsAccepted ? timestamp : null,
      privacyAcceptedAt: consents.privacyAccepted ? timestamp : null,
      dataProcessingConsentAt: consents.dataProcessingAccepted ? timestamp : null,
      consentUpdatedAt: timestamp,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  // Record each consent in history
  if (consents.termsAccepted) {
    await recordConsentAction(userId, 'terms', 'given', ipAddress, userAgent);
  }
  if (consents.privacyAccepted) {
    await recordConsentAction(userId, 'privacy', 'given', ipAddress, userAgent);
  }
  if (consents.dataProcessingAccepted) {
    await recordConsentAction(userId, 'data_processing', 'given', ipAddress, userAgent);
  }
}

/**
 * Withdraws a specific consent type
 *
 * @param {string} userId - User ID
 * @param {ConsentType} consentType - Type of consent to withdraw
 * @param {string} [ipAddress] - IP address
 * @param {string} [userAgent] - User agent
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function withdrawConsent(
  userId: string,
  consentType: ConsentType,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; message: string }> {
  const now = new Date().toISOString();

  // Update the user record
  const updateData: Record<string, string | null> = {
    consentUpdatedAt: now,
    updatedAt: now,
  };

  switch (consentType) {
    case 'terms':
      updateData.termsAcceptedAt = null;
      break;
    case 'privacy':
      updateData.privacyAcceptedAt = null;
      break;
    case 'data_processing':
      updateData.dataProcessingConsentAt = null;
      break;
    case 'marketing':
      updateData.marketingConsentAt = null;
      break;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  // Record the withdrawal
  await recordConsentAction(userId, consentType, 'withdrawn', ipAddress, userAgent);

  return {
    success: true,
    message: `${consentType} consent has been withdrawn`,
  };
}

/**
 * Updates marketing consent
 *
 * @param {string} userId - User ID
 * @param {boolean} consent - Whether to opt in or out
 * @param {string} [ipAddress] - IP address
 * @param {string} [userAgent] - User agent
 * @returns {Promise<void>}
 */
export async function updateMarketingConsent(
  userId: string,
  consent: boolean,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .update(users)
    .set({
      marketingConsentAt: consent ? now : null,
      consentUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  await recordConsentAction(
    userId,
    'marketing',
    consent ? 'given' : 'withdrawn',
    ipAddress,
    userAgent,
  );
}

/**
 * Gets the current consent status for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Current consent status
 */
export async function getConsentStatus(userId: string): Promise<{
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  privacyAccepted: boolean;
  privacyAcceptedAt: string | null;
  dataProcessingAccepted: boolean;
  dataProcessingAcceptedAt: string | null;
  marketingAccepted: boolean;
  marketingAcceptedAt: string | null;
  lastUpdated: string | null;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      dataProcessingConsentAt: true,
      marketingConsentAt: true,
      consentUpdatedAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    termsAccepted: !!user.termsAcceptedAt,
    termsAcceptedAt: user.termsAcceptedAt,
    privacyAccepted: !!user.privacyAcceptedAt,
    privacyAcceptedAt: user.privacyAcceptedAt,
    dataProcessingAccepted: !!user.dataProcessingConsentAt,
    dataProcessingAcceptedAt: user.dataProcessingConsentAt,
    marketingAccepted: !!user.marketingConsentAt,
    marketingAcceptedAt: user.marketingConsentAt,
    lastUpdated: user.consentUpdatedAt,
  };
}

/**
 * Gets consent history for a user (for data export/GDPR requests)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Consent history records
 */
export async function getConsentHistory(userId: string): Promise<
  Array<{
    id: string;
    consentType: string;
    action: string;
    policyVersion: string | null;
    createdAt: string;
  }>
> {
  const history = await db.query.consentHistory.findMany({
    where: eq(consentHistory.userId, userId),
    orderBy: (consentHistory, { desc }) => [desc(consentHistory.createdAt)],
    columns: {
      id: true,
      consentType: true,
      action: true,
      policyVersion: true,
      createdAt: true,
    },
  });

  return history;
}

/**
 * Consent Service
 * Provides methods for managing user consent
 */
export const consentService = {
  recordRegistrationConsent,
  withdrawConsent,
  updateMarketingConsent,
  getConsentStatus,
  getConsentHistory,
  POLICY_VERSIONS,
};

export default consentService;
