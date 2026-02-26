/**
 * Authentication & RBAC Middleware
 * Certificate Protection System
 *
 * Middleware chain:
 * 1. authenticate()       - Verify JWT token
 * 2. authorize(permission)- Check RBAC permission
 * 3. authorizeOwner()     - Verify resource ownership
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { hasPermission, hasAnyPermission, PERMISSIONS } = require('../config/rbac');
const logger = require('../utils/logger');

const { AUDIT_ACTIONS, AUDIT_SEVERITY } = AuditLog;

/**
 * Extract request metadata for logging
 */
const getRequestMeta = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('user-agent'),
  method: req.method,
  path: req.originalUrl,
});

/**
 * MIDDLEWARE 1: authenticate
 * Verifies JWT access token and attaches user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      await AuditLog.log({
        action: AUDIT_ACTIONS.SECURITY_UNAUTHORIZED,
        severity: AUDIT_SEVERITY.WARNING,
        ...getRequestMeta(req),
        success: false,
        statusCode: 401,
        details: { reason: 'No token provided' },
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_REQUIRED',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const isExpired = err.name === 'TokenExpiredError';
      await AuditLog.log({
        action: AUDIT_ACTIONS.SECURITY_UNAUTHORIZED,
        severity: AUDIT_SEVERITY.WARNING,
        ...getRequestMeta(req),
        success: false,
        statusCode: 401,
        details: { reason: isExpired ? 'Token expired' : 'Invalid token', error: err.message },
      });
      return res.status(401).json({
        success: false,
        error: isExpired ? 'Token expired. Please refresh your session.' : 'Invalid token.',
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      });
    }

    // Verify token type
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type.',
        code: 'TOKEN_TYPE_INVALID',
      });
    }

    // Load user from DB
    const user = await User.findById(decoded.userId).select('+isActive');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      await AuditLog.log({
        action: AUDIT_ACTIONS.SECURITY_UNAUTHORIZED,
        severity: AUDIT_SEVERITY.WARNING,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        ...getRequestMeta(req),
        success: false,
        statusCode: 401,
        details: { reason: 'Account deactivated' },
      });
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Contact administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Attach user to request
    req.user = user;
    req.token = decoded;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error.',
      code: 'AUTH_SERVICE_ERROR',
    });
  }
};

/**
 * MIDDLEWARE 2: authorize(permission)
 * Checks if authenticated user has required RBAC permission
 * Usage: authorize(PERMISSIONS.CERTIFICATE_CREATE)
 */
const authorize = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED',
        });
      }

      const { user } = req;
      const allowed = hasPermission(user.role, permission);

      if (!allowed) {
        await AuditLog.log({
          action: AUDIT_ACTIONS.SECURITY_FORBIDDEN,
          severity: AUDIT_SEVERITY.WARNING,
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          ...getRequestMeta(req),
          success: false,
          statusCode: 403,
          details: {
            requiredPermission: permission,
            userRole: user.role,
          },
        });
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${permission}`,
          code: 'PERMISSION_DENIED',
          requiredPermission: permission,
          userRole: user.role,
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization service error.',
        code: 'AUTHZ_SERVICE_ERROR',
      });
    }
  };
};

/**
 * MIDDLEWARE 3: authorizeAny(permissions[])
 * User must have at least one of the given permissions
 */
const authorizeAny = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED',
        });
      }

      const { user } = req;
      const allowed = hasAnyPermission(user.role, permissions);

      if (!allowed) {
        await AuditLog.log({
          action: AUDIT_ACTIONS.SECURITY_FORBIDDEN,
          severity: AUDIT_SEVERITY.WARNING,
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          ...getRequestMeta(req),
          success: false,
          statusCode: 403,
          details: {
            requiredPermissions: permissions,
            userRole: user.role,
          },
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied. Insufficient permissions.',
          code: 'PERMISSION_DENIED',
          requiredPermissions: permissions,
          userRole: user.role,
        });
      }

      next();
    } catch (error) {
      logger.error('AuthorizeAny middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization service error.',
      });
    }
  };
};

/**
 * MIDDLEWARE 4: authorizeRole(roles[])
 * User must have one of the specified roles
 */
const authorizeRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED',
        });
      }

      const flatRoles = roles.flat();
      if (!flatRoles.includes(req.user.role)) {
        await AuditLog.log({
          action: AUDIT_ACTIONS.SECURITY_FORBIDDEN,
          severity: AUDIT_SEVERITY.WARNING,
          userId: req.user._id,
          userEmail: req.user.email,
          userRole: req.user.role,
          ...getRequestMeta(req),
          success: false,
          statusCode: 403,
          details: {
            allowedRoles: flatRoles,
            userRole: req.user.role,
          },
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied. Insufficient role.',
          code: 'ROLE_DENIED',
          allowedRoles: flatRoles,
        });
      }

      next();
    } catch (error) {
      logger.error('AuthorizeRole middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization service error.',
      });
    }
  };
};

/**
 * MIDDLEWARE 5: authorizeOwnerOrAdmin
 * Allows access if user is the resource owner OR has admin-level permission
 * Usage: Attach after authenticate
 * Requires: req.params.userId or req.params.id to compare with req.user._id
 */
const authorizeOwnerOrAdmin = (adminPermission = PERMISSIONS.USER_READ) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED',
        });
      }

      const targetId = req.params.userId || req.params.id;
      const isOwner = req.user._id.toString() === targetId;
      const isAdmin = hasPermission(req.user.role, adminPermission);

      if (!isOwner && !isAdmin) {
        await AuditLog.log({
          action: AUDIT_ACTIONS.SECURITY_FORBIDDEN,
          severity: AUDIT_SEVERITY.WARNING,
          userId: req.user._id,
          userEmail: req.user.email,
          userRole: req.user.role,
          ...getRequestMeta(req),
          success: false,
          statusCode: 403,
          details: {
            reason: 'Not owner and no admin permission',
            targetId,
          },
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own resources.',
          code: 'OWNERSHIP_REQUIRED',
        });
      }

      next();
    } catch (error) {
      logger.error('AuthorizeOwner middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization service error.',
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  authorizeAny,
  authorizeRole,
  authorizeOwnerOrAdmin,
};
