/**
 * Copyright (c) 2025 Foia Stream
 *
 * @file Documents Route Module
 * @module routes/documents
 * @description Wires document route definitions to handler implementations.
 * @compliance NIST 800-53 SI-3 (Malicious Code Protection)
 * @compliance NIST 800-53 SC-28 (Protection of Information at Rest)
 */

import { createRouter } from '@/lib/create-app';
import { authMiddleware } from '@/middleware/auth.middleware';

import * as handlers from './documents.handlers';
import * as routes from './documents.routes';

const router = createRouter();

// ============================================
// Document CRUD Routes (all protected)
// ============================================

// GET /documents (protected)
router.get('/documents', authMiddleware);
router.openapi(routes.listDocumentsRoute, handlers.listDocuments);

// GET /documents/:id (protected)
router.get('/documents/:id', authMiddleware);
router.openapi(routes.getDocumentRoute, handlers.getDocument);

// DELETE /documents/:id (protected)
router.delete('/documents/:id', authMiddleware);
router.openapi(routes.deleteDocumentRoute, handlers.deleteDocument);

// ============================================
// Document Access Verification (protected)
// ============================================

router.post('/documents/:id/verify-mfa', authMiddleware);
router.openapi(routes.verifyMfaRoute, handlers.verifyMfa);

router.post('/documents/:id/verify-password', authMiddleware);
router.openapi(routes.verifyPasswordRoute, handlers.verifyPassword);

// ============================================
// Redaction Template Routes (protected)
// ============================================

router.get('/documents/templates/redaction', authMiddleware);
router.openapi(routes.listRedactionTemplatesRoute, handlers.listRedactionTemplates);

router.post('/documents/templates/redaction', authMiddleware);
router.openapi(routes.createRedactionTemplateRoute, handlers.createRedactionTemplate);

// ============================================
// Text Redaction (protected)
// ============================================

router.post('/documents/redact-text', authMiddleware);
router.openapi(routes.redactTextRoute, handlers.redactText);

// ============================================
// Upload Routes (protected)
// ============================================

router.post('/documents/upload/pdf', authMiddleware);
router.openapi(routes.uploadPdfRoute, handlers.uploadPdf);

router.post('/documents/upload/validate', authMiddleware);
router.openapi(routes.validatePdfRoute, handlers.validatePdf);

router.get('/documents/upload/status', authMiddleware);
router.openapi(routes.uploadStatusRoute, handlers.uploadStatus);

export default router;
