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
 * @file Agency Handlers
 * @module routes/agencies/handlers
 * @author FOIA Stream Team
 * @description Handler implementations for agency OpenAPI routes.
 *              Integrates with AgencyService for data operations.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { HttpStatusCodes } from '../../lib/constants';
import type { AppRouteHandler } from '../../lib/types';
import { agencyService } from '../../services/agency.service';
import type { Agency } from '../../types';
import type {
  createAgencyRoute,
  getAgencyRoute,
  getAgencyStatsRoute,
  getStatesRoute,
  searchAgenciesRoute,
  updateAgencyRoute,
} from './agencies.routes';

// ============================================
// Helper Functions
// ============================================

/**
 * Maps database agency to API response format
 * @param agency - Database agency record
 * @returns API-formatted agency object
 */
function mapAgencyResponse(agency: Agency) {
  return {
    id: agency.id,
    name: agency.name,
    abbreviation: agency.abbreviation ?? '',
    jurisdictionLevel: agency.jurisdictionLevel,
    state: agency.state ?? null,
    city: agency.city ?? null,
    county: agency.county ?? null,
    foiaEmail: agency.foiaEmail ?? null,
    foiaAddress: agency.foiaAddress ?? null,
    foiaPortalUrl: agency.foiaPortalUrl ?? null,
    responseDeadlineDays: agency.responseDeadlineDays,
    appealDeadlineDays: agency.appealDeadlineDays,
    createdAt: agency.createdAt,
    updatedAt: agency.updatedAt,
  };
}

// ============================================
// Handler Implementations
// ============================================

/**
 * Search agencies handler
 * @description Searches agencies with optional filters for jurisdiction, state, and text query
 */
export const searchAgencies: AppRouteHandler<typeof searchAgenciesRoute> = async (c) => {
  try {
    const { query, jurisdictionLevel, state, page, pageSize } = c.req.valid('query');

    const result = await agencyService.searchAgencies(
      { query, jurisdictionLevel, state },
      page ?? 1,
      pageSize ?? 20,
    );

    return c.json(
      {
        success: true as const,
        data: result.data.map(mapAgencyResponse),
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
    const message = error instanceof Error ? error.message : 'Search failed';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get US states handler
 * @description Returns list of US state codes and names
 */
export const getStates: AppRouteHandler<typeof getStatesRoute> = async (c) => {
  const states = agencyService.getUSStates();
  return c.json(
    {
      success: true as const,
      data: states,
    },
    HttpStatusCodes.OK,
  );
};

/**
 * Get agency by ID handler
 * @description Retrieves detailed information about a specific agency
 */
export const getAgency: AppRouteHandler<typeof getAgencyRoute> = async (c) => {
  try {
    const { id } = c.req.valid('param');
    const agency = await agencyService.getAgencyById(id);

    if (!agency) {
      return c.json(
        { success: false as const, error: 'Agency not found' },
        HttpStatusCodes.NOT_FOUND,
      );
    }

    return c.json(
      {
        success: true as const,
        data: mapAgencyResponse(agency),
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get agency';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Get agency statistics handler
 * @description Retrieves response time and approval statistics for an agency
 */
export const getAgencyStats: AppRouteHandler<typeof getAgencyStatsRoute> = async (c) => {
  try {
    const { id } = c.req.valid('param');
    const stats = await agencyService.getAgencyStats(id);

    return c.json(
      {
        success: true as const,
        data: stats ?? null,
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get statistics';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Create agency handler (admin only)
 * @description Creates a new government agency
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
export const createAgency: AppRouteHandler<typeof createAgencyRoute> = async (c) => {
  try {
    const data = c.req.valid('json');
    const agency = await agencyService.createAgency(data);

    return c.json(
      {
        success: true as const,
        data: mapAgencyResponse(agency),
        message: 'Agency created successfully',
      },
      HttpStatusCodes.CREATED,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agency';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};

/**
 * Update agency handler (admin only)
 * @description Updates an existing government agency
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */
export const updateAgency: AppRouteHandler<typeof updateAgencyRoute> = async (c) => {
  try {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const agency = await agencyService.updateAgency(id, data);

    return c.json(
      {
        success: true as const,
        data: mapAgencyResponse(agency),
        message: 'Agency updated successfully',
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update agency';
    return c.json({ success: false as const, error: message }, HttpStatusCodes.BAD_REQUEST);
  }
};
