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
 * @file Authentication Middleware
 * @module middleware/auth
 * @author FOIA Stream Team
 * @description Provides JWT-based authentication and role-based authorization
 *              middleware for protecting API routes.
 * @compliance NIST 800-53 AC-3 (Access Enforcement), IA-2 (Identification and Authentication)
 */

// ============================================
// FOIA Stream - Authentication Middleware
// ============================================

import type { Context, Next } from 'hono';
import { authService, type JWTPayload } from '../services/auth.service';
import type { UserRole } from '../types';

// Extend Hono context to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * Authentication middleware - requires valid JWT
 *
 * @function authMiddleware
 * @param {Context} c - Hono context
 * @param {Next} next - Next middleware function
 * @returns {Promise<Response | undefined>} 401 response if unauthorized, otherwise continues
 * @throws Returns 401 if Authorization header is missing or token is invalid
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 *
 * @example
 * ```typescript
 * app.use('/api/protected/*', authMiddleware);
 * ```
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | undefined> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization header required' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await authService.verifyToken(token);
    c.set('user', payload);
    await next();
    return undefined;
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
}

/**
 * Optional authentication middleware - sets user if token provided
 *
 * @function optionalAuthMiddleware
 * @param {Context} c - Hono context
 * @param {Next} next - Next middleware function
 * @returns {Promise<void>}
 * @description Attempts to authenticate but continues even if no token or invalid token.
 *              Useful for routes that behave differently for authenticated users.
 *
 * @example
 * ```typescript
 * app.use('/api/public/*', optionalAuthMiddleware);
 * ```
 */
export async function optionalAuthMiddleware(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const payload = await authService.verifyToken(token);
      c.set('user', payload);
    } catch {
      // Token invalid but continue without user
    }
  }

  await next();
}

/**
 * Role-based authorization middleware factory
 *
 * @function requireRoles
 * @param {...UserRole} allowedRoles - Roles that are permitted to access the route
 * @returns {MiddlewareHandler} Middleware that checks if user has required role
 * @throws Returns 401 if not authenticated, 403 if insufficient permissions
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 *
 * @example
 * ```typescript
 * app.post('/api/admin/users', requireRoles('admin'), createUserHandler);
 * app.get('/api/agency/requests', requireRoles('admin', 'agency_official'), listRequestsHandler);
 * ```
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    await next();
    return undefined;
  };
}

/**
 * Admin-only middleware - shorthand for requireRoles('admin')
 *
 * @constant
 * @type {MiddlewareHandler}
 * @compliance NIST 800-53 AC-6 (Least Privilege)
 */
export const requireAdmin = requireRoles('admin');

/**
 * Agency official middleware - allows admin and agency_official roles
 *
 * @constant
 * @type {MiddlewareHandler}
 */
export const requireAgencyOfficial = requireRoles('admin', 'agency_official');
