/**
 * Public Verification Route - No authentication required
 */
const express = require('express');
const router = express.Router();
const certController = require('../controllers/certificateController');

// GET /api/verify/:token - Verify a certificate publicly
router.get('/:token', certController.verifyCertificate);

// POST /api/verify/:token - Verify via POST (for QR code scanners)
router.post('/:token', certController.verifyCertificate);

module.exports = router;
