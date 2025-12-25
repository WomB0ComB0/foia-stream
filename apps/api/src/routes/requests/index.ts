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
 * @file FOIA Requests Routes Index
 * @module routes/requests
 * @author FOIA Stream Team
 * @description Wires FOIA request route definitions to handler implementations.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 * @compliance NIST 800-53 AU-2 (Audit Events)
 */

import { createRouter } from '../../lib/create-app';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import * as handlers from './requests.handlers';
import * as routes from './requests.routes';

const router = createRouter();

// ============================================
// Public Routes (no middleware)
// ============================================

router.openapi(routes.searchRequestsRoute, handlers.searchRequests);

// ============================================
// Protected Routes (auth required)
// Apply path-specific middleware before registering handlers
// NOTE: Specific routes MUST be registered before parameterized routes
// ============================================

// User's own requests - must be before /requests/:id
router.get('/requests/my', authMiddleware);
router.openapi(routes.getMyRequestsRoute, handlers.getMyRequests);

// Deadlines and overdue (need auth)
router.get('/requests/deadlines', authMiddleware);
router.openapi(routes.getDeadlinesRoute, handlers.getDeadlines);

router.get('/requests/overdue', authMiddleware);
router.openapi(routes.getOverdueRoute, handlers.getOverdue);

// ============================================
// Optional Auth Route (GET /requests/:id)
// Must be after specific routes like /requests/my
// ============================================

router.get('/requests/:id', optionalAuthMiddleware);
router.openapi(routes.getRequestRoute, handlers.getRequest);

// ============================================
// More Protected Routes
// ============================================

// Create request (POST /requests)
router.post('/requests', authMiddleware);
router.openapi(routes.createRequestRoute, handlers.createRequest);

// Submit request
router.post('/requests/:id/submit', authMiddleware);
router.openapi(routes.submitRequestRoute, handlers.submitRequest);

// Update request
router.patch('/requests/:id', authMiddleware);
router.openapi(routes.updateRequestRoute, handlers.updateRequest);

// Withdraw request
router.post('/requests/:id/withdraw', authMiddleware);
router.openapi(routes.withdrawRequestRoute, handlers.withdrawRequest);

export default router;
