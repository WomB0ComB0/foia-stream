/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Redaction Route Module
 * @module routes/redaction
 * @description Wires PDF redaction route definitions to handler implementations.
 * @compliance NIST 800-53 MP-6 (Media Sanitization)
 */

import { createRouter } from '@/lib/create-app';
import { authMiddleware } from '@/middleware/auth.middleware';

import * as handlers from './redaction.handlers';
import * as routes from './redaction.routes';

const router = createRouter();

// ============================================
// All redaction routes require authentication
// ============================================

router.post('/redaction/apply', authMiddleware);
router.openapi(routes.applyRedactionsRoute, handlers.applyRedactions);

router.post('/redaction/preview', authMiddleware);
router.openapi(routes.previewRedactionsRoute, handlers.previewRedactions);

router.post('/redaction/info', authMiddleware);
router.openapi(routes.getPdfInfoRoute, handlers.getPdfInfo);

router.post('/redaction/text', authMiddleware);
router.openapi(routes.redactTextInPdfRoute, handlers.redactTextInPdf);

export default router;
