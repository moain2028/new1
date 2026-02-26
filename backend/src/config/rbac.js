/**
 * RBAC Roles & Permissions Configuration
 * Certificate Protection System
 * 
 * Roles:
 * - super_admin: Full system access
 * - admin: Manage users, issue & revoke certificates
 * - issuer: Can issue and view certificates
 * - verifier: Can only verify certificate authenticity
 * - holder: Certificate owner - view own certificates only
 */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  ISSUER: 'issuer',
  VERIFIER: 'verifier',
  HOLDER: 'holder',
};

const PERMISSIONS = {
  // Certificate permissions
  CERTIFICATE_CREATE: 'certificate:create',
  CERTIFICATE_READ: 'certificate:read',
  CERTIFICATE_READ_OWN: 'certificate:read:own',
  CERTIFICATE_UPDATE: 'certificate:update',
  CERTIFICATE_DELETE: 'certificate:delete',
  CERTIFICATE_REVOKE: 'certificate:revoke',
  CERTIFICATE_VERIFY: 'certificate:verify',
  CERTIFICATE_EXPORT: 'certificate:export',
  CERTIFICATE_SIGN: 'certificate:sign',

  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_READ_OWN: 'user:read:own',
  USER_UPDATE: 'user:update',
  USER_UPDATE_OWN: 'user:update:own',
  USER_DELETE: 'user:delete',
  USER_ASSIGN_ROLE: 'user:assign_role',

  // Role permissions
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  // Audit log permissions
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',

  // System permissions
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_BACKUP: 'system:backup',
};

// Map roles to their permissions
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions

  [ROLES.ADMIN]: [
    PERMISSIONS.CERTIFICATE_CREATE,
    PERMISSIONS.CERTIFICATE_READ,
    PERMISSIONS.CERTIFICATE_UPDATE,
    PERMISSIONS.CERTIFICATE_DELETE,
    PERMISSIONS.CERTIFICATE_REVOKE,
    PERMISSIONS.CERTIFICATE_VERIFY,
    PERMISSIONS.CERTIFICATE_EXPORT,
    PERMISSIONS.CERTIFICATE_SIGN,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_ASSIGN_ROLE,
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AUDIT_EXPORT,
  ],

  [ROLES.ISSUER]: [
    PERMISSIONS.CERTIFICATE_CREATE,
    PERMISSIONS.CERTIFICATE_READ,
    PERMISSIONS.CERTIFICATE_UPDATE,
    PERMISSIONS.CERTIFICATE_REVOKE,
    PERMISSIONS.CERTIFICATE_VERIFY,
    PERMISSIONS.CERTIFICATE_EXPORT,
    PERMISSIONS.CERTIFICATE_SIGN,
    PERMISSIONS.USER_READ,
    PERMISSIONS.AUDIT_READ,
  ],

  [ROLES.VERIFIER]: [
    PERMISSIONS.CERTIFICATE_READ,
    PERMISSIONS.CERTIFICATE_VERIFY,
    PERMISSIONS.USER_READ_OWN,
    PERMISSIONS.USER_UPDATE_OWN,
  ],

  [ROLES.HOLDER]: [
    PERMISSIONS.CERTIFICATE_READ_OWN,
    PERMISSIONS.CERTIFICATE_VERIFY,
    PERMISSIONS.USER_READ_OWN,
    PERMISSIONS.USER_UPDATE_OWN,
  ],
};

// Role hierarchy (higher index = more privileges)
const ROLE_HIERARCHY = [
  ROLES.HOLDER,
  ROLES.VERIFIER,
  ROLES.ISSUER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

/**
 * Check if role has a specific permission
 */
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

/**
 * Check if role has any of the given permissions
 */
const hasAnyPermission = (role, permissionList) => {
  return permissionList.some(p => hasPermission(role, p));
};

/**
 * Get all permissions for a role
 */
const getPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  hasAnyPermission,
  getPermissions,
};
