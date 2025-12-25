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
 * @file Auth Route Module
 * @module routes/auth
 * @author FOIA Stream Team
 * @description Wires auth route definitions to their handlers with middleware.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

import { createRouter } from '@/lib/create-app';
import { authMiddleware } from '@/middleware/auth.middleware';

import * as handlers from './auth.handlers';
import * as routes from './auth.routes';

const router = createRouter();

// Public Routes (no middleware)
router.openapi(routes.registerRoute, handlers.register);
router.openapi(routes.loginRoute, handlers.login);
router.openapi(routes.verifyMFALoginRoute, handlers.verifyMFALogin);

// Protected Routes - apply middleware to specific paths
router.use('/auth/logout', authMiddleware);
router.use('/auth/me', authMiddleware);
router.use('/auth/change-password', authMiddleware);
router.use('/auth/mfa/*', authMiddleware);
router.use('/auth/sessions', authMiddleware);
router.use('/auth/sessions/*', authMiddleware);
router.use('/auth/api-key', authMiddleware);
router.use('/auth/data', authMiddleware);
router.use('/auth/account', authMiddleware);

// Register the protected route handlers
router.openapi(routes.logoutRoute, handlers.logout);
router.openapi(routes.getMeRoute, handlers.getMe);
router.openapi(routes.updateMeRoute, handlers.updateMe);
router.openapi(routes.changePasswordRoute, handlers.changePassword);

// MFA routes
router.openapi(routes.getMFAStatusRoute, handlers.getMFAStatus);
router.openapi(routes.setupMFARoute, handlers.setupMFA);
router.openapi(routes.verifyMFARoute, handlers.verifyMFA);
router.openapi(routes.disableMFARoute, handlers.disableMFA);
router.openapi(routes.regenerateBackupCodesRoute, handlers.regenerateBackupCodes);

// Session routes
router.openapi(routes.getSessionsRoute, handlers.getSessions);
router.openapi(routes.revokeSessionRoute, handlers.revokeSession);

// API Key routes
router.openapi(routes.getApiKeyRoute, handlers.getApiKey);
router.openapi(routes.createApiKeyRoute, handlers.createApiKey);
router.openapi(routes.deleteApiKeyRoute, handlers.deleteApiKey);

// Account deletion routes
router.openapi(routes.deleteUserDataRoute, handlers.deleteUserData);
router.openapi(routes.deleteAccountRoute, handlers.deleteAccount);

export default router;
