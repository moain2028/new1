/**
 * User Controller - User management with RBAC
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ROLES, PERMISSIONS, hasPermission } = require('../config/rbac');
const logger = require('../utils/logger');

const { AUDIT_ACTIONS, AUDIT_SEVERITY } = AuditLog;

const getRequestMeta = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.get('user-agent'),
  method: req.method,
  path: req.originalUrl,
});

/**
 * GET /api/users - List all users (ADMIN+)
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isActive } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (role && Object.values(ROLES).includes(role)) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
};

/**
 * GET /api/users/:id - Get single user
 */
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    logger.error('Get user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user.' });
  }
};

/**
 * POST /api/users - Create user (ADMIN+)
 */
const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, organization, department, nationalId, phoneNumber } = req.body;

    // Only super_admin can create admins/super_admins
    if (
      [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role) &&
      req.user.role !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can create admin accounts.',
        code: 'INSUFFICIENT_PRIVILEGE',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already in use.', code: 'EMAIL_TAKEN' });
    }

    const user = await User.create({
      fullName, email, password,
      role: role || ROLES.HOLDER,
      organization, department, nationalId, phoneNumber,
      createdBy: req.user._id,
    });

    await AuditLog.log({
      action: AUDIT_ACTIONS.USER_CREATE,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'user',
      resourceId: user._id,
      resourceName: user.fullName,
      details: { email: user.email, role: user.role },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          organization: user.organization,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Create user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create user.' });
  }
};

/**
 * PATCH /api/users/:id/role - Assign role to user (ADMIN+)
 */
const assignRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role.', code: 'INVALID_ROLE' });
    }

    // Only super_admin can assign admin/super_admin roles
    if (
      [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role) &&
      req.user.role !== ROLES.SUPER_ADMIN
    ) {
      return res.status(403).json({
        success: false,
        error: 'Only super admins can assign admin roles.',
        code: 'INSUFFICIENT_PRIVILEGE',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.log({
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGN,
      severity: AUDIT_SEVERITY.WARNING,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'user',
      resourceId: user._id,
      resourceName: user.fullName,
      changes: { before: { role: previousRole }, after: { role } },
    });

    logger.info(`Role assigned: ${user.email} -> ${role} by ${req.user.email}`);

    return res.status(200).json({
      success: true,
      message: `Role updated to "${role}" successfully.`,
      data: { userId: user._id, email: user.email, previousRole, newRole: role },
    });
  } catch (error) {
    logger.error('Assign role error:', error);
    return res.status(500).json({ success: false, error: 'Failed to assign role.' });
  }
};

/**
 * PATCH /api/users/:id/status - Activate/deactivate user
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    // Prevent self-deactivation
    if (req.params.id === req.user._id.toString() && !isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account.',
        code: 'SELF_DEACTIVATION',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.isActive = isActive;
    await user.save();

    await AuditLog.log({
      action: isActive ? AUDIT_ACTIONS.USER_ACTIVATE : AUDIT_ACTIONS.USER_DEACTIVATE,
      severity: AUDIT_SEVERITY.WARNING,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'user',
      resourceId: user._id,
      resourceName: user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { userId: user._id, isActive: user.isActive },
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update user status.' });
  }
};

/**
 * DELETE /api/users/:id - Delete user (SUPER_ADMIN only)
 */
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    await AuditLog.log({
      action: AUDIT_ACTIONS.USER_DELETE,
      severity: AUDIT_SEVERITY.CRITICAL,
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ...getRequestMeta(req),
      resource: 'user',
      resourceId: user._id,
      resourceName: user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
};

/**
 * GET /api/users/stats - User statistics
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
    ]);

    const total = await User.countDocuments();
    return res.status(200).json({
      success: true,
      data: { total, byRole: stats },
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user statistics.' });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  assignRole,
  toggleUserStatus,
  deleteUser,
  getUserStats,
};
