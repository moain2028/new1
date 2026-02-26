/**
 * Audit Log Model - Certificate Protection System (RBAC)
 * Tracks all security-relevant actions in the system
 */

const mongoose = require('mongoose');

const AUDIT_ACTIONS = {
  // Auth actions
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_ACCOUNT_LOCKED: 'auth.account_locked',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_TOKEN_REFRESH: 'auth.token_refresh',

  // Certificate actions
  CERT_CREATE: 'certificate.create',
  CERT_VIEW: 'certificate.view',
  CERT_UPDATE: 'certificate.update',
  CERT_DELETE: 'certificate.delete',
  CERT_REVOKE: 'certificate.revoke',
  CERT_SIGN: 'certificate.sign',
  CERT_VERIFY: 'certificate.verify',
  CERT_EXPORT: 'certificate.export',
  CERT_VERIFY_FAILED: 'certificate.verify_failed',
  CERT_ACCESS_DENIED: 'certificate.access_denied',

  // User actions
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_ASSIGN: 'user.role_assign',
  USER_ACTIVATE: 'user.activate',
  USER_DEACTIVATE: 'user.deactivate',

  // Security events
  SECURITY_UNAUTHORIZED: 'security.unauthorized',
  SECURITY_FORBIDDEN: 'security.forbidden',
  SECURITY_RATE_LIMIT: 'security.rate_limit',
  SECURITY_SUSPICIOUS: 'security.suspicious_activity',
};

const AUDIT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  ERROR: 'error',
};

const auditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_ACTIONS),
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITY),
      default: AUDIT_SEVERITY.INFO,
    },

    // Actor (who performed the action)
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    performedByEmail: String,
    performedByRole: String,

    // Target (what was affected)
    targetResource: {
      type: String, // e.g., 'certificate', 'user'
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    targetName: String,

    // Request context
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: String,
    requestMethod: String,
    requestPath: String,

    // Outcome
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: String,
    statusCode: Number,

    // Details
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },

    // Timestamp (indexed for fast queries)
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    // TTL: auto-delete audit logs older than 2 years
    // expireAfterSeconds: 63072000, 
  }
);

// Compound indexes for common queries
auditSchema.index({ performedBy: 1, timestamp: -1 });
auditSchema.index({ targetResource: 1, targetId: 1, timestamp: -1 });
auditSchema.index({ action: 1, timestamp: -1 });
auditSchema.index({ severity: 1, timestamp: -1 });

// Static method to log an action
auditSchema.statics.log = async function (data) {
  try {
    const entry = new this({
      action: data.action,
      severity: data.severity || AUDIT_SEVERITY.INFO,
      performedBy: data.userId,
      performedByEmail: data.userEmail,
      performedByRole: data.userRole,
      targetResource: data.resource,
      targetId: data.resourceId?.toString(),
      targetName: data.resourceName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      requestMethod: data.method,
      requestPath: data.path,
      success: data.success !== undefined ? data.success : true,
      errorMessage: data.errorMessage,
      statusCode: data.statusCode,
      details: data.details || {},
      changes: data.changes,
      timestamp: new Date(),
    });
    await entry.save();
    return entry;
  } catch (err) {
    // Don't throw - audit logging should never break main flow
    console.error('Audit log failed:', err.message);
  }
};

module.exports = mongoose.model('AuditLog', auditSchema);
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
module.exports.AUDIT_SEVERITY = AUDIT_SEVERITY;
