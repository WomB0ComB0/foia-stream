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
 * @file Authentication Routes
 * @module routes/auth
 * @author FOIA Stream Team
 * @description Handles user authentication, registration, session management,
 *              and profile operations. All sensitive operations are protected
 *              by JWT authentication middleware.
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AC-2 (Account Management)
 */

// ============================================
// FOIA Stream - Authentication Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware';
import { jsonValidator } from '../middleware/validator.middleware';
import { authService } from '../services/auth.service';
import {
  ChangePasswordSchema,
  CreateUserSchema,
  LoginSchema,
  UpdateUserSchema,
} from '../validators/schemas';

const auth = new Hono();

/**
 * POST /auth/register - Create new user account
 *
 * @route POST /auth/register
 * @group Authentication - User registration and login
 * @param {CreateUserSchema} request.body.required - User registration data
 * @returns {Object} 201 - Created user object
 * @returns {Object} 400 - Registration error
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
auth.post('/register', jsonValidator(CreateUserSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const user = await authService.createUser(data);

    return c.json(
      {
        success: true,
        data: user,
        message: 'Account created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /auth/login - Authenticate user
 *
 * @route POST /auth/login
 * @group Authentication - User registration and login
 * @param {LoginSchema} request.body.required - Login credentials
 * @returns {Object} 200 - JWT token and user data
 * @returns {Object} 401 - Authentication failure
 * @compliance NIST 800-53 IA-2 (Identification and Authentication)
 * @compliance NIST 800-53 AU-2 (Audit Events) - Login events are logged
 */
auth.post('/login', jsonValidator(LoginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');
    const result = await authService.login(email, password);

    return c.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return c.json({ success: false, error: message }, 401);
  }
});

/**
 * POST /auth/logout - Logout user
 *
 * @route POST /auth/logout
 * @group Authentication - Session management
 * @security JWT
 * @returns {Object} 200 - Logout success message
 * @returns {Object} 400 - Logout error
 * @compliance NIST 800-53 AC-12 (Session Termination)
 */
auth.post('/logout', authMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7);
    if (!token) {
      return c.json({ success: false, error: 'No token provided' }, 400);
    }
    await authService.logout(token);

    return c.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Logout failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /auth/me - Get current user profile
 *
 * @route GET /auth/me
 * @group Authentication - Profile management
 * @security JWT
 * @returns {Object} 200 - Current user profile data
 * @returns {Object} 404 - User not found
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user');
    const user = await authService.getUserById(userId);

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    return c.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get profile';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PATCH /auth/me - Update current user profile
 *
 * @route PATCH /auth/me
 * @group Authentication - Profile management
 * @security JWT
 * @param {UpdateUserSchema} request.body.required - Profile update data
 * @returns {Object} 200 - Updated user profile
 * @returns {Object} 400 - Update error
 * @compliance NIST 800-53 AC-2 (Account Management)
 */
auth.patch('/me', authMiddleware, jsonValidator(UpdateUserSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');
    const user = await authService.updateUser(userId, data);

    return c.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /auth/change-password - Change password
 *
 * @route POST /auth/change-password
 * @group Authentication - Security
 * @security JWT
 * @param {ChangePasswordSchema} request.body.required - Current and new password
 * @returns {Object} 200 - Password change success
 * @returns {Object} 400 - Password change error
 * @compliance NIST 800-53 IA-5 (Authenticator Management)
 */
auth.post('/change-password', authMiddleware, jsonValidator(ChangePasswordSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { currentPassword, newPassword } = c.req.valid('json');
    await authService.changePassword(userId, currentPassword, newPassword);

    return c.json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed';
    return c.json({ success: false, error: message }, 400);
  }
});

export { auth as authRoutes };
