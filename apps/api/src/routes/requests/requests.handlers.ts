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
 * @file FOIA Request Handlers
 * @module routes/requests/handlers
 * @author FOIA Stream Team
 * @description Handler implementations for FOIA request OpenAPI routes.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 * @compliance NIST 800-53 AU-2 (Audit Events)
 */

import { HttpStatusCodes } from '@/lib/constants';
import { handleRouteError } from '@/lib/responses';
import type { AppRouteHandler } from '@/lib/types';
import { foiaRequestService } from '@/services/requests/foia-request.service';
import type {
  createBulkRequestRoute,
  createRequestRoute,
  getDeadlinesRoute,
  getMyRequestsRoute,
  getOverdueRoute,
  getRequestRoute,
  searchRequestsRoute,
  submitRequestRoute,
  updateRequestRoute,
  withdrawRequestRoute,
} from './requests.routes';

// ============================================
// Handler Implementations
// ============================================

/**
 * Search public requests handler
 */
export const searchRequests: AppRouteHandler<typeof searchRequestsRoute> = async (c) => {
  try {
    const { status, agencyId, category, page, pageSize } = c.req.valid('query');

    const result = await foiaRequestService.searchRequests(
      { status, agencyId, category },
      page ?? 1,
      pageSize ?? 20,
    );

    return c.json(
      {
        success: true as const,
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Search failed', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get current user's requests handler
 */
export const getMyRequests: AppRouteHandler<typeof getMyRequestsRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { page, pageSize } = c.req.valid('query');

    const result = await foiaRequestService.getUserRequests(userId, page ?? 1, pageSize ?? 20);

    return c.json(
      {
        success: true as const,
        data: result.data,
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.pageSize,
          totalItems: result.pagination.totalItems,
          totalPages: result.pagination.totalPages,
        },
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to get requests', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get requests with upcoming deadlines handler
 */
export const getDeadlines: AppRouteHandler<typeof getDeadlinesRoute> = async (c) => {
  try {
    const { days } = c.req.valid('query');
    const requests = await foiaRequestService.getUpcomingDeadlines(days ?? 7);

    return c.json(
      {
        success: true as const,
        data: requests,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to get deadlines', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get overdue requests handler
 */
export const getOverdue: AppRouteHandler<typeof getOverdueRoute> = async (c) => {
  try {
    const requests = await foiaRequestService.getOverdueRequests();

    return c.json(
      {
        success: true as const,
        data: requests,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(
      c,
      error,
      'Failed to get overdue requests',
      HttpStatusCodes.BAD_REQUEST,
    );
  }
};

/**
 * Get request by ID handler
 */
export const getRequest: AppRouteHandler<typeof getRequestRoute> = async (c) => {
  try {
    const { id } = c.req.valid('param');
    const request = await foiaRequestService.getRequestWithAgency(id);

    if (!request) {
      return c.json(
        { success: false as const, error: 'Request not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    // Check if request is public or belongs to user
    // Note: This route doesn't have auth middleware, so user may be undefined
    const user = c.get('user');
    if (!request.isPublic && (!user || request.userId !== user.userId)) {
      return c.json(
        { success: false as const, error: 'Request not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(
      {
        success: true as const,
        data: request,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to get request', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Create new FOIA request handler
 */
export const createRequest: AppRouteHandler<typeof createRequestRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const data = c.req.valid('json');

    const request = await foiaRequestService.createRequest(userId, data);

    return c.json(
      {
        success: true as const,
        data: request,
        message: 'Request created successfully',
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to create request', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Bulk create FOIA requests handler
 * Creates multiple requests for different agencies with the same content
 */
export const createBulkRequests: AppRouteHandler<typeof createBulkRequestRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { agencyIds, ...requestData } = c.req.valid('json');

    // Create requests for each agency
    const createdRequests = await Promise.all(
      agencyIds.map((agencyId: string) =>
        foiaRequestService.createRequest(userId, {
          agencyId,
          ...requestData,
        }),
      ),
    );

    return c.json(
      {
        success: true as const,
        data: {
          createdRequests,
          totalCreated: createdRequests.length,
        },
        message: `Successfully created ${createdRequests.length} request${createdRequests.length > 1 ? 's' : ''}`,
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error) {
    return handleRouteError(
      c,
      error,
      'Failed to create bulk requests',
      HttpStatusCodes.BAD_REQUEST,
    );
  }
};

/**
 * Submit a draft request handler
 */
export const submitRequest: AppRouteHandler<typeof submitRequestRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const request = await foiaRequestService.submitRequest(id, userId);

    return c.json(
      {
        success: true as const,
        data: request,
        message: 'Request submitted successfully',
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to submit request', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Update request handler
 */
export const updateRequest: AppRouteHandler<typeof updateRequestRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');

    const request = await foiaRequestService.updateRequest(id, userId, data);

    return c.json(
      {
        success: true as const,
        data: request,
        message: 'Request updated successfully',
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to update request', HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Withdraw a request handler
 */
export const withdrawRequest: AppRouteHandler<typeof withdrawRequestRoute> = async (c) => {
  try {
    const { userId } = c.get('user');
    const { id } = c.req.valid('param');

    const request = await foiaRequestService.withdrawRequest(id, userId);

    return c.json(
      {
        success: true as const,
        data: request,
        message: 'Request withdrawn successfully',
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    return handleRouteError(c, error, 'Failed to withdraw request', HttpStatusCodes.BAD_REQUEST);
  }
};
