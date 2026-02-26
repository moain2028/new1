/**
 * Certificate Routes - with full RBAC protection
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const certController = require('../controllers/certificateController');
const { authenticate, authorize, authorizeAny } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/rbac');
const validateRequest = require('../middleware/validateRequest');

// All routes require authentication
router.use(authenticate);

// GET /api/certificates/stats - Statistics
router.get('/stats', certController.getCertificateStats);

// POST /api/certificates/verify/:token - Public-ish verification (auth optional)
// This is listed before :id to avoid conflict

// GET /api/certificates - List certificates (RBAC filtered)
router.get(
  '/',
  authorizeAny([PERMISSIONS.CERTIFICATE_READ, PERMISSIONS.CERTIFICATE_READ_OWN]),
  certController.getCertificates
);

// POST /api/certificates - Create certificate
router.post(
  '/',
  authorize(PERMISSIONS.CERTIFICATE_CREATE),
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('type')
      .notEmpty()
      .isIn(['academic', 'professional', 'training', 'achievement', 'medical', 'government', 'other'])
      .withMessage('Invalid certificate type'),
    body('issuingOrganization').optional().trim().isLength({ max: 200 }),
    body('expiresAt').optional().isISO8601().withMessage('Invalid date format'),
    body('score').optional().isNumeric().isFloat({ min: 0, max: 100 }),
  ],
  validateRequest,
  certController.createCertificate
);

// GET /api/certificates/:id - Get single certificate
router.get(
  '/:id',
  authorizeAny([PERMISSIONS.CERTIFICATE_READ, PERMISSIONS.CERTIFICATE_READ_OWN]),
  certController.getCertificate
);

// PUT /api/certificates/:id/revoke - Revoke certificate
router.put(
  '/:id/revoke',
  authorize(PERMISSIONS.CERTIFICATE_REVOKE),
  [body('reason').optional().trim().isLength({ max: 500 })],
  validateRequest,
  certController.revokeCertificate
);

// GET /api/certificates/:id/export - Export certificate
router.get(
  '/:id/export',
  authorizeAny([PERMISSIONS.CERTIFICATE_EXPORT, PERMISSIONS.CERTIFICATE_READ_OWN]),
  certController.exportCertificate
);

module.exports = router;
