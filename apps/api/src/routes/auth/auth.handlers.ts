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
 * @file Auth Route Handlers
 * @module routes/auth/auth.handlers
 * @author FOIA Stream Team
 * @description Handler implementations for authentication endpoints.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

import type { Context } from 'hono';
import { apiKeyService } from '@/services/api-key.service';
import { authService } from '@/services/auth.service';
import { type ConsentData, consentService } from '@/services/consent.service';
import { mfaService } from '@/services/mfa.service';
import type { User } from '@/types';

/**
 * Maps user object to API response format (excludes passwordHash)
 */
const mapUserResponse = (user: Omit<User, 'passwordHash'>) => ({
  id: user.id,
  email: user.email,
  role: user.role as
    | 'civilian'
    | 'journalist'
    | 'researcher'
    | 'attorney'
    | 'community_advocate'
    | 'agency_official'
    | 'admin',
  firstName: user.firstName,
  lastName: user.lastName,
  organization: user.organization ?? null,
  isAnonymous: user.isAnonymous,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Handler for POST /auth/register
 *
 * @param {Context} c - Hono context with validated request body
 * @returns {Promise<Response>} JSON response with created user or error
 * @compliance NIST 800-53 AC-2 (Account Management)
 * @compliance GDPR Article 7 (Conditions for consent)
 */
export const register = async (c: Context) => {
  try {
    const data = c.req.valid('json' as never) as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?:
        | 'civilian'
        | 'journalist'
        | 'researcher'
        | 'attorney'
        | 'community_advocate'
        | 'agency_official'
        | 'admin';
      organization?: string;
      isAnonymous?: boolean;
      consents?: ConsentData;
    };

    const { consents, ...userData } = data;
    // Ensure role has a default value
    const userDataWithDefaults = {
      ...userData,
      role: userData.role || ('civilian' as const),
    };
    const user = await authService.createUser(userDataWithDefaults);

    // Record consent if provided (GDPR/CCPA compliance)
    if (consents) {
      const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
      const userAgent = c.req.header('user-agent');

      await consentService.recordRegistrationConsent(user.id, consents, ipAddress, userAgent);
    }

    return c.json(
      {
        success: true,
        data: mapUserResponse(user),
        message: 'Account created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/login
 *
 * @param {Context} c - Hono context with validated login credentials
 * @returns {Promise<Response>} JSON response with JWT token or error
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AU-2 (Audit Events)
 */
export const login = async (c: Context) => {
  try {
    const { email, password } = c.req.valid('json' as never);
    const result = await authService.login(email, password);

    return c.json(
      {
        success: true,
        data: {
          token: result.token,
          requiresMFA: result.requiresMFA,
          mfaToken: result.mfaToken,
          user: mapUserResponse(result.user),
        },
        message: 'Login successful',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return c.json({ success: false, error: message }, 401);
  }
};

/**
 * Handler for POST /auth/login/mfa
 *
 * @param {Context} c - Hono context with MFA token and code
 * @returns {Promise<Response>} JSON response with full access token or error
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
export const verifyMFALogin = async (c: Context) => {
  try {
    const { mfaToken, code } = c.req.valid('json' as never);

    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
    const userAgent = c.req.header('user-agent');

    const result = await authService.verifyMFACode(mfaToken, code, {
      ipAddress,
      userAgent,
    });

    return c.json(
      {
        success: true,
        data: { token: result.token },
        message: 'MFA verification successful',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MFA verification failed';
    return c.json({ success: false, error: message }, 401);
  }
};

/**
 * Handler for POST /auth/logout
 *
 * @param {Context} c - Hono context with auth token in header
 * @returns {Promise<Response>} JSON response confirming logout or error
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
export const logout = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);

    if (!token) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }

    await authService.logout(token);

    return c.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for GET /auth/me
 *
 * @param {Context} c - Hono context with authenticated user
 * @returns {Promise<Response>} JSON response with user profile or error
 */
export const getMe = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const user = await authService.getUserById(userId);

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json(
      {
        success: true,
        data: mapUserResponse(user),
        message: '',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for PATCH /auth/me
 *
 * @param {Context} c - Hono context with validated update data
 * @returns {Promise<Response>} JSON response with updated user or error
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const updateMe = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json' as never);
    const user = await authService.updateUser(userId, data);

    return c.json(
      {
        success: true,
        data: mapUserResponse(user),
        message: 'Profile updated successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/change-password
 *
 * @param {Context} c - Hono context with validated password change data
 * @returns {Promise<Response>} JSON response confirming password change or error
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const changePassword = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json' as never);

    await authService.changePassword(userId, currentPassword, newPassword);

    return c.json(
      {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed';
    return c.json({ success: false, error: message }, 400);
  }
};

// ============================================
// MFA Handlers
// ============================================

/**
 * Handler for GET /auth/mfa/status
 */
export const getMFAStatus = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const status = await mfaService.getMFAStatus(userId);

    return c.json(
      {
        success: true,
        data: {
          enabled: status.enabled,
          backupCodesRemaining: status.backupCodesRemaining,
        },
        message: '',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get MFA status';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/mfa/setup
 */
export const setupMFA = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { password } = c.req.valid('json' as never);

    // Verify password first
    await authService.verifyPassword(userId, password);

    const result = await mfaService.setupMFA(userId);

    return c.json(
      {
        success: true,
        data: {
          qrCodeUrl: result.qrCodeUrl,
          secret: result.secret,
          backupCodes: [...result.backupCodes],
        },
        message: '',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to setup MFA';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/mfa/verify
 */
export const verifyMFA = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { code } = c.req.valid('json' as never);

    const success = await mfaService.verifyAndEnableMFA(userId, code);

    if (!success) {
      return c.json({ success: false, error: 'Invalid verification code' }, 400);
    }

    return c.json(
      {
        success: true,
        message: 'MFA enabled successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify MFA';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/mfa/disable
 *
 * @param {Context} c - Hono context with password and MFA code
 * @returns {Promise<Response>} JSON response confirming disable or error
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
export const disableMFA = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { password, code } = c.req.valid('json' as never);

    await authService.verifyPassword(userId, password);

    const verifyResult = await mfaService.verifyMFA(userId, code);
    if (!verifyResult.success) {
      return c.json({ success: false, error: 'Invalid MFA code' }, 400);
    }

    await mfaService.disableMFA(userId);

    return c.json(
      {
        success: true,
        message: 'MFA disabled successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to disable MFA';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/mfa/backup-codes/regenerate
 *
 * @param {Context} c - Hono context with password confirmation
 * @returns {Promise<Response>} JSON response with new backup codes or error
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const regenerateBackupCodes = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { password } = c.req.valid('json' as never);

    await authService.verifyPassword(userId, password);

    const status = await mfaService.getMFAStatus(userId);
    if (!status.enabled) {
      return c.json({ success: false, error: 'MFA is not enabled' }, 400);
    }

    const backupCodes = await mfaService.regenerateBackupCodes(userId);

    return c.json(
      {
        success: true,
        data: { backupCodes },
        message: 'Backup codes regenerated successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to regenerate backup codes';
    return c.json({ success: false, error: message }, 400);
  }
};

// ============================================
// Session Handlers
// ============================================

/**
 * Handler for GET /auth/sessions
 */
export const getSessions = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const authHeader = c.req.header('Authorization');
    const currentToken = authHeader?.substring(7);

    const sessions = await authService.getUserSessions(userId, currentToken);

    return c.json(
      {
        success: true,
        data: sessions,
        message: '',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sessions';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for DELETE /auth/sessions/:id
 */
export const revokeSession = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param' as never);

    await authService.revokeSession(userId, id);

    return c.json(
      {
        success: true,
        message: 'Session revoked successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke session';
    if (message.includes('not found')) {
      return c.json({ success: false, error: message }, 404);
    }
    return c.json({ success: false, error: message }, 400);
  }
};

// ============================================
// API Key Handlers
// ============================================

/**
 * Handler for GET /auth/api-key
 */
export const getApiKey = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const apiKey = await apiKeyService.getApiKey(userId);

    return c.json(
      {
        success: true,
        data: apiKey,
        message: '',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get API key';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for POST /auth/api-key
 */
export const createApiKey = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { password, twoFactorCode } = c.req.valid('json' as never);

    // Verify password
    await authService.verifyPassword(userId, password);

    // Check if MFA is enabled and verify code
    const mfaStatus = await mfaService.getMFAStatus(userId);
    if (mfaStatus.enabled) {
      if (!twoFactorCode) {
        return c.json({ success: false, error: 'MFA code required' }, 400);
      }
      const mfaResult = await mfaService.verifyMFA(userId, twoFactorCode);
      if (!mfaResult.success) {
        return c.json({ success: false, error: 'Invalid MFA code' }, 400);
      }
    }

    const result = await apiKeyService.createApiKey(userId);

    return c.json(
      {
        success: true,
        data: result,
        message: "API key generated. Save it now - it won't be shown again.",
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for DELETE /auth/api-key
 */
export const deleteApiKey = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    await apiKeyService.deleteApiKey(userId);

    return c.json(
      {
        success: true,
        message: 'API key revoked successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete API key';
    return c.json({ success: false, error: message }, 400);
  }
};

// ============================================
// Account Deletion Handlers
// ============================================

/**
 * Handler for DELETE /auth/data
 */
export const deleteUserData = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { password, twoFactorCode } = c.req.valid('json' as never);

    // Verify password
    await authService.verifyPassword(userId, password);

    // Check if MFA is enabled and verify code
    const mfaStatus = await mfaService.getMFAStatus(userId);
    if (mfaStatus.enabled) {
      if (!twoFactorCode) {
        return c.json({ success: false, error: 'MFA code required' }, 400);
      }
      const mfaResult = await mfaService.verifyMFA(userId, twoFactorCode);
      if (!mfaResult.success) {
        return c.json({ success: false, error: 'Invalid MFA code' }, 400);
      }
    }

    await authService.deleteUserData(userId);

    return c.json(
      {
        success: true,
        message: 'All data deleted successfully. Your account remains active.',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete data';
    return c.json({ success: false, error: message }, 400);
  }
};

/**
 * Handler for DELETE /auth/account
 */
export const deleteAccount = async (c: Context) => {
  try {
    const { userId } = c.get('user');
    const { password, twoFactorCode } = c.req.valid('json' as never);

    // Verify password
    await authService.verifyPassword(userId, password);

    // Check if MFA is enabled and verify code
    const mfaStatus = await mfaService.getMFAStatus(userId);
    if (mfaStatus.enabled) {
      if (!twoFactorCode) {
        return c.json({ success: false, error: 'MFA code required' }, 400);
      }
      const mfaResult = await mfaService.verifyMFA(userId, twoFactorCode);
      if (!mfaResult.success) {
        return c.json({ success: false, error: 'Invalid MFA code' }, 400);
      }
    }

    await authService.deleteAccount(userId);

    return c.json(
      {
        success: true,
        message: 'Account deleted successfully',
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return c.json({ success: false, error: message }, 400);
  }
};
