/**
 * @file Authentication Service
 * @module services/auth
 * @author FOIA Stream Team
 * @description Handles user authentication, registration, session management,
 *              password operations, and account security. Implements brute force
 *              protection with account lockout after failed attempts.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 * @compliance NIST 800-53 AC-7 (Unsuccessful Logon Attempts)
 */

// ============================================
// FOIA Stream - Authentication Service
// ============================================

import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import * as jose from 'jose';
import { nanoid } from 'nanoid';
import { env } from '../config/env';
import { db, schema } from '../db';
import { logger } from '../lib/logger';
import type { CreateUserDTO, User, UserRole } from '../types';
import { ConflictError, DatabaseError, NotFoundError, SecurityError } from '../utils/errors';
import { mfaService } from './mfa.service';
import { secureSessionService } from './secure-session.service';
import { securityMonitoring } from './security-monitoring.service';

/** Encoded JWT secret for token signing/verification */
const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Security configuration for account protection
 * @constant
 * @compliance NIST 800-53 AC-7 (Unsuccessful Logon Attempts)
 */
const SECURITY_CONFIG = {
  /** Maximum failed login attempts before account lockout */
  maxFailedAttempts: 5,
  /** Duration of account lockout in minutes */
  lockoutDurationMinutes: 30,
  /** Session expiry in days */
  sessionExpiryDays: 7,
};

/**
 * JWT payload structure
 * @interface
 */
export interface JWTPayload {
  /** User's unique identifier */
  userId: string;
  /** User's email address */
  email: string;
  /** User's role for RBAC */
  role: UserRole;
  /** Whether MFA has been verified for this session */
  mfaVerified?: boolean;
}

/**
 * Result returned from successful login
 * @interface
 */
export interface LoginResult {
  /** JWT authentication token */
  token: string;
  /** User data (excluding password hash) */
  user: Omit<User, 'passwordHash'>;
  /** Whether MFA verification is required */
  requiresMFA: boolean;
  /** MFA token for second-factor verification */
  mfaToken?: string;
}

/**
 * Authentication Service
 *
 * @class AuthService
 * @description Provides user authentication, registration, and session management.
 *              Implements security controls for brute force protection and audit logging.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 *
 * @example
 * ```typescript
 * const authService = new AuthService();
 *
 * // Register new user
 * const user = await authService.createUser({
 *   email: 'user@example.com',
 *   password: 'SecurePassword123!',
 *   name: 'John Doe'
 * });
 *
 * // Login
 * const { token, user } = await authService.login('user@example.com', 'SecurePassword123!');
 * ```
 */
export class AuthService {
  /**
   * Check if account is locked due to failed login attempts
   *
   * @private
   * @param {string} userId - User ID to check
   * @returns {Promise<boolean>} True if account is locked
   * @compliance NIST 800-53 AC-7 (Unsuccessful Logon Attempts)
   */
  private async isAccountLocked(userId: string): Promise<boolean> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user || !user.lockedUntil) return false;

    const lockedUntil = new Date(user.lockedUntil);
    if (lockedUntil > new Date()) {
      return true;
    }

    // Lockout expired, reset failed attempts
    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));

    return false;
  }

  /**
   * Record failed login attempt
   */
  private async recordFailedLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user) return;

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const now = new Date().toISOString();

    let lockedUntil: string | null = null;
    if (failedAttempts >= SECURITY_CONFIG.maxFailedAttempts) {
      const lockoutEnd = new Date(Date.now() + SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000);
      lockedUntil = lockoutEnd.toISOString();

      // Log account lockout security event
      await securityMonitoring.logSecurityEvent({
        type: 'account_lockout',
        userId,
        severity: 'high',
        details: {
          email,
          failedAttempts,
          lockoutDuration: SECURITY_CONFIG.lockoutDurationMinutes,
        },
        ipAddress,
        userAgent,
      });
    }

    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: now,
        lockedUntil,
        updatedAt: now,
      })
      .where(eq(schema.users.id, userId));

    // Track failed login
    await securityMonitoring.logSecurityEvent({
      type: 'failed_login',
      userId,
      severity: 'medium',
      details: { email, attemptNumber: failedAttempts },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Reset failed login attempts on successful login
   */
  private async resetFailedAttempts(userId: string): Promise<void> {
    await db
      .update(schema.users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLoginAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, userId));
  }

  /**
   * Create a new user account
   */
  async createUser(data: CreateUserDTO): Promise<Omit<User, 'passwordHash'>> {
    // Check if email already exists
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email.toLowerCase()))
      .get();

    if (existing) {
      throw ConflictError('Email already registered', { email: data.email });
    }

    // Hash password
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const id = nanoid();
    const now = new Date().toISOString();

    await db.insert(schema.users).values({
      id,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      organization: data.organization,
      isAnonymous: data.isAnonymous ?? false,
      isVerified: false,
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit event
    await this.logAudit(id, 'user_created', 'user', id);

    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();

    if (!user) {
      throw new DatabaseError('insert', { table: 'users', metadata: { userId: id } });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'passwordHash'>;
  }

  /**
   * Authenticate user and return JWT token
   */
  async login(
    email: string,
    password: string,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .get();

    if (!user) {
      // Log failed attempt even if user doesn't exist (timing attack prevention)
      await securityMonitoring.logSecurityEvent({
        type: 'failed_login',
        severity: 'low',
        details: { email, reason: 'user_not_found' },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
      throw new SecurityError('authentication', 'Invalid credentials', { email });
    }

    // Check if account is locked
    if (await this.isAccountLocked(user.id)) {
      throw new SecurityError(
        'authentication',
        'Account is temporarily locked. Please try again later.',
        { userId: user.id },
      );
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      await this.recordFailedLogin(user.id, email, options?.ipAddress, options?.userAgent);
      throw new SecurityError('authentication', 'Invalid credentials', { email });
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(user.id);

    // Check if MFA is enabled
    const requiresMFA = user.twoFactorEnabled ?? false;
    let mfaToken: string | undefined;

    if (requiresMFA) {
      // Generate a temporary MFA token (valid for 5 minutes)
      mfaToken = await new jose.SignJWT({ userId: user.id, type: 'mfa_pending' } as jose.JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(JWT_SECRET);
    }

    // Only create session and token if MFA is NOT required
    // If MFA is required, session will be created after MFA verification
    let token = '';

    if (!requiresMFA) {
      token = await this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        mfaVerified: true,
      });

      // Create encrypted session
      const expiresAt = new Date(
        Date.now() + SECURITY_CONFIG.sessionExpiryDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      await secureSessionService.createSession(
        user.id,
        token,
        expiresAt,
        options?.ipAddress,
        options?.userAgent,
      );

      // Log successful login
      await securityMonitoring.logSecurityEvent({
        type: 'successful_login',
        userId: user.id,
        severity: 'low',
        details: { email, mfaRequired: false },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      // Log audit event
      await this.logAudit(user.id, 'user_login', 'user', user.id);
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      token,
      user: userWithoutPassword as Omit<User, 'passwordHash'>,
      requiresMFA,
      mfaToken,
    };
  }

  /**
   * Verify MFA code and complete login after successful verification
   *
   * @param {string} mfaToken - Temporary JWT token from initial login
   * @param {string} code - 6-digit TOTP code or backup code
   * @param {Object} [options] - Request metadata
   * @param {string} [options.ipAddress] - Client IP address
   * @param {string} [options.userAgent] - Client user agent
   * @returns {Promise<{token: string}>} Full access token
   * @throws {SecurityError} If MFA token is invalid/expired or code is incorrect
   * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
   */
  async verifyMFACode(
    mfaToken: string,
    code: string,
    options?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string }> {
    try {
      const { payload } = await jose.jwtVerify(mfaToken, JWT_SECRET);

      if ((payload as { type?: string }).type !== 'mfa_pending') {
        throw new SecurityError('invalid_token', 'Invalid MFA token');
      }

      const userId = (payload as { userId?: string }).userId;
      if (!userId) {
        throw new SecurityError('invalid_token', 'Invalid MFA token');
      }

      logger.debug({ userId, codeLength: code.length }, 'Verifying MFA code');
      const verifyResult = await mfaService.verifyMFA(userId, code);
      logger.debug({ userId, success: verifyResult.success, usedBackupCode: verifyResult.usedBackupCode }, 'MFA verification result');

      if (!verifyResult.success) {
        await securityMonitoring.logSecurityEvent({
          type: 'failed_login',
          userId,
          severity: 'medium',
          details: { reason: 'invalid_mfa_code' },
          ipAddress: options?.ipAddress,
          userAgent: options?.userAgent,
        });
        throw new SecurityError('authentication', 'Invalid MFA code', { userId });
      }

      logger.debug({ userId }, 'MFA verified, fetching user');
      const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

      if (!user) {
        throw NotFoundError('User not found', { userId });
      }

      logger.debug({ userId, email: user.email }, 'User found, generating token');
      const token = await this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
        mfaVerified: true,
      });

      logger.debug({ userId }, 'Token generated, creating session');
      const expiresAt = new Date(
        Date.now() + SECURITY_CONFIG.sessionExpiryDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      await secureSessionService.createSession(
        userId,
        token,
        expiresAt,
        options?.ipAddress,
        options?.userAgent,
      );

      logger.debug({ userId }, 'Session updated, logging security event');
      await securityMonitoring.logSecurityEvent({
        type: 'successful_login',
        userId,
        severity: 'low',
        details: { mfaVerified: true, usedBackupCode: verifyResult.usedBackupCode },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      logger.debug({ userId }, 'MFA login completed successfully');
      return { token };
    } catch (error) {
      logger.error({ error, errorMessage: error instanceof Error ? error.message : 'Unknown error' }, 'MFA verification error');
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError('expired_token', 'Invalid or expired MFA token');
    }
  }

  /**
   * Enable MFA for user (starts the setup process)
   */
  async setupMFA(userId: string) {
    return mfaService.setupMFA(userId);
  }

  /**
   * Confirm MFA setup with verification code
   */
  async confirmMFASetup(userId: string, code: string): Promise<boolean> {
    return mfaService.verifyAndEnableMFA(userId, code);
  }

  /**
   * Disable MFA for user (requires password verification first)
   */
  async disableMFA(userId: string, password: string): Promise<void> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user) {
      throw NotFoundError('User not found', { userId });
    }

    // Verify password before disabling MFA
    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new SecurityError('authentication', 'Invalid password', { userId });
    }

    await mfaService.disableMFA(userId);
  }

  /**
   * Logout user and invalidate session
   */
  async logout(token: string): Promise<void> {
    const session = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .get();

    if (session) {
      await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
      await this.logAudit(session.userId, 'user_logout', 'user', session.userId);
    }
  }

  /**
   * Verify JWT token and return payload
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      return payload as unknown as JWTPayload;
    } catch {
      throw new SecurityError('expired_token', 'Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();

    if (!user) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'passwordHash'>;
  }

  /**
   * Update user profile
   */
  async updateUser(
    id: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'organization' | 'isAnonymous'>>,
  ): Promise<Omit<User, 'passwordHash'>> {
    await db
      .update(schema.users)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, id));

    const user = await this.getUserById(id);
    if (!user) {
      throw NotFoundError('User not found', { userId: id });
    }

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, id)).get();

    if (!user) {
      throw NotFoundError('User not found', { userId: id });
    }

    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new SecurityError('authentication', 'Current password is incorrect', { userId: id });
    }

    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await db
      .update(schema.users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, id));

    // Invalidate all sessions
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  }

  /**
   * Verify a user's password without logging in
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();

    if (!user) {
      throw NotFoundError('User not found', { userId });
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new SecurityError('authentication', 'Invalid password', { userId });
    }

    return true;
  }

  /**
   * Get all active sessions for a user (with decrypted, masked data)
   */
  async getUserSessions(userId: string, currentToken?: string) {
    return secureSessionService.getUserSessions(userId, currentToken);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .get();

    if (!session) {
      throw NotFoundError('Session not found', { sessionId });
    }

    if (session.userId !== userId) {
      throw new SecurityError('authorization', 'Cannot revoke another user\'s session', { userId, sessionId });
    }

    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));

    await this.logAudit(userId, 'security_session_invalidated', 'session', sessionId);
  }

  /**
   * Delete all user data but keep the account
   */
  async deleteUserData(userId: string): Promise<void> {
    // Delete FOIA requests (cascades to related data)
    await db.delete(schema.foiaRequests).where(eq(schema.foiaRequests.userId, userId));

    // Delete documents uploaded by user
    await db.delete(schema.documents).where(eq(schema.documents.uploadedBy, userId));

    // Delete comments
    await db.delete(schema.comments).where(eq(schema.comments.userId, userId));

    // Delete appeals
    await db.delete(schema.appeals).where(eq(schema.appeals.userId, userId));

    // Delete templates created by user
    await db.delete(schema.requestTemplates).where(eq(schema.requestTemplates.createdBy, userId));

    // Log the action
    await this.logAudit(userId, 'security_data_export', 'user', userId, { action: 'data_deleted' });
  }

  /**
   * Permanently delete a user account and all data
   */
  async deleteAccount(userId: string): Promise<void> {
    // First delete all user data
    await this.deleteUserData(userId);

    // Delete API keys
    const { apiKeys } = schema;
    await db.delete(apiKeys).where(eq(apiKeys.userId, userId));

    // Delete sessions
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));

    // Log before deleting user
    await this.logAudit(userId, 'user_deleted', 'user', userId);

    // Finally delete the user
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  }

  /**
   * Generate JWT token
   */
  private async generateToken(payload: JWTPayload): Promise<string> {
    return await new jose.SignJWT(payload as unknown as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(JWT_SECRET);
  }

  /**
   * Log audit event
   */
  private async logAudit(
    userId: string,
    action: (typeof schema.auditLogs.$inferInsert)['action'],
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(schema.auditLogs).values({
      id: nanoid(),
      userId,
      action,
      resourceType,
      resourceId,
      details: details ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}

export const authService = new AuthService();
