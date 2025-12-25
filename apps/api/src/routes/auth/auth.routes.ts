/**
 * @file Auth Route Definitions (OpenAPI)
 * @module routes/auth/auth.routes
 * @author FOIA Stream Team
 * @description OpenAPI route definitions for authentication endpoints using Zod schemas.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

import { createRoute, z } from '@hono/zod-openapi';

import { HttpStatusCodes } from '@/lib/constants';

// ============================================
// Zod Schemas
// ============================================

/**
 * User role enumeration
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
export const UserRoleSchema = z.enum([
  'civilian',
  'journalist',
  'researcher',
  'attorney',
  'community_advocate',
  'agency_official',
  'admin',
]);

/**
 * Schema for consent data (GDPR/CCPA compliance)
 * @compliance GDPR Article 7 (Conditions for consent), CCPA
 */
export const ConsentDataSchema = z
  .object({
    termsAccepted: z.boolean().openapi({ example: true }),
    privacyAccepted: z.boolean().openapi({ example: true }),
    dataProcessingAccepted: z.boolean().openapi({ example: true }),
    consentTimestamp: z.string().datetime().openapi({ example: '2024-12-25T00:00:00.000Z' }),
  })
  .openapi('ConsentData');

/**
 * Schema for user registration request body
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 * @compliance GDPR Article 7 (Conditions for consent)
 */
export const CreateUserSchema = z
  .object({
    email: z.string().email('Invalid email address').openapi({ example: 'user@example.com' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .openapi({ example: 'SecurePass123!' }),
    role: UserRoleSchema.default('civilian').openapi({ example: 'civilian' }),
    firstName: z.string().min(1, 'First name is required').openapi({ example: 'John' }),
    lastName: z.string().min(1, 'Last name is required').openapi({ example: 'Doe' }),
    organization: z.string().optional().openapi({ example: 'ACLU' }),
    isAnonymous: z.boolean().default(false).openapi({ example: false }),
    consents: ConsentDataSchema.optional().openapi({
      description: 'User consent data for GDPR/CCPA compliance',
    }),
  })
  .openapi('CreateUser');

/**
 * Schema for login request body
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 */
export const LoginSchema = z
  .object({
    email: z.string().email('Invalid email address').openapi({ example: 'user@example.com' }),
    password: z.string().min(1, 'Password is required').openapi({ example: 'SecurePass123!' }),
  })
  .openapi('LoginCredentials');

/**
 * Schema for profile update request body
 */
export const UpdateUserSchema = z
  .object({
    firstName: z.string().min(1).optional().openapi({ example: 'Jane' }),
    lastName: z.string().min(1).optional().openapi({ example: 'Smith' }),
    organization: z.string().optional().openapi({ example: 'EFF' }),
    isAnonymous: z.boolean().optional().openapi({ example: true }),
  })
  .openapi('UpdateUser');

/**
 * Schema for password change request body
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  })
  .openapi('ChangePassword');

/**
 * Schema for MFA login verification
 */
export const MFALoginVerifySchema = z
  .object({
    mfaToken: z.string().min(1, 'MFA token is required'),
    code: z.string().min(6, 'Code must be at least 6 characters'),
  })
  .openapi('MFALoginVerify');

/**
 * Schema for MFA setup request (requires password confirmation)
 */
export const MFASetupSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
  })
  .openapi('MFASetup');

/**
 * Schema for MFA verification
 */
export const MFAVerifySchema = z
  .object({
    code: z.string().length(6, 'Code must be 6 digits'),
  })
  .openapi('MFAVerify');

/**
 * Schema for MFA disable request
 */
export const MFADisableSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    code: z.string().length(6, 'Code must be 6 digits'),
  })
  .openapi('MFADisable');

/**
 * Schema for password-protected actions
 */
export const PasswordConfirmSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    twoFactorCode: z.string().optional(),
  })
  .openapi('PasswordConfirm');

// ============================================
// Response Schemas
// ============================================

/**
 * User data returned from API (excludes sensitive fields)
 */
export const UserResponseSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    role: UserRoleSchema,
    firstName: z.string(),
    lastName: z.string(),
    organization: z.string().nullable(),
    isAnonymous: z.boolean(),
    isVerified: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('User');

/**
 * Login response with JWT token
 */
export const LoginResponseSchema = z
  .object({
    token: z.string(),
    user: UserResponseSchema,
    requiresMFA: z.boolean(),
    mfaToken: z.string().optional(),
  })
  .openapi('LoginResponse');

/**
 * Standard success response wrapper
 */
const successResponse = <T extends z.ZodTypeAny>(dataSchema: T, message?: string) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z
      .string()
      .optional()
      .default(message ?? ''),
  });

/**
 * Standard error response
 */
export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .openapi('ErrorResponse');

/**
 * Simple message response
 */
export const MessageResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
  })
  .openapi('MessageResponse');

/**
 * MFA setup response with QR code and backup codes
 */
export const MFASetupResponseSchema = z
  .object({
    qrCodeUrl: z.string(),
    secret: z.string(),
    backupCodes: z.array(z.string()),
  })
  .openapi('MFASetupResponse');

/**
 * MFA status response
 */
export const MFAStatusResponseSchema = z
  .object({
    enabled: z.boolean(),
    backupCodesRemaining: z.number().optional(),
  })
  .openapi('MFAStatusResponse');

/**
 * Session info for session management
 */
export const SessionResponseSchema = z
  .object({
    id: z.string(),
    deviceName: z.string().nullable(),
    ipAddress: z.string().nullable(),
    lastActiveAt: z.string().nullable(),
    createdAt: z.string(),
    isCurrent: z.boolean(),
  })
  .openapi('SessionResponse');

/**
 * API key response
 */
export const ApiKeyResponseSchema = z
  .object({
    id: z.string(),
    keyPreview: z.string(),
    name: z.string(),
    createdAt: z.string(),
    lastUsedAt: z.string().nullable(),
  })
  .openapi('ApiKeyResponse');

/**
 * API key creation response (includes full key only on creation)
 */
export const ApiKeyCreatedResponseSchema = z
  .object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    createdAt: z.string(),
  })
  .openapi('ApiKeyCreatedResponse');

// ============================================
// Route Definitions
// ============================================

const tags = ['Authentication'];

/**
 * POST /auth/register - Create new user account
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const registerRoute = createRoute({
  path: '/auth/register',
  method: 'post',
  tags,
  summary: 'Register a new user account',
  description:
    'Creates a new user account with the provided credentials. Returns the created user object.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserSchema,
        },
      },
      required: true,
      description: 'User registration data',
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      content: {
        'application/json': {
          schema: successResponse(UserResponseSchema, 'Account created successfully'),
        },
      },
      description: 'User created successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Registration failed - validation error or email already exists',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/login - Authenticate user
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AU-2 (Audit Events) - Login events are logged
 */
export const loginRoute = createRoute({
  path: '/auth/login',
  method: 'post',
  tags,
  summary: 'Authenticate user and get JWT token',
  description:
    'Authenticates a user with email and password. Returns a JWT token for subsequent authenticated requests.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginSchema,
        },
      },
      required: true,
      description: 'Login credentials',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(LoginResponseSchema, 'Login successful'),
        },
      },
      description: 'Login successful',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid credentials',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/login/mfa - Complete login with MFA code
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
export const verifyMFALoginRoute = createRoute({
  path: '/auth/login/mfa',
  method: 'post',
  tags,
  summary: 'Complete login with MFA verification',
  description:
    'Verifies the MFA code and completes the login process, returning a full access token.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: MFALoginVerifySchema,
        },
      },
      required: true,
      description: 'MFA token from initial login and 6-digit code from authenticator app',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(
            z.object({ token: z.string() }),
            'MFA verification successful'
          ),
        },
      },
      description: 'MFA verification successful, returns full access token',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Invalid MFA code or token',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/logout - Logout user
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
export const logoutRoute = createRoute({
  path: '/auth/logout',
  method: 'post',
  tags,
  summary: 'Logout current user',
  description: 'Invalidates the current JWT token, logging the user out.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Logged out successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Logout failed',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
});

/**
 * GET /auth/me - Get current user profile
 */
export const getMeRoute = createRoute({
  path: '/auth/me',
  method: 'get',
  tags,
  summary: 'Get current user profile',
  description: 'Returns the profile of the currently authenticated user.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(UserResponseSchema),
        },
      },
      description: 'User profile retrieved successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Failed to get profile',
    },
    [HttpStatusCodes.NOT_FOUND]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User not found',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
});

/**
 * PATCH /auth/me - Update current user profile
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
export const updateMeRoute = createRoute({
  path: '/auth/me',
  method: 'patch',
  tags,
  summary: 'Update current user profile',
  description: 'Updates the profile of the currently authenticated user.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateUserSchema,
        },
      },
      required: true,
      description: 'Profile update data',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(UserResponseSchema, 'Profile updated successfully'),
        },
      },
      description: 'Profile updated successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Update failed',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

/**
 * POST /auth/change-password - Change password
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const changePasswordRoute = createRoute({
  path: '/auth/change-password',
  method: 'post',
  tags,
  summary: 'Change current user password',
  description: 'Changes the password for the currently authenticated user.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ChangePasswordSchema,
        },
      },
      required: true,
      description: 'Current and new password',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Password changed successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Password change failed',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated or current password incorrect',
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
});

// ============================================
// MFA Routes
// ============================================

/**
 * GET /auth/mfa/status - Get MFA status
 */
export const getMFAStatusRoute = createRoute({
  path: '/auth/mfa/status',
  method: 'get',
  tags,
  summary: 'Get MFA status for current user',
  description: 'Returns whether MFA is enabled and backup codes remaining.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(MFAStatusResponseSchema),
        },
      },
      description: 'MFA status retrieved',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Failed to get MFA status',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * POST /auth/mfa/setup - Initialize MFA setup
 * @compliance NIST 800-53 IA-2(1) (Multi-Factor Authentication)
 */
export const setupMFARoute = createRoute({
  path: '/auth/mfa/setup',
  method: 'post',
  tags,
  summary: 'Initialize MFA setup',
  description: 'Starts MFA setup process. Returns QR code URL and backup codes.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: MFASetupSchema } },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(MFASetupResponseSchema),
        },
      },
      description: 'MFA setup initiated',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'MFA already enabled or invalid password',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * POST /auth/mfa/verify - Verify and enable MFA
 */
export const verifyMFARoute = createRoute({
  path: '/auth/mfa/verify',
  method: 'post',
  tags,
  summary: 'Verify MFA code and enable',
  description: 'Verifies the TOTP code to complete MFA setup.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: MFAVerifySchema } },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'MFA enabled successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid code or MFA not in setup state',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * POST /auth/mfa/disable - Disable MFA
 */
export const disableMFARoute = createRoute({
  path: '/auth/mfa/disable',
  method: 'post',
  tags,
  summary: 'Disable MFA',
  description: 'Disables MFA for the current user. Requires password and current TOTP code.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: MFADisableSchema } },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'MFA disabled successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid password or code',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * POST /auth/mfa/backup-codes/regenerate - Regenerate backup codes
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
export const regenerateBackupCodesRoute = createRoute({
  path: '/auth/mfa/backup-codes/regenerate',
  method: 'post',
  tags,
  summary: 'Regenerate MFA backup codes',
  description: 'Generates new backup codes, invalidating all previous ones. Requires password verification.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: PasswordConfirmSchema } },
      required: true,
      description: 'Current password for verification',
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(
            z.object({ backupCodes: z.array(z.string()) }),
            'Backup codes regenerated successfully'
          ),
        },
      },
      description: 'New backup codes generated',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid password or MFA not enabled',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

// ============================================
// Session Routes
// ============================================

/**
 * GET /auth/sessions - List active sessions
 */
export const getSessionsRoute = createRoute({
  path: '/auth/sessions',
  method: 'get',
  tags,
  summary: 'List active sessions',
  description: 'Returns all active sessions for the current user.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(z.array(SessionResponseSchema)),
        },
      },
      description: 'Sessions retrieved',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Failed to get sessions',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * DELETE /auth/sessions/:id - Revoke a session
 */
export const revokeSessionRoute = createRoute({
  path: '/auth/sessions/{id}',
  method: 'delete',
  tags,
  summary: 'Revoke a session',
  description: 'Logs out a specific session by ID.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Session revoked',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Failed to revoke session',
    },
    [HttpStatusCodes.NOT_FOUND]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Session not found',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

// ============================================
// API Key Routes
// ============================================

/**
 * GET /auth/api-key - Get current API key info
 */
export const getApiKeyRoute = createRoute({
  path: '/auth/api-key',
  method: 'get',
  tags,
  summary: 'Get API key info',
  description: 'Returns info about the current API key (not the full key).',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(ApiKeyResponseSchema.nullable()),
        },
      },
      description: 'API key info retrieved',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Failed to get API key',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * POST /auth/api-key - Generate new API key
 */
export const createApiKeyRoute = createRoute({
  path: '/auth/api-key',
  method: 'post',
  tags,
  summary: 'Generate new API key',
  description: 'Generates a new API key. If one exists, it will be replaced.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: PasswordConfirmSchema } },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: successResponse(ApiKeyCreatedResponseSchema, 'API key generated. Save it now - it won\'t be shown again.'),
        },
      },
      description: 'API key generated',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid password',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * DELETE /auth/api-key - Revoke API key
 */
export const deleteApiKeyRoute = createRoute({
  path: '/auth/api-key',
  method: 'delete',
  tags,
  summary: 'Revoke API key',
  description: 'Revokes the current API key.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'API key revoked',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Failed to revoke API key',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

// ============================================
// Account Deletion Routes
// ============================================

/**
 * DELETE /auth/data - Delete all user data
 */
export const deleteUserDataRoute = createRoute({
  path: '/auth/data',
  method: 'delete',
  tags,
  summary: 'Delete all user data',
  description: 'Permanently deletes all user data (requests, documents, etc.) but keeps the account.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: PasswordConfirmSchema } },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Data deleted successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid password or 2FA code',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

/**
 * DELETE /auth/account - Delete account
 */
export const deleteAccountRoute = createRoute({
  path: '/auth/account',
  method: 'delete',
  tags,
  summary: 'Delete account',
  description: 'Permanently deletes the account and all associated data.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: PasswordConfirmSchema } },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        'application/json': {
          schema: MessageResponseSchema,
        },
      },
      description: 'Account deleted successfully',
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Invalid password or 2FA code',
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Not authenticated',
    },
  },
});

// Type exports for handlers
export type RegisterRoute = typeof registerRoute;
export type LoginRoute = typeof loginRoute;
export type LogoutRoute = typeof logoutRoute;
export type GetMeRoute = typeof getMeRoute;
export type UpdateMeRoute = typeof updateMeRoute;
export type ChangePasswordRoute = typeof changePasswordRoute;
export type GetMFAStatusRoute = typeof getMFAStatusRoute;
export type SetupMFARoute = typeof setupMFARoute;
export type VerifyMFARoute = typeof verifyMFARoute;
export type DisableMFARoute = typeof disableMFARoute;
export type GetSessionsRoute = typeof getSessionsRoute;
export type RevokeSessionRoute = typeof revokeSessionRoute;
export type GetApiKeyRoute = typeof getApiKeyRoute;
export type CreateApiKeyRoute = typeof createApiKeyRoute;
export type DeleteApiKeyRoute = typeof deleteApiKeyRoute;
export type DeleteUserDataRoute = typeof deleteUserDataRoute;
export type DeleteAccountRoute = typeof deleteAccountRoute;
