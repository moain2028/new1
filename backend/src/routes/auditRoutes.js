/**
 * Audit Log Routes
 */
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/rbac');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /api/audit - Get audit logs (ADMIN+)
router.get('/', authorize(PERMISSIONS.AUDIT_READ), async (req, res) => {
  try {
    const { page = 1, limit = 20, action, severity, userId, resource, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (action) query.action = action;
    if (severity) query.severity = severity;
    if (userId) query.performedBy = userId;
    if (resource) query.targetResource = resource;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'fullName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs.' });
  }
});

// GET /api/audit/security - Security events only (ADMIN+)
router.get('/security', authorize(PERMISSIONS.AUDIT_READ), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { severity: 'warning' },
        { severity: 'critical' },
        { success: false },
        { action: { $regex: '^security\\.', $options: 'i' } },
      ],
    };

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'fullName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get security audit logs error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch security logs.' });
  }
});

module.exports = router;
