/**
 * Auth Controller - Certificate Protection System (RBAC)
 * Handles: register, login, logout, refresh token, profile
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateTokenPair, verifyRefreshToken, extractTokenFromHeader } = require('../utils/jwt');
const { ROLES } = require('../config/rbac');
const logger = require('../utils/logger');

const { AUDIT_ACTIONS, AUDIT_SEVERITY } = AuditLog;

const getRequestMeta = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('user-agent'),
  method: req.method,
  path: req.originalUrl,
});

/**
 * POST /api/auth/register
 * Register a new user (default role: holder)
 */
const register = async (req, res) => {
  try {
    const { fullName, email, password, organization, department, nationalId, phoneNumber } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered.',
        code: 'EMAIL_TAKEN',
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      role: ROLES.HOLDER, // Default role
      organization,
      department,
      nationalId,
      phoneNumber,
      createdBy: req.user?._id, // If admin is creating the user
    });

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Audit log
    await AuditLog.log({
      action: AUDIT_ACTIONS.AUTH_REGISTER,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ...getRequestMeta(req),
      resource: 'user',
      resourceId: user._id,
      resourceName: user.fullName,
      details: { email: user.email, role: user.role },
    });

    logger.info(`New user registered: ${user.email} (${user.role})`);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          organization: user.organization,
          createdAt: user.createdAt,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error('Register error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
      code: 'REGISTER_FAILED',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const meta = getRequestMeta(req);

    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      await AuditLog.log({
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        severity: AUDIT_SEVERITY.WARNING,
        ...meta,
        success: false,
        details: { email, reason: 'User not found' },
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      await AuditLog.log({
        action: AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED,
        severity: AUDIT_SEVERITY.CRITICAL,
        userId: user._id,
        userEmail: user.email,
        ...meta,
        success: false,
        details: { lockUntil: user.lockUntil },
      });
      return res.status(423).json({
        success: false,
        error: 'Account locked due to multiple failed login attempts. Try again in 2 hours.',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated. Contact administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      await AuditLog.log({
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        severity: AUDIT_SEVERITY.WARNING,
        userId: user._id,
        userEmail: user.email,
        ...meta,
        success: false,
        details: { reason: 'Wrong password', attempts: user.loginAttempts + 1 },
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Reset login attempts on success
    await user.resetLoginAttempts();

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Audit log
    await AuditLog.log({
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ...meta,
      resource: 'user',
      resourceId: user._id,
      details: { role: user.role },
    });

    logger.info(`User logged in: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          organization: user.organization,
          lastLogin: user.lastLogin,
        },
        tokens,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
      code: 'LOGIN_FAILED',
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout user - invalidate refresh token
 */
const logout = async (req, res) => {
  try {
    const { user } = req;

    await AuditLog.log({
      action: AUDIT_ACTIONS.AUTH_LOGOUT,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ...getRequestMeta(req),
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed.',
    });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required.',
        code: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token.',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive.',
        code: 'USER_INACTIVE',
      });
    }

    const tokens = generateTokenPair(user);

    await AuditLog.log({
      action: AUDIT_ACTIONS.AUTH_TOKEN_REFRESH,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      ...getRequestMeta(req),
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed.',
      data: { tokens },
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed.',
    });
  }
};

/**
 * GET /api/auth/me
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          organization: user.organization,
          department: user.department,
          nationalId: user.nationalId,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile.',
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
};
