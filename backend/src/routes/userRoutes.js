/**
 * User Routes - RBAC protected
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, authorize, authorizeOwnerOrAdmin, authorizeRole } = require('../middleware/auth');
const { PERMISSIONS, ROLES } = require('../config/rbac');
const validateRequest = require('../middleware/validateRequest');

// All routes require auth
router.use(authenticate);

// GET /api/users/stats
router.get('/stats', authorize(PERMISSIONS.USER_READ), userController.getUserStats);

// GET /api/users - List all users
router.get('/', authorize(PERMISSIONS.USER_READ), userController.getUsers);

// POST /api/users - Create user
router.post(
  '/',
  authorize(PERMISSIONS.USER_CREATE),
  [
    body('fullName').trim().notEmpty().withMessage('Full name required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
    body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  ],
  validateRequest,
  userController.createUser
);

// GET /api/users/:id - Get single user (admin or self)
router.get(
  '/:id',
  authorizeOwnerOrAdmin(PERMISSIONS.USER_READ),
  userController.getUser
);

// PATCH /api/users/:id/role - Assign role
router.patch(
  '/:id/role',
  authorize(PERMISSIONS.USER_ASSIGN_ROLE),
  [body('role').notEmpty().isIn(Object.values(ROLES)).withMessage('Invalid role')],
  validateRequest,
  userController.assignRole
);

// PATCH /api/users/:id/status - Toggle active status
router.patch(
  '/:id/status',
  authorize(PERMISSIONS.USER_UPDATE),
  [body('isActive').isBoolean().withMessage('isActive must be boolean')],
  validateRequest,
  userController.toggleUserStatus
);

// DELETE /api/users/:id - Delete user (super_admin only)
router.delete(
  '/:id',
  authorizeRole(ROLES.SUPER_ADMIN),
  userController.deleteUser
);

module.exports = router;
