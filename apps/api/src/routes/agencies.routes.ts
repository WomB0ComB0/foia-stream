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
 * @file Agency Routes
 * @module routes/agencies
 * @author FOIA Stream Team
 * @description Handles government agency management including search, CRUD operations,
 *              and statistics retrieval. Admin-only operations are protected by RBAC.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

// ============================================
// FOIA Stream - Agency Routes
// ============================================

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { effectValidator } from '../middleware/validator.middleware';
import { agencyService } from '../services/agency.service';
import {
  AgencySearchSchema,
  CreateAgencySchema,
  IdParamSchema,
  UpdateAgencySchema,
} from '../validators/schemas';

const agencies = new Hono();

/**
 * GET /agencies - Search agencies
 *
 * @route GET /agencies
 * @group Agencies - Agency search and retrieval
 * @param {AgencySearchSchema} request.query - Search filters (name, state, level, page, pageSize)
 * @returns {Object} 200 - Paginated list of agencies
 * @returns {Object} 400 - Search error
 */
agencies.get('/', effectValidator('query', AgencySearchSchema), async (c) => {
  try {
    const filters = c.req.valid('query');
    const { page, pageSize, ...searchFilters } = filters;

    const result = await agencyService.searchAgencies(searchFilters, page, pageSize);

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
 * GET /agencies/states - Get US states list
 *
 * @route GET /agencies/states
 * @group Agencies - Reference data
 * @returns {Object} 200 - Array of US state codes and names
 */
agencies.get('/states', (c) => {
  return c.json({
    success: true,
    data: agencyService.getUSStates(),
  });
});

/**
 * GET /agencies/:id - Get agency by ID
 *
 * @route GET /agencies/:id
 * @group Agencies - Agency retrieval
 * @param {string} id.path.required - Agency UUID
 * @returns {Object} 200 - Agency details
 * @returns {Object} 404 - Agency not found
 */
agencies.get('/:id', effectValidator('param', IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const agency = await agencyService.getAgencyById(id);

    if (!agency) {
      return c.json({ success: false, error: 'Agency not found' }, 404);
    }

    return c.json({
      success: true,
      data: agency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agency';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * GET /agencies/:id/stats - Get agency statistics
 *
 * @route GET /agencies/:id/stats
 * @group Agencies - Agency analytics
 * @param {string} id.path.required - Agency UUID
 * @returns {Object} 200 - Agency response time and approval statistics
 * @returns {Object} 400 - Statistics retrieval error
 */
agencies.get('/:id/stats', effectValidator('param', IdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param');
    const stats = await agencyService.getAgencyStats(id);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get statistics';
    return c.json({ success: false, error: message }, 400);
  }
});

/**
 * POST /agencies - Create new agency (admin only)
 *
 * @route POST /agencies
 * @group Agencies - Agency management
 * @security JWT - Admin role required
 * @param {CreateAgencySchema} request.body.required - Agency data
 * @returns {Object} 201 - Created agency
 * @returns {Object} 400 - Creation error
 * @returns {Object} 403 - Forbidden (non-admin)
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
agencies.post(
  '/',
  authMiddleware,
  requireAdmin,
  effectValidator('json', CreateAgencySchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const agency = await agencyService.createAgency(data);

      return c.json(
        {
          success: true,
          data: agency,
          message: 'Agency created successfully',
        },
        201,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create agency';
      return c.json({ success: false, error: message }, 400);
    }
  },
);

/**
 * PATCH /agencies/:id - Update agency (admin only)
 *
 * @route PATCH /agencies/:id
 * @group Agencies - Agency management
 * @security JWT - Admin role required
 * @param {string} id.path.required - Agency UUID
 * @param {UpdateAgencySchema} request.body.required - Updated agency data
 * @returns {Object} 200 - Updated agency
 * @returns {Object} 400 - Update error
 * @returns {Object} 403 - Forbidden (non-admin)
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
agencies.patch(
  '/:id',
  authMiddleware,
  requireAdmin,
  effectValidator('param', IdParamSchema),
  effectValidator('json', UpdateAgencySchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const agency = await agencyService.updateAgency(id, data);

      return c.json({
        success: true,
        data: agency,
        message: 'Agency updated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update agency';
      return c.json({ success: false, error: message }, 400);
    }
  },
);

export { agencies as agencyRoutes };
