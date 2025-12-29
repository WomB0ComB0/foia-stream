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
 * @file FOIA Request Route Definitions
 * @module routes/requests/routes
 * @author FOIA Stream Team
 * @description OpenAPI route definitions for FOIA request endpoints.
 *              Includes request lifecycle, search, and deadline tracking.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 * @compliance NIST 800-53 AU-2 (Audit Events)
 */

import { HttpStatusCodes } from '@/lib/constants';
import { createRoute, z } from '@hono/zod-openapi';

// ============================================
// Shared Schemas
// ============================================

/**
 * Request status enum
 */
const RequestStatusSchema = z.enum([
  'draft',
  'submitted',
  'acknowledged',
  'processing',
  'fulfilled',
  'partially_fulfilled',
  'denied',
  'appealed',
  'appeal_pending',
  'appeal_granted',
  'appeal_denied',
  'withdrawn',
]);

/**
 * Record category enum
 */
const RecordCategorySchema = z.enum([
  'body_cam_footage',
  'incident_report',
  'arrest_record',
  'use_of_force_report',
  'policy_document',
  'budget_record',
  'contract',
  'complaint_record',
  'training_material',
  'personnel_record',
  'communication',
  'other',
]);

/**
 * FOIA Request response schema
 */
const FOIARequestSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    agencyId: z.string(),
    status: RequestStatusSchema,
    category: RecordCategorySchema,
    title: z.string(),
    description: z.string(),
    dateRangeStart: z.string().nullish(),
    dateRangeEnd: z.string().nullish(),
    templateId: z.string().nullish(),
    trackingNumber: z.string().nullish(),
    estimatedFee: z.number().nullish(),
    actualFee: z.number().nullish(),
    submittedAt: z.string().nullish(),
    acknowledgedAt: z.string().nullish(),
    dueDate: z.string().nullish(),
    completedAt: z.string().nullish(),
    denialReason: z.string().nullish(),
    isPublic: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('FOIARequest');

/**
 * Request with agency info schema
 */
const FOIARequestWithAgencySchema = FOIARequestSchema.extend({
  agency: z
    .object({
      id: z.string(),
      name: z.string(),
      abbreviation: z.string().nullish(),
      jurisdictionLevel: z.string(),
    })
    .optional(),
}).openapi('FOIARequestWithAgency');

/**
 * Pagination schema
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
 * Create request schema
 */
const CreateRequestSchema = z
  .object({
    agencyId: z.string().openapi({ example: 'agency-123' }),
    category: RecordCategorySchema.openapi({ example: 'body_cam_footage' }),
    title: z
      .string()
      .min(1)
      .max(200)
      .openapi({ example: 'Body camera footage from incident on Main St' }),
    description: z.string().min(1).openapi({
      example:
        'Requesting all body camera footage from officers responding to incident #12345 on January 15, 2024',
    }),
    dateRangeStart: z.string().optional().openapi({ example: '2024-01-15' }),
    dateRangeEnd: z.string().optional().openapi({ example: '2024-01-15' }),
    templateId: z.string().optional(),
    isPublic: z.boolean().default(false).openapi({ example: true }),
  })
  .openapi('CreateRequest');

/**
 * Update request schema
 */
const UpdateRequestSchema = z
  .object({
    status: RequestStatusSchema.optional(),
    trackingNumber: z.string().optional(),
    estimatedFee: z.number().optional(),
    actualFee: z.number().optional(),
    dueDate: z.string().optional(),
    denialReason: z.string().optional(),
    isPublic: z.boolean().optional(),
  })
  .openapi('UpdateRequest');

// ============================================
// Route Definitions
// ============================================

/**
 * Search public requests
 */
export const searchRequestsRoute = createRoute({
  tags: ['Requests'],
  method: 'get',
  path: '/requests',
  summary: 'Search FOIA requests',
  description: 'Search public FOIA requests with filters for status, agency, and category.',
  request: {
    query: z.object({
      status: RequestStatusSchema.optional().openapi({ description: 'Filter by request status' }),
      agencyId: z.string().optional().openapi({ description: 'Filter by agency ID' }),
      category: RecordCategorySchema.optional().openapi({
        description: 'Filter by record category',
      }),
      page: z.coerce.number().int().positive().optional().default(1).openapi({ type: 'integer' }),
      pageSize: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .default(20)
        .openapi({ type: 'integer' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Paginated list of FOIA requests',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(FOIARequestWithAgencySchema),
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
 * Get current user's requests
 */
export const getMyRequestsRoute = createRoute({
  tags: ['Requests'],
  method: 'get',
  path: '/requests/my',
  summary: 'Get my requests',
  description: "Get the current authenticated user's FOIA requests.",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().positive().optional().default(1).openapi({ type: 'integer' }),
      pageSize: z.coerce
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .default(20)
        .openapi({ type: 'integer' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "User's FOIA requests",
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(FOIARequestWithAgencySchema),
            pagination: PaginationSchema,
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Retrieval error',
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
  },
});

/**
 * Get requests with upcoming deadlines
 */
export const getDeadlinesRoute = createRoute({
  tags: ['Requests'],
  method: 'get',
  path: '/requests/deadlines',
  summary: 'Get upcoming deadlines',
  description: 'Get FOIA requests with deadlines in the next N days.',
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      days: z.coerce
        .number()
        .int()
        .positive()
        .optional()
        .default(7)
        .openapi({ type: 'integer', description: 'Days to look ahead' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Requests with upcoming deadlines',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(FOIARequestWithAgencySchema),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Retrieval error',
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
  },
});

/**
 * Get overdue requests
 */
export const getOverdueRoute = createRoute({
  tags: ['Requests'],
  method: 'get',
  path: '/requests/overdue',
  summary: 'Get overdue requests',
  description: 'Get FOIA requests that have passed their due date without completion.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Overdue requests',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(FOIARequestWithAgencySchema),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Retrieval error',
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
  },
});

/**
 * Get request by ID
 */
export const getRequestRoute = createRoute({
  tags: ['Requests'],
  method: 'get',
  path: '/requests/{id}',
  summary: 'Get request by ID',
  description:
    'Get a specific FOIA request. Public requests are accessible to anyone, private requests only to the owner.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Request UUID' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Request details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: FOIARequestWithAgencySchema,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Request not found or not accessible',
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
 * Create new FOIA request
 */
export const createRequestRoute = createRoute({
  tags: ['Requests'],
  method: 'post',
  path: '/requests',
  summary: 'Create FOIA request',
  description: 'Create a new FOIA request. The request starts in draft status.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      description: 'FOIA request data',
      content: {
        'application/json': {
          schema: CreateRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: 'Request created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: FOIARequestSchema,
            message: z.string().default('Request created successfully').openapi({ type: 'string' }),
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
 * Submit a draft request
 */
export const submitRequestRoute = createRoute({
  tags: ['Requests'],
  method: 'post',
  path: '/requests/{id}/submit',
  summary: 'Submit request',
  description: 'Submit a draft FOIA request to the agency.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Request UUID' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Request submitted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: FOIARequestSchema,
            message: z
              .string()
              .default('Request submitted successfully')
              .openapi({ type: 'string' }),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Submission error (not owner or invalid state)',
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
  },
});

/**
 * Update request
 */
export const updateRequestRoute = createRoute({
  tags: ['Requests'],
  method: 'patch',
  path: '/requests/{id}',
  summary: 'Update request',
  description: 'Update a FOIA request (status, tracking number, fees, etc.).',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Request UUID' }),
    }),
    body: {
      required: true,
      description: 'Updated request data',
      content: {
        'application/json': {
          schema: UpdateRequestSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Request updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: FOIARequestSchema,
            message: z.string().default('Request updated successfully').openapi({ type: 'string' }),
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
 * Withdraw a request
 */
export const withdrawRequestRoute = createRoute({
  tags: ['Requests'],
  method: 'post',
  path: '/requests/{id}/withdraw',
  summary: 'Withdraw request',
  description: 'Withdraw a submitted FOIA request.',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Request UUID' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Request withdrawn successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: FOIARequestSchema,
            message: z
              .string()
              .default('Request withdrawn successfully')
              .openapi({ type: 'string' }),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Withdrawal error (not owner or invalid state)',
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
  },
});

// Export schemas
export {
  CreateRequestSchema,
  FOIARequestSchema,
  FOIARequestWithAgencySchema,
  PaginationSchema,
  RecordCategorySchema,
  RequestStatusSchema,
  UpdateRequestSchema,
};
