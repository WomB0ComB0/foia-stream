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
 * @file FOIA Request Routes
 * @module routes/requests
 * @author FOIA Stream Team
 * @description Handles FOIA request lifecycle including creation, submission,
 *              status tracking, and deadline management. Supports both public
 *              and private requests with proper access control.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 * @compliance NIST 800-53 AU-2 (Audit Events) - Request state changes are logged
 */

// ============================================
// FOIA Stream - FOIA Request Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { jsonValidator, paramValidator, queryValidator } from '../middleware/validator.middleware';
import { foiaRequestService } from '../services/foia-request.service';
import {
  CreateRequestSchema,
  IdParamSchema,
  PaginationSchema,
  RequestSearchSchema,
  UpdateRequestSchema,
} from '../validators/schemas';

const requests = new Hono();

/**
 * GET /requests - Search public requests
 *
 * @route GET /requests
 * @group Requests - Public FOIA request search
 * @param {RequestSearchSchema} request.query - Search filters (status, agencyId, page, pageSize)
 * @returns {Object} 200 - Paginated list of public requests
 * @returns {Object} 400 - Search error
 */
requests.get('/', queryValidator(RequestSearchSchema), async (c) => {
  try {
    const filters = c.req.valid('query');
    const { page, pageSize, ...searchFilters } = filters;

    const result = await foiaRequestService.searchRequests(searchFilters, page, pageSize);

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/my - Get current user's requests
 *
 * @route GET /requests/my
 * @group Requests - User request management
 * @security JWT
 * @param {PaginationSchema} request.query - Pagination (page, pageSize)
 * @returns {Object} 200 - Paginated list of user's requests
 * @returns {Object} 400 - Retrieval error
 */
requests.get('/my', authMiddleware, queryValidator(PaginationSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { page, pageSize } = c.req.valid('query');

    const result = await foiaRequestService.getUserRequests(userId, page, pageSize);

    return c.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get requests';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/deadlines - Get requests with upcoming deadlines
 *
 * @route GET /requests/deadlines
 * @group Requests - Deadline tracking
 * @security JWT
 * @param {number} days.query - Number of days to look ahead (default: 7)
 * @returns {Object} 200 - List of requests with upcoming deadlines
 * @returns {Object} 400 - Retrieval error
 */
requests.get('/deadlines', authMiddleware, async (c) => {
  try {
    const days = Number(c.req.query('days')) || 7;
    const requests = await foiaRequestService.getUpcomingDeadlines(days);

    return c.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get deadlines';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/overdue - Get overdue requests
 *
 * @route GET /requests/overdue
 * @group Requests - Deadline tracking
 * @security JWT
 * @returns {Object} 200 - List of overdue requests
 * @returns {Object} 400 - Retrieval error
 */
requests.get('/overdue', authMiddleware, async (c) => {
  try {
    const requests = await foiaRequestService.getOverdueRequests();

    return c.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get overdue requests';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /requests/:id - Get request by ID
 *
 * @route GET /requests/:id
 * @group Requests - Request retrieval
 * @param {string} id.path.required - Request UUID
 * @returns {Object} 200 - Request details with agency info
 * @returns {Object} 404 - Request not found or not accessible
 * @description Returns public requests to anyone, private requests only to owner
 */
requests.get('/:id', optionalAuthMiddleware, paramValidator(IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const request = await foiaRequestService.getRequestWithAgency(id);

    if (!request) {
      return c.json({ success: false, error: 'Request not found' }, 404);
    }

    // Check if request is public or belongs to user
    const user = c.get('user');
    if (!request.isPublic && (!user || request.userId !== user.userId)) {
      return c.json({ success: false, error: 'Request not found' }, 404);
    }

    return c.json({
      success: true,
      data: request,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get request';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /requests - Create new FOIA request
 *
 * @route POST /requests
 * @group Requests - Request creation
 * @security JWT
 * @param {CreateRequestSchema} request.body.required - Request data (title, description, agencyId)
 * @returns {Object} 201 - Created request
 * @returns {Object} 400 - Creation error
 * @compliance NIST 800-53 AU-2 (Audit Events) - Creation is logged
 */
requests.post('/', authMiddleware, jsonValidator(CreateRequestSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');

    const request = await foiaRequestService.createRequest(userId, data);

    return c.json(
      {
        success: true,
        data: request,
        message: 'Request created successfully',
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create request';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /requests/:id/submit - Submit a draft request
 *
 * @route POST /requests/:id/submit
 * @group Requests - Request lifecycle
 * @security JWT
 * @param {string} id.path.required - Request UUID
 * @returns {Object} 200 - Submitted request
 * @returns {Object} 400 - Submission error (not owner or invalid state)
 */
requests.post('/:id/submit', authMiddleware, paramValidator(IdParamSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const request = await foiaRequestService.submitRequest(id, userId);

    return c.json({
      success: true,
      data: request,
      message: 'Request submitted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit request';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * PATCH /requests/:id - Update request (status, tracking, etc.)
 *
 * @route PATCH /requests/:id
 * @group Requests - Request management
 * @security JWT
 * @param {string} id.path.required - Request UUID
 * @param {UpdateRequestSchema} request.body.required - Updated request data
 * @returns {Object} 200 - Updated request
 * @returns {Object} 400 - Update error
 * @compliance NIST 800-53 AU-2 (Audit Events) - Updates are logged
 */
requests.patch(
  '/:id',
  authMiddleware,
  paramValidator(IdParamSchema),
  jsonValidator(UpdateRequestSchema),
  async (c) => {
    try {
      const { userId } = c.get('user');
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const request = await foiaRequestService.updateRequest(id, userId, data);

      return c.json({
        success: true,
        data: request,
        message: 'Request updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update request';
      return c.json({ success: false, error: message }, 400);
    }
  },
);

/**
 * POST /requests/:id/withdraw - Withdraw a request
 *
 * @route POST /requests/:id/withdraw
 * @group Requests - Request lifecycle
 * @security JWT
 * @param {string} id.path.required - Request UUID
 * @returns {Object} 200 - Withdrawn request
 * @returns {Object} 400 - Withdrawal error (not owner or invalid state)
 * @compliance NIST 800-53 AU-2 (Audit Events) - Withdrawal is logged
 */
requests.post('/:id/withdraw', authMiddleware, paramValidator(IdParamSchema), async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const request = await foiaRequestService.withdrawRequest(id, userId);

    return c.json({
      success: true,
      data: request,
      message: 'Request withdrawn successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to withdraw request';
    return c.json({ success: false, error: message }, 400);
  }
});

export { requests as requestRoutes };
