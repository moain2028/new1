import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

// RBAC permissions map (mirrors backend)
const ROLE_PERMISSIONS = {
  super_admin: ['all'],
  admin: [
    'certificate:create', 'certificate:read', 'certificate:update',
    'certificate:delete', 'certificate:revoke', 'certificate:verify',
    'certificate:export', 'certificate:sign',
    'user:create', 'user:read', 'user:update', 'user:delete', 'user:assign_role',
    'role:read', 'audit:read', 'audit:export',
  ],
  issuer: [
    'certificate:create', 'certificate:read', 'certificate:update',
    'certificate:revoke', 'certificate:verify', 'certificate:export', 'certificate:sign',
    'user:read', 'audit:read',
  ],
  verifier: [
    'certificate:read', 'certificate:verify',
    'user:read:own', 'user:update:own',
  ],
  holder: [
    'certificate:read:own', 'certificate:verify',
    'user:read:own', 'user:update:own',
  ],
};

const ROLE_LABELS = {
  super_admin: 'مدير النظام الأعلى',
  admin: 'مدير',
  issuer: 'مُصدِر الشهادات',
  verifier: 'مُتحقِق',
  holder: 'حامل الشهادة',
};

const ROLE_COLORS = {
  super_admin: 'red',
  admin: 'purple',
  issuer: 'blue',
  verifier: 'green',
  holder: 'gray',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, tokens } = response.data.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      toast.success(`مرحباً ${userData.fullName}!`);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.error || 'فشل تسجيل الدخول';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async (data) => {
    try {
      const response = await authAPI.register(data);
      const { user: userData, tokens } = response.data.data;
      
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      toast.success('تم إنشاء الحساب بنجاح!');
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.error || 'فشل التسجيل';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (e) { /* ignore */ }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('تم تسجيل الخروج');
  }, []);

  // RBAC: Check if user has permission
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('all') || perms.includes(permission);
  }, [user]);

  // RBAC: Check if user has any of permissions
  const hasAnyPermission = useCallback((permissions) => {
    return permissions.some(p => hasPermission(p));
  }, [hasPermission]);

  // RBAC: Check if user has role
  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  const getRoleLabel = useCallback(() => {
    return user ? ROLE_LABELS[user.role] || user.role : '';
  }, [user]);

  const getRoleColor = useCallback(() => {
    return user ? ROLE_COLORS[user.role] || 'gray' : 'gray';
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      hasPermission,
      hasAnyPermission,
      hasRole,
      getRoleLabel,
      getRoleColor,
      ROLE_LABELS,
      ROLE_COLORS,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
