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
 * @file Templates Routes Index
 * @module routes/templates
 * @author FOIA Stream Team
 * @description Wires template route definitions to handler implementations.
 *              Uses path-specific middleware to avoid middleware bleed.
 * @compliance NIST 800-53 AC-3 (Access Enforcement)
 */

import { createRouter } from '@/lib/create-app';
import { authMiddleware, requireAdmin } from '@/middleware/auth.middleware';
import * as handlers from './templates.handlers';
import * as routes from './templates.routes';

const router = createRouter();

// ============================================
// Public Routes (no middleware)
// ============================================

router.openapi(routes.searchTemplatesRoute, handlers.searchTemplates);
router.openapi(routes.getOfficialTemplatesRoute, handlers.getOfficialTemplates);
router.openapi(routes.getTemplatesByCategoryRoute, handlers.getTemplatesByCategory);
router.openapi(routes.getTemplateRoute, handlers.getTemplate);

// ============================================
// Protected Routes (auth required)
// Apply path-specific middleware before registering handlers
// ============================================

// Create template (POST /templates) - needs auth
router.post('/templates', authMiddleware);
router.openapi(routes.createTemplateRoute, handlers.createTemplate);

// Seed templates (POST /templates/seed) - admin only
router.post('/templates/seed', authMiddleware, requireAdmin);
router.openapi(routes.seedTemplatesRoute, handlers.seedTemplates);

export default router;
