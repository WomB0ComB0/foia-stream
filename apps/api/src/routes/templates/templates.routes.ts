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
 * @file Template Route Definitions
 * @module routes/templates/routes
 * @author FOIA Stream Team
 * @description OpenAPI route definitions for FOIA request template endpoints.
 *              Includes search, retrieval, and creation of reusable templates.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { createRoute, z } from '@hono/zod-openapi';
import { HttpStatusCodes } from '../../lib/constants';

// ============================================
// Shared Schemas
// ============================================

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
 * Jurisdiction level enum
 */
const JurisdictionLevelSchema = z.enum(['federal', 'state', 'local', 'county']);

/**
 * Template response schema
 */
const TemplateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    category: RecordCategorySchema,
    description: z.string(),
    templateText: z.string(),
    jurisdictionLevel: JurisdictionLevelSchema.nullish(),
    createdBy: z.string(),
    isOfficial: z.boolean(),
    usageCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Template');

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
 * Create template schema
 */
const CreateTemplateSchema = z
  .object({
    name: z.string().min(1).max(200).openapi({ example: 'Body Camera Footage Request' }),
    category: RecordCategorySchema.openapi({ example: 'body_cam_footage' }),
    description: z.string().min(1).openapi({
      example: 'Standard template for requesting body camera footage from police departments',
    }),
    templateText: z.string().min(1).openapi({
      example:
        'I am requesting all body camera footage from [date] involving [incident description]...',
    }),
    jurisdictionLevel: JurisdictionLevelSchema.optional().openapi({ example: 'local' }),
    isOfficial: z.boolean().default(false).openapi({ example: false }),
  })
  .openapi('CreateTemplate');

// ============================================
// Route Definitions
// ============================================

/**
 * Search templates
 */
export const searchTemplatesRoute = createRoute({
  tags: ['Templates'],
  method: 'get',
  path: '/templates',
  summary: 'Search templates',
  description: 'Search FOIA request templates with optional filters.',
  request: {
    query: z.object({
      query: z.string().optional().openapi({ description: 'Text search query' }),
      category: RecordCategorySchema.optional().openapi({ description: 'Filter by category' }),
      page: z.coerce.number().int().positive().optional().default(1),
      pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Paginated list of templates',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(TemplateSchema),
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
 * Get official templates
 */
export const getOfficialTemplatesRoute = createRoute({
  tags: ['Templates'],
  method: 'get',
  path: '/templates/official',
  summary: 'Get official templates',
  description: 'Get all official FOIA request templates.',
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'List of official templates',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(TemplateSchema),
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
  },
});

/**
 * Get templates by category
 */
export const getTemplatesByCategoryRoute = createRoute({
  tags: ['Templates'],
  method: 'get',
  path: '/templates/category/{category}',
  summary: 'Get templates by category',
  description: 'Get all templates in a specific category.',
  request: {
    params: z.object({
      category: RecordCategorySchema.openapi({ description: 'Record category' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'List of templates in category',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: z.array(TemplateSchema),
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
  },
});

/**
 * Get template by ID
 */
export const getTemplateRoute = createRoute({
  tags: ['Templates'],
  method: 'get',
  path: '/templates/{id}',
  summary: 'Get template by ID',
  description: 'Get a specific FOIA request template.',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Template UUID' }),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Template details',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: TemplateSchema,
          }),
        },
      },
    },
    [HttpStatusCodes.NOT_FOUND]: {
      description: 'Template not found',
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
 * Create new template
 */
export const createTemplateRoute = createRoute({
  tags: ['Templates'],
  method: 'post',
  path: '/templates',
  summary: 'Create template',
  description: 'Create a new FOIA request template. Official templates require admin privileges.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      description: 'Template data',
      content: {
        'application/json': {
          schema: CreateTemplateSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: {
      description: 'Template created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            data: TemplateSchema,
            message: z.string().default('Template created successfully'),
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
      description: 'Admin privileges required for official templates',
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
 * Seed default templates (admin only)
 */
export const seedTemplatesRoute = createRoute({
  tags: ['Templates'],
  method: 'post',
  path: '/templates/seed',
  summary: 'Seed default templates',
  description:
    'Seeds the database with default official FOIA request templates. Requires admin privileges.',
  security: [{ bearerAuth: [] }],
  responses: {
    [HttpStatusCodes.OK]: {
      description: 'Templates seeded successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(true),
            message: z.string().default('Default templates seeded successfully'),
          }),
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: {
      description: 'Seed error',
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
  },
});

// Export schemas
export {
  CreateTemplateSchema,
  JurisdictionLevelSchema,
  PaginationSchema,
  RecordCategorySchema,
  TemplateSchema,
};
