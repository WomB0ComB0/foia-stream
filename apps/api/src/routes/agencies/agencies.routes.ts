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
 * @file Agency Route Definitions
 * @module routes/agencies/routes
 * @author FOIA Stream Team
 * @description OpenAPI route definitions for agency management endpoints.
 *              Includes search, CRUD operations, and statistics retrieval.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { createRoute, z } from '@hono/zod-openapi';
import { HttpStatusCodes } from '../../lib/constants';

// ============================================
// Shared Schemas
// ============================================

/**
 * Jurisdiction level enum
 */
const JurisdictionLevelSchema = z.enum(['federal', 'state', 'local', 'county']);

/**
 * Agency response schema
 */
const AgencySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    abbreviation: z.string(),
    jurisdictionLevel: JurisdictionLevelSchema,
    state: z.string().nullable(),
    city: z.string().nullable(),
    county: z.string().nullable(),
    foiaEmail: z.string().nullable(),
    foiaAddress: z.string().nullable(),
    foiaPortalUrl: z.string().nullable(),
    responseDeadlineDays: z.number(),
    appealDeadlineDays: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Agency');

/**
 * Pagination metadata schema
 */
const PaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

/**
 * Error response schema
 */
const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
  })
  .openapi('ErrorResponse');

/**
 * Create agency request schema
 */
const CreateAgencySchema = z
  .object({
    name: z.string().min(1).openapi({ example: 'Federal Bureau of Investigation' }),
    abbreviation: z.string().optional().openapi({ example: 'FBI' }),
    jurisdictionLevel: JurisdictionLevelSchema.openapi({ example: 'federal' }),
    state: z.string().length(2).optional().openapi({ example: 'DC' }),
    city: z.string().optional().openapi({ example: 'Washington' }),
    county: z.string().optional(),
    foiaEmail: z.string().email().optional().openapi({ example: 'foia@fbi.gov' }),
    foiaAddress: z.string().optional(),
    foiaPortalUrl: z.string().url().optional().openapi({ example: 'https://vault.fbi.gov' }),
    responseDeadlineDays: z.number().int().positive().optional().default(20),
    appealDeadlineDays: z.number().int().positive().optional().default(30),
  })
  .openapi('CreateAgency');

/**
 * Update agency request schema
 */
const UpdateAgencySchema = z
  .object({
    name: z.string().min(1).optional(),
    abbreviation: z.string().optional(),
    jurisdictionLevel: JurisdictionLevelSchema.optional(),
    state: z.string().length(2).optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    foiaEmail: z.string().email().optional(),
    foiaAddress: z.string().optional(),
    foiaPortalUrl: z.string().url().optional(),
    responseDeadlineDays: z.number().int().positive().optional(),
    appealDeadlineDays: z.number().int().positive().optional(),
  })
  .openapi('UpdateAgency');

/**
 * Agency statistics schema (matches database agencyStats table)
 */
const AgencyStatsSchema = z
  .object({
    id: z.string(),
    agencyId: z.string(),
    totalRequests: z.number(),
    pendingRequests: z.number(),
    fulfilledRequests: z.number(),
    deniedRequests: z.number(),
    appealedRequests: z.number(),
    averageResponseDays: z.number().nullable(),
    complianceRate: z.number().nullable(),
    lastUpdated: z.string(),
  })
  .nullable()
  .openapi('AgencyStats');

/**
 * US State schema
 */
const USStateSchema = z.object({
  code: z.string(),
  name: z.string(),
});

// ============================================
// Route Definitions
// ============================================

/**
 * Search agencies route
 */
export const searchAgenciesRoute = createRoute({
  tags: ['Agencies'],
  method: 'get',
  path: '/agencies',
  summary: 'Search agencies',
  description:
    'Search for government agencies with filters for jurisdiction level, state, and text query.',
  request: {
    query: z.object({
      query: z.string().optional().openapi({ description: 'Text search for name or abbreviation' }),
      jurisdictionLevel: JurisdictionLevelSchema.optional().openapi({
        description: 'Filter by jurisdiction level',
      }),
      state: z
        .string()
        .length(2)
        .optional()
        .openapi({ description: 'Filter by state code (e.g., CA, NY)' }),
      page: z.coerce
        .number()
        .int()
        .positive()
        .optional()
        .default(1)
        .openapi({ description: 'Page number' }),
      pageSize: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .default(20)
        .openapi({ description: 'Items per page' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Paginated list of agencies',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(AgencySchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Search error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

/**
 * Get US states list route
 */
export const getStatesRoute = createRoute({
  tags: ['Agencies'],
  method: 'get',
  path: '/agencies/states',
  summary: 'Get US states list',
  description: 'Returns a list of US state codes and names for filtering agencies.',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'List of US states',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(USStateSchema),
          }),
        },
      },
    },
  },
});

/**
 * Get agency by ID route
 */
export const getAgencyRoute = createRoute({
  tags: ['Agencies'],
  method: 'get',
  path: '/agencies/{id}',
  summary: 'Get agency by ID',
  description: 'Retrieve detailed information about a specific government agency.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Agency UUID' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Agency details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: AgencySchema,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Agency not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Request error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

/**
 * Get agency statistics route
 */
export const getAgencyStatsRoute = createRoute({
  tags: ['Agencies'],
  method: 'get',
  path: '/agencies/{id}/stats',
  summary: 'Get agency statistics',
  description: 'Retrieve response time and approval statistics for a specific agency.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Agency UUID' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Agency statistics',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: AgencyStatsSchema,
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Statistics retrieval error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

/**
 * Create agency route (admin only)
 */
export const createAgencyRoute = createRoute({
  tags: ['Agencies'],
  method: 'post',
  path: '/agencies',
  summary: 'Create new agency',
  description: 'Create a new government agency. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      description: 'Agency data',
      content: {
        'application/json': {
          schema: CreateAgencySchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: 'Agency created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: AgencySchema,
            message: z.string().default('Agency created successfully'),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Creation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Admin privileges required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

/**
 * Update agency route (admin only)
 */
export const updateAgencyRoute = createRoute({
  tags: ['Agencies'],
  method: 'patch',
  path: '/agencies/{id}',
  summary: 'Update agency',
  description: 'Update an existing government agency. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Agency UUID' }),
    }),
    body: {
      required: true,
      description: 'Updated agency data',
      content: {
        'application/json': {
          schema: UpdateAgencySchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Agency updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: AgencySchema,
            message: z.string().default('Agency updated successfully'),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Update error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: {
      description: 'Not authenticated',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.FORBIDDEN]: {
      description: 'Admin privileges required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Agency not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

// Export schemas for use in handlers
export {
  AgencySchema,
  AgencyStatsSchema,
  CreateAgencySchema,
  PaginationSchema,
  UpdateAgencySchema,
};
