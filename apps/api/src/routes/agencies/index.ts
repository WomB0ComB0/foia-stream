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
 * @file Agency Routes Index
 * @module routes/agencies
 * @author FOIA Stream Team
 * @description Wires agency route definitions to handler implementations.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { createRouter } from '../../lib/create-app';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';
import * as handlers from './agencies.handlers';
import * as routes from './agencies.routes';

const router = createRouter();

// ============================================
// Public Routes (no middleware)
// ============================================

router.openapi(routes.searchAgenciesRoute, handlers.searchAgencies);
router.openapi(routes.getStatesRoute, handlers.getStates);
router.openapi(routes.getAgencyRoute, handlers.getAgency);
router.openapi(routes.getAgencyStatsRoute, handlers.getAgencyStats);

// ============================================
// Protected Routes (admin only)
// Apply path-specific middleware before registering handlers
// POST /agencies requires admin
// PATCH /agencies/:id requires admin
// ============================================

// For POST /agencies - need auth + admin
router.post('/agencies', authMiddleware, requireAdmin);

// For PATCH /agencies/:id - need auth + admin
router.patch('/agencies/:id', authMiddleware, requireAdmin);

// Register the protected route handlers
router.openapi(routes.createAgencyRoute, handlers.createAgency);
router.openapi(routes.updateAgencyRoute, handlers.updateAgency);

export default router;
