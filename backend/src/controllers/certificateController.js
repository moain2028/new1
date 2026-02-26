/**
 * Certificate Controller - Certificate Protection System (RBAC)
 * Full CRUD with RBAC enforcement, digital signing, and verification
 */

const Certificate = require('../models/Certificate');
const AuditLog = require('../models/AuditLog');
const { PERMISSIONS, hasPermission } = require('../config/rbac');
const logger = require('../utils/logger');
const crypto = require('crypto');
let QRCode;
try { QRCode = require('qrcode'); } catch (e) { QRCode = null; }

const { AUDIT_ACTIONS, AUDIT_SEVERITY } = AuditLog;

const getRequestMeta = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('user-agent'),
  method: req.method,
  path: req.originalUrl,
});

/**
 * POST /api/certificates
 * Create a new certificate (ISSUER/ADMIN)
 */
const createCertificate = async (req, res) => {
  try {
    const {
      title, description, type, holderEmail, holderName, holderNationalId,
      issuingOrganization, issuingDepartment, expiresAt, skills,
      grade, score, credits, duration, isPublic, tags, metadata,
    } = req.body;

    // Find holder by email if provided
    let holderId = req.body.holderId;
    let finalHolderName = holderName;
    let finalHolderNationalId = holderNationalId;

    if (holderEmail && !holderId) {
      const User = require('../models/User');
      const holder = await User.findOne({ email: holderEmail });
      if (!holder) {
        return res.status(404).json({
          success: false,
          error: `User with email ${holderEmail} not found.`,
          code: 'HOLDER_NOT_FOUND',
        });
      }
      holderId = holder._id;
      finalHolderName = finalHolderName || holder.fullName;
      finalHolderNationalId = finalHolderNationalId || holder.nationalId;
    }

    if (!holderId) {
      return res.status(400).json({
        success: false,
        error: 'Certificate holder is required. Provide holderId or holderEmail.',
        code: 'HOLDER_REQUIRED',
      });
    }

    // Create certificate
    const certificate = new Certificate({
      title,
      description,
      type,
      holder: holderId,
      holderName: finalHolderName || 'Unknown',
      holderNationalId: finalHolderNationalId,
      issuedBy: req.user._id,
      issuerName: req.user.fullName,
      issuingOrganization: issuingOrganization || req.user.organization,
      issuingDepartment: issuingDepartment || req.user.department,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      skills: skills || [],
      grade,
      score,
      credits,
      duration,
      isPublic: isPublic || false,
      tags: tags || [],
      metadata: metadata || {},
      status: 'pending',
    });

    await certificate.save();

    // Auto-sign if issuer has signing permission
    if (hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_SIGN)) {
      const SIGNING_SECRET = process.env.CERT_SIGNING_SECRET || 'cert-signing-secret-2024';
      certificate.digitalSignature = certificate.signCertificate(SIGNING_SECRET);
      certificate.status = 'active';
      
      // Generate QR Code
      if (QRCode) {
        try {
          const qrData = JSON.stringify({
            id: certificate.certificateId,
            serial: certificate.serialNumber,
            verifyUrl: certificate.verificationUrl,
            holder: certificate.holderName,
            issuer: certificate.issuingOrganization,
            issuedAt: certificate.issuedAt,
          });
          certificate.qrCode = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300,
          });
        } catch (qrErr) {
          logger.warn('QR code generation failed:', qrErr.message);
        }
      }
      
      await certificate.save();
    }

    // Audit log
    await AuditLog.log({
      action: AUDIT_ACTIONS.CERT_CREATE,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'certificate',
      resourceId: certificate._id,
      resourceName: certificate.title,
      details: {
        certificateId: certificate.certificateId,
        type: certificate.type,
        holder: certificate.holderName,
        status: certificate.status,
      },
    });

    logger.info(`Certificate created: ${certificate.certificateId} by ${req.user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Certificate created successfully.',
      data: { certificate },
    });
  } catch (error) {
    logger.error('Create certificate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create certificate.',
      code: 'CREATE_FAILED',
    });
  }
};

/**
 * GET /api/certificates
 * Get certificates - filtered by role (admin: all, holder: own only)
 */
const getCertificates = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // RBAC: Holders can only see their own certificates
    if (!hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_READ)) {
      if (hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_READ_OWN)) {
        query.holder = req.user._id;
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied.',
          code: 'PERMISSION_DENIED',
        });
      }
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { certificateId: { $regex: search, $options: 'i' } },
        { holderName: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate('holder', 'fullName email')
        .populate('issuedBy', 'fullName email organization')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Certificate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        certificates,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get certificates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch certificates.',
    });
  }
};

/**
 * GET /api/certificates/:id
 * Get single certificate by ID
 */
const getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('holder', 'fullName email organization')
      .populate('issuedBy', 'fullName email organization')
      .populate('revokedBy', 'fullName email');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found.',
        code: 'CERT_NOT_FOUND',
      });
    }

    // RBAC: Holder can only view own certificates
    if (
      !hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_READ) &&
      hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_READ_OWN)
    ) {
      if (certificate.holder._id.toString() !== req.user._id.toString()) {
        await AuditLog.log({
          action: AUDIT_ACTIONS.CERT_ACCESS_DENIED,
          severity: AUDIT_SEVERITY.WARNING,
          userId: req.user._id,
          userEmail: req.user.email,
          userRole: req.user.role,
          ...getRequestMeta(req),
          resource: 'certificate',
          resourceId: certificate._id,
          success: false,
          statusCode: 403,
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied. This is not your certificate.',
          code: 'NOT_OWNER',
        });
      }
    }

    // Log view
    await AuditLog.log({
      action: AUDIT_ACTIONS.CERT_VIEW,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'certificate',
      resourceId: certificate._id,
      resourceName: certificate.title,
    });

    return res.status(200).json({
      success: true,
      data: { certificate },
    });
  } catch (error) {
    logger.error('Get certificate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch certificate.',
    });
  }
};

/**
 * PUT /api/certificates/:id/revoke
 * Revoke a certificate (ADMIN/ISSUER)
 */
const revokeCertificate = async (req, res) => {
  try {
    const { reason } = req.body;

    const certificate = await Certificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found.',
        code: 'CERT_NOT_FOUND',
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        error: 'Certificate is already revoked.',
        code: 'ALREADY_REVOKED',
      });
    }

    const prevStatus = certificate.status;
    certificate.status = 'revoked';
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.user._id;
    certificate.revocationReason = reason || 'No reason provided';
    await certificate.save();

    await AuditLog.log({
      action: AUDIT_ACTIONS.CERT_REVOKE,
      severity: AUDIT_SEVERITY.CRITICAL,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'certificate',
      resourceId: certificate._id,
      resourceName: certificate.title,
      details: {
        certificateId: certificate.certificateId,
        reason,
        previousStatus: prevStatus,
      },
    });

    logger.info(`Certificate revoked: ${certificate.certificateId} by ${req.user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Certificate revoked successfully.',
      data: { certificate },
    });
  } catch (error) {
    logger.error('Revoke certificate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke certificate.',
    });
  }
};

/**
 * POST /api/certificates/verify/:token
 * Public endpoint to verify certificate authenticity
 */
const verifyCertificate = async (req, res) => {
  try {
    const { token } = req.params;
    const SIGNING_SECRET = process.env.CERT_SIGNING_SECRET || 'cert-signing-secret-2024';

    const certificate = await Certificate.findOne({ verificationToken: token })
      .populate('holder', 'fullName email')
      .populate('issuedBy', 'fullName email organization')
      .select('+digitalSignature');

    if (!certificate) {
      await AuditLog.log({
        action: AUDIT_ACTIONS.CERT_VERIFY_FAILED,
        severity: AUDIT_SEVERITY.WARNING,
        ...getRequestMeta(req),
        success: false,
        details: { token, reason: 'Certificate not found' },
      });
      return res.status(404).json({
        success: false,
        result: 'invalid',
        error: 'Certificate not found.',
        code: 'CERT_NOT_FOUND',
      });
    }

    let verificationResult = 'valid';
    let message = 'Certificate is valid and authentic.';

    // Check status
    if (certificate.status === 'revoked') {
      verificationResult = 'revoked';
      message = `Certificate has been revoked. Reason: ${certificate.revocationReason}`;
    } else if (certificate.status === 'suspended') {
      verificationResult = 'suspended';
      message = 'Certificate is currently suspended.';
    } else if (certificate.isExpired) {
      verificationResult = 'expired';
      message = `Certificate expired on ${certificate.expiresAt.toLocaleDateString()}.`;
    } else if (certificate.status !== 'active') {
      verificationResult = 'invalid';
      message = 'Certificate is not active.';
    } else {
      // Verify digital signature
      if (certificate.digitalSignature) {
        const isSignatureValid = certificate.verifySignature(SIGNING_SECRET);
        if (!isSignatureValid) {
          verificationResult = 'invalid';
          message = 'Certificate signature verification failed. Data may have been tampered.';
        }
      }
    }

    // Record verification attempt
    certificate.verificationHistory.push({
      verifiedBy: req.user?._id,
      verifiedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      result: verificationResult,
    });
    await certificate.save();

    await AuditLog.log({
      action: AUDIT_ACTIONS.CERT_VERIFY,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ...getRequestMeta(req),
      resource: 'certificate',
      resourceId: certificate._id,
      resourceName: certificate.title,
      success: verificationResult === 'valid',
      details: { result: verificationResult, certificateId: certificate.certificateId },
    });

    return res.status(200).json({
      success: true,
      result: verificationResult,
      message,
      data: {
        certificateId: certificate.certificateId,
        serialNumber: certificate.serialNumber,
        title: certificate.title,
        type: certificate.type,
        status: certificate.status,
        holderName: certificate.holderName,
        issuingOrganization: certificate.issuingOrganization,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        revokedAt: certificate.revokedAt,
        revocationReason: certificate.revocationReason,
        isValid: verificationResult === 'valid',
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Verify certificate error:', error);
    return res.status(500).json({
      success: false,
      result: 'error',
      error: 'Verification service error.',
    });
  }
};

/**
 * GET /api/certificates/:id/export
 * Export certificate as JSON (for download)
 */
const exportCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('holder', 'fullName email organization nationalId')
      .populate('issuedBy', 'fullName email organization');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found.',
      });
    }

    // RBAC: Holder can only export their own certificate
    if (
      !hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_EXPORT) &&
      certificate.holder._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: 'Access denied.',
      });
    }

    await AuditLog.log({
      action: AUDIT_ACTIONS.CERT_EXPORT,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'certificate',
      resourceId: certificate._id,
      resourceName: certificate.title,
    });

    const exportData = {
      certificateId: certificate.certificateId,
      serialNumber: certificate.serialNumber,
      title: certificate.title,
      description: certificate.description,
      type: certificate.type,
      status: certificate.status,
      holder: {
        name: certificate.holderName,
        email: certificate.holder?.email,
        nationalId: certificate.holderNationalId,
        organization: certificate.holder?.organization,
      },
      issuer: {
        name: certificate.issuerName,
        organization: certificate.issuingOrganization,
        department: certificate.issuingDepartment,
      },
      dates: {
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
      },
      verification: {
        url: certificate.verificationUrl,
        token: certificate.verificationToken,
        checksum: certificate.checksum,
        signatureAlgorithm: certificate.signatureAlgorithm,
      },
      skills: certificate.skills,
      grade: certificate.grade,
      score: certificate.score,
      exportedAt: new Date(),
      exportedBy: req.user.email,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${certificate.certificateId}.json"`
    );
    return res.status(200).json(exportData);
  } catch (error) {
    logger.error('Export certificate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to export certificate.',
    });
  }
};

/**
 * GET /api/certificates/stats
 * Get certificate statistics (ADMIN/ISSUER)
 */
const getCertificateStats = async (req, res) => {
  try {
    let matchQuery = {};
    if (!hasPermission(req.user.role, PERMISSIONS.CERTIFICATE_READ)) {
      matchQuery.holder = req.user._id;
    }

    const stats = await Certificate.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          revoked: { $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        },
      },
    ]);

    const byType = await Certificate.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || { total: 0, active: 0, revoked: 0, expired: 0, pending: 0 },
        byType,
      },
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics.',
    });
  }
};

module.exports = {
  createCertificate,
  getCertificates,
  getCertificate,
  revokeCertificate,
  verifyCertificate,
  exportCertificate,
  getCertificateStats,
};
