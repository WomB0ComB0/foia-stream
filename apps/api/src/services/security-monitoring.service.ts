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
 * @file Security Monitoring Service
 * @module services/security-monitoring
 * @author FOIA Stream Team
 * @description Real-time security event monitoring and alerting system.
 *              Tracks failed logins, suspicious activity, and privilege escalation attempts.
 * @compliance NIST 800-53 AU-6 (Audit Review, Analysis, and Reporting) - GAP-002
 * @compliance SOC 2 CC7.2 (Security Event Monitoring)
 * @compliance ISO 27001 A.8.16 (Monitoring Activities)
 */

import { and, eq, gte, sql } from 'drizzle-orm';
import { Schema as S } from 'effect';
import { db } from '../db';
import { auditLogs } from '../db/schema';

// ============================================
// Effect Schema Type Definitions
// ============================================

export const SecurityEventTypeSchema = S.Literal(
  'failed_login',
  'successful_login',
  'account_lockout',
  'password_change',
  'mfa_enabled',
  'mfa_disabled',
  'privilege_escalation',
  'unauthorized_access',
  'rate_limit_exceeded',
  'suspicious_activity',
  'data_export',
  'bulk_data_access',
  'admin_action',
  'session_invalidated',
  'api_key_created',
  'api_key_revoked',
);
export type SecurityEventType = typeof SecurityEventTypeSchema.Type;

export const SecurityEventSeveritySchema = S.Literal('low', 'medium', 'high', 'critical');
export type SecurityEventSeverity = typeof SecurityEventSeveritySchema.Type;

export const SecurityEventSchema = S.Struct({
  id: S.String.pipe(S.minLength(1)),
  type: SecurityEventTypeSchema,
  severity: SecurityEventSeveritySchema,
  userId: S.NullOr(S.String),
  ipAddress: S.NullOr(S.String),
  userAgent: S.NullOr(S.String),
  details: S.Record({ key: S.String, value: S.Unknown }),
  timestamp: S.String,
});
export type SecurityEvent = typeof SecurityEventSchema.Type;

export const CreateSecurityEventSchema = S.Struct({
  type: SecurityEventTypeSchema,
  severity: SecurityEventSeveritySchema,
  userId: S.optional(S.NullOr(S.String)),
  ipAddress: S.optional(S.NullOr(S.String)),
  userAgent: S.optional(S.NullOr(S.String)),
  details: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type CreateSecurityEvent = typeof CreateSecurityEventSchema.Type;

export const AlertActionSchema = S.Literal('log', 'email', 'slack', 'block');
export type AlertAction = typeof AlertActionSchema.Type;

export const AlertConditionSchema = S.Struct({
  eventType: SecurityEventTypeSchema,
  threshold: S.Number.pipe(S.int(), S.positive()),
  windowMinutes: S.Number.pipe(S.int(), S.positive()),
  action: AlertActionSchema,
});
export type AlertCondition = typeof AlertConditionSchema.Type;

export const SecurityDashboardSchema = S.Struct({
  totalEvents: S.Number.pipe(S.int(), S.nonNegative()),
  eventsByType: S.Record({ key: S.String, value: S.Number }),
  eventsBySeverity: S.Record({ key: S.String, value: S.Number }),
  recentAlerts: S.Array(SecurityEventSchema),
  failedLoginAttempts: S.Number.pipe(S.int(), S.nonNegative()),
  accountLockouts: S.Number.pipe(S.int(), S.nonNegative()),
  lastUpdated: S.String,
});
export type SecurityDashboard = typeof SecurityDashboardSchema.Type;

export const FailedLoginTrackerSchema = S.Struct({
  attempts: S.Number.pipe(S.int(), S.nonNegative()),
  lastAttempt: S.String,
  ipAddresses: S.Array(S.String),
  alertSent: S.Boolean,
});
export type FailedLoginTracker = typeof FailedLoginTrackerSchema.Type;

// ============================================
// Event Type to Audit Action Mapping
// ============================================

const eventTypeToAction: Record<SecurityEventType, string> = {
  failed_login: 'security_failed_login',
  successful_login: 'security_successful_login',
  account_lockout: 'security_account_lockout',
  password_change: 'security_password_change',
  mfa_enabled: 'security_mfa_enabled',
  mfa_disabled: 'security_mfa_disabled',
  privilege_escalation: 'security_privilege_escalation',
  unauthorized_access: 'security_unauthorized_access',
  rate_limit_exceeded: 'security_rate_limit_exceeded',
  suspicious_activity: 'security_suspicious_activity',
  data_export: 'security_data_export',
  bulk_data_access: 'security_bulk_data_access',
  admin_action: 'security_admin_action',
  session_invalidated: 'security_session_invalidated',
  api_key_created: 'security_api_key_created',
  api_key_revoked: 'security_api_key_revoked',
};

// ============================================
// Alert Configuration
// ============================================

const DEFAULT_ALERT_CONDITIONS: AlertCondition[] = [
  { eventType: 'failed_login', threshold: 5, windowMinutes: 15, action: 'log' },
  { eventType: 'account_lockout', threshold: 3, windowMinutes: 60, action: 'email' },
  { eventType: 'privilege_escalation', threshold: 1, windowMinutes: 5, action: 'email' },
  { eventType: 'unauthorized_access', threshold: 1, windowMinutes: 5, action: 'email' },
  { eventType: 'bulk_data_access', threshold: 10, windowMinutes: 30, action: 'log' },
  { eventType: 'suspicious_activity', threshold: 1, windowMinutes: 5, action: 'email' },
];

// In-memory failed login tracking
const failedLoginTracker = new Map<string, FailedLoginTracker>();

// ============================================
// Core Functions
// ============================================

/**
 * Log a security event to the audit log
 */
export async function logSecurityEvent(event: CreateSecurityEvent): Promise<void> {
  const action = eventTypeToAction[event.type];

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    action: action as typeof auditLogs.$inferInsert.action,
    resourceType: 'security',
    resourceId: event.userId || 'system',
    userId: event.userId || null,
    details: {
      eventType: event.type,
      severity: event.severity,
      ...event.details,
    },
    ipAddress: event.ipAddress || null,
    userAgent: event.userAgent || null,
  });

  await checkAlertConditions(event);
}

/**
 * Track failed login attempts for a user/IP
 */
export async function trackFailedLogin(
  identifier: string,
  ipAddress?: string | null,
): Promise<{ shouldLock: boolean; attempts: number }> {
  const now = new Date().toISOString();
  const existing = failedLoginTracker.get(identifier);

  if (existing) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    if (existing.lastAttempt < fifteenMinutesAgo) {
      failedLoginTracker.set(identifier, {
        attempts: 1,
        lastAttempt: now,
        ipAddresses: ipAddress ? [ipAddress] : [],
        alertSent: false,
      });
      return { shouldLock: false, attempts: 1 };
    }

    const newAttempts = existing.attempts + 1;
    const ipAddresses =
      ipAddress && !existing.ipAddresses.includes(ipAddress)
        ? [...existing.ipAddresses, ipAddress]
        : existing.ipAddresses;

    failedLoginTracker.set(identifier, {
      attempts: newAttempts,
      lastAttempt: now,
      ipAddresses,
      alertSent: newAttempts >= 5 ? true : existing.alertSent,
    });

    if (newAttempts >= 5 && !existing.alertSent) {
      await logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        userId: identifier,
        ipAddress,
        details: {
          reason: 'Multiple failed login attempts',
          attempts: newAttempts,
          ipAddresses,
        },
      });
    }

    return { shouldLock: newAttempts >= 5, attempts: newAttempts };
  }

  failedLoginTracker.set(identifier, {
    attempts: 1,
    lastAttempt: now,
    ipAddresses: ipAddress ? [ipAddress] : [],
    alertSent: false,
  });

  return { shouldLock: false, attempts: 1 };
}

/**
 * Reset failed login attempts after successful login
 */
export function resetFailedLogins(identifier: string): void {
  failedLoginTracker.delete(identifier);
}

/**
 * Check alert conditions and trigger alerts if thresholds are met
 */
async function checkAlertConditions(event: CreateSecurityEvent): Promise<void> {
  const conditions = DEFAULT_ALERT_CONDITIONS.filter((c) => c.eventType === event.type);

  for (const condition of conditions) {
    const windowStart = new Date(Date.now() - condition.windowMinutes * 60 * 1000).toISOString();
    const action = eventTypeToAction[condition.eventType];

    const recentEvents = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, action as typeof auditLogs.$inferInsert.action),
          gte(auditLogs.createdAt, windowStart),
        ),
      );

    const count = recentEvents[0]?.count ?? 0;

    if (count >= condition.threshold) {
      await triggerAlert(condition, count, event);
    }
  }
}

/**
 * Trigger an alert based on condition
 */
async function triggerAlert(
  condition: AlertCondition,
  count: number,
  event: CreateSecurityEvent,
): Promise<void> {
  const alertDetails = {
    alertType: condition.action,
    eventType: condition.eventType,
    threshold: condition.threshold,
    actualCount: count,
    windowMinutes: condition.windowMinutes,
    triggeredBy: event,
  };

  switch (condition.action) {
    case 'log':
      console.warn('[SECURITY ALERT]', alertDetails);
      break;
    case 'email':
      console.warn('[SECURITY ALERT - EMAIL]', alertDetails);
      break;
    case 'slack':
      console.warn('[SECURITY ALERT - SLACK]', alertDetails);
      break;
    case 'block':
      console.warn('[SECURITY ALERT - BLOCK]', alertDetails);
      break;
  }

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    action: 'security_admin_action',
    resourceType: 'alert',
    resourceId: crypto.randomUUID(),
    userId: null,
    details: alertDetails,
    ipAddress: event.ipAddress || null,
    userAgent: null,
  });
}

/**
 * Get security dashboard metrics
 */
export async function getSecurityDashboard(hoursBack: number = 24): Promise<SecurityDashboard> {
  const windowStart = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const events = await db
    .select()
    .from(auditLogs)
    .where(and(sql`${auditLogs.action} LIKE 'security_%'`, gte(auditLogs.createdAt, windowStart)));

  const eventsByType: Record<string, number> = {};
  const eventsBySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  let failedLoginAttempts = 0;
  let accountLockouts = 0;

  for (const event of events) {
    const type = event.action.replace('security_', '');
    eventsByType[type] = (eventsByType[type] || 0) + 1;

    const details = event.details as Record<string, unknown> | null;
    const severity = (details?.severity as string) || 'low';
    eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1;

    if (event.action === 'security_failed_login') {
      failedLoginAttempts++;
    }
    if (event.action === 'security_account_lockout') {
      accountLockouts++;
    }
  }

  const recentAlerts = events
    .filter((e) => {
      const details = e.details as Record<string, unknown> | null;
      return details?.severity === 'high' || details?.severity === 'critical';
    })
    .slice(0, 10)
    .map((e) => {
      const details = e.details as Record<string, unknown> | null;
      return {
        id: e.id,
        type: (details?.eventType as SecurityEventType) || 'suspicious_activity',
        severity: (details?.severity as SecurityEventSeverity) || 'medium',
        userId: e.userId,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        details: details || {},
        timestamp: e.createdAt,
      };
    });

  return {
    totalEvents: events.length,
    eventsByType,
    eventsBySeverity,
    recentAlerts,
    failedLoginAttempts,
    accountLockouts,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get recent security events for a specific user
 */
export async function getUserSecurityEvents(
  userId: string,
  limit: number = 50,
): Promise<SecurityEvent[]> {
  const events = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.userId, userId), sql`${auditLogs.action} LIKE 'security_%'`))
    .limit(limit);

  return events.map((e) => {
    const details = e.details as Record<string, unknown> | null;
    return {
      id: e.id,
      type: (details?.eventType as SecurityEventType) || 'suspicious_activity',
      severity: (details?.severity as SecurityEventSeverity) || 'medium',
      userId: e.userId,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      details: details || {},
      timestamp: e.createdAt,
    };
  });
}

// ============================================
// Service Export
// ============================================

export const SecurityMonitoringService = {
  logSecurityEvent,
  trackFailedLogin,
  resetFailedLogins,
  getSecurityDashboard,
  getUserSecurityEvents,
  DEFAULT_ALERT_CONDITIONS,
};

// Legacy export for backward compatibility
export const securityMonitoring = SecurityMonitoringService;
