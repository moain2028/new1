/**
 * RBAC Unit Tests
 * Tests the role-based access control configuration
 */

const {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  getPermissions,
} = require('../src/config/rbac');

describe('RBAC Configuration', () => {
  
  describe('Roles Definition', () => {
    test('should have all required roles', () => {
      expect(ROLES.SUPER_ADMIN).toBe('super_admin');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.ISSUER).toBe('issuer');
      expect(ROLES.VERIFIER).toBe('verifier');
      expect(ROLES.HOLDER).toBe('holder');
    });
  });

  describe('Permission Assignment - SUPER_ADMIN', () => {
    test('should have ALL permissions', () => {
      Object.values(PERMISSIONS).forEach((permission) => {
        expect(hasPermission(ROLES.SUPER_ADMIN, permission)).toBe(true);
      });
    });
  });

  describe('Permission Assignment - ADMIN', () => {
    test('should be able to create certificates', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.CERTIFICATE_CREATE)).toBe(true);
    });
    test('should be able to revoke certificates', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.CERTIFICATE_REVOKE)).toBe(true);
    });
    test('should be able to manage users', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USER_CREATE)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USER_READ)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USER_DELETE)).toBe(true);
    });
    test('should NOT have system config permission', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.SYSTEM_CONFIG)).toBe(false);
    });
    test('should be able to read audit logs', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUDIT_READ)).toBe(true);
    });
  });

  describe('Permission Assignment - ISSUER', () => {
    test('should be able to create and sign certificates', () => {
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.CERTIFICATE_CREATE)).toBe(true);
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.CERTIFICATE_SIGN)).toBe(true);
    });
    test('should be able to revoke certificates', () => {
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.CERTIFICATE_REVOKE)).toBe(true);
    });
    test('should NOT be able to manage users', () => {
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.USER_CREATE)).toBe(false);
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.USER_DELETE)).toBe(false);
    });
    test('should NOT have system config permission', () => {
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.SYSTEM_CONFIG)).toBe(false);
    });
  });

  describe('Permission Assignment - VERIFIER', () => {
    test('should be able to verify certificates', () => {
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.CERTIFICATE_VERIFY)).toBe(true);
    });
    test('should be able to read certificates', () => {
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.CERTIFICATE_READ)).toBe(true);
    });
    test('should NOT be able to create or revoke certificates', () => {
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.CERTIFICATE_CREATE)).toBe(false);
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.CERTIFICATE_REVOKE)).toBe(false);
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.CERTIFICATE_DELETE)).toBe(false);
    });
    test('should NOT have user management permissions', () => {
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.USER_CREATE)).toBe(false);
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.USER_DELETE)).toBe(false);
    });
  });

  describe('Permission Assignment - HOLDER', () => {
    test('should only view own certificates', () => {
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.CERTIFICATE_READ_OWN)).toBe(true);
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.CERTIFICATE_READ)).toBe(false);
    });
    test('should be able to verify certificates', () => {
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.CERTIFICATE_VERIFY)).toBe(true);
    });
    test('should NOT be able to create certificates', () => {
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.CERTIFICATE_CREATE)).toBe(false);
    });
    test('should NOT have admin permissions', () => {
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.USER_READ)).toBe(false);
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.AUDIT_READ)).toBe(false);
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.USER_ASSIGN_ROLE)).toBe(false);
    });
    test('should only update own profile', () => {
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.USER_UPDATE_OWN)).toBe(true);
      expect(hasPermission(ROLES.HOLDER, PERMISSIONS.USER_UPDATE)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    test('should return true if user has at least one permission', () => {
      expect(
        hasAnyPermission(ROLES.HOLDER, [
          PERMISSIONS.CERTIFICATE_READ_OWN,
          PERMISSIONS.CERTIFICATE_CREATE,
        ])
      ).toBe(true);
    });

    test('should return false if user has none of the permissions', () => {
      expect(
        hasAnyPermission(ROLES.HOLDER, [
          PERMISSIONS.CERTIFICATE_CREATE,
          PERMISSIONS.USER_DELETE,
          PERMISSIONS.AUDIT_READ,
        ])
      ).toBe(false);
    });
  });

  describe('getPermissions', () => {
    test('should return permission array for valid role', () => {
      const perms = getPermissions(ROLES.ADMIN);
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
    });

    test('should return empty array for unknown role', () => {
      const perms = getPermissions('unknown_role');
      expect(perms).toEqual([]);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    test('HOLDER should not have ADMIN permissions', () => {
      const adminPerms = getPermissions(ROLES.ADMIN);
      const holderPerms = getPermissions(ROLES.HOLDER);
      
      const escalationAttempt = adminPerms.filter(p => holderPerms.includes(p));
      // Only verify and read_own should overlap
      const dangerousOverlap = escalationAttempt.filter(
        p => ![PERMISSIONS.CERTIFICATE_VERIFY, PERMISSIONS.CERTIFICATE_READ_OWN, 
               PERMISSIONS.USER_READ_OWN, PERMISSIONS.USER_UPDATE_OWN].includes(p)
      );
      expect(dangerousOverlap).toHaveLength(0);
    });

    test('ISSUER should not have USER_DELETE permission', () => {
      expect(hasPermission(ROLES.ISSUER, PERMISSIONS.USER_DELETE)).toBe(false);
    });

    test('VERIFIER should not have CERTIFICATE_CREATE permission', () => {
      expect(hasPermission(ROLES.VERIFIER, PERMISSIONS.CERTIFICATE_CREATE)).toBe(false);
    });
  });
});
