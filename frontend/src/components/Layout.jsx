import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, LayoutDashboard, Award, Users, ClipboardList,
  LogOut, Menu, X, ChevronLeft, Bell, Settings, Lock
} from 'lucide-react';

const Layout = () => {
  const { user, logout, hasPermission, getRoleLabel, getRoleColor } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColorMap = {
    red: 'bg-red-100 text-red-700 border-red-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const navItems = [
    {
      to: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: 'لوحة التحكم',
      show: true,
    },
    {
      to: '/certificates',
      icon: <Award size={20} />,
      label: 'الشهادات',
      show: hasPermission('certificate:read') || hasPermission('certificate:read:own'),
    },
    {
      to: '/users',
      icon: <Users size={20} />,
      label: 'المستخدمون',
      show: hasPermission('user:read'),
    },
    {
      to: '/audit',
      icon: <ClipboardList size={20} />,
      label: 'سجل المراجعة',
      show: hasPermission('audit:read'),
    },
  ].filter((item) => item.show);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Shield size={22} className="text-white" />
        </div>
        {sidebarOpen && (
          <div>
            <div className="text-white font-bold text-sm leading-tight">نظام حماية</div>
            <div className="text-white/60 text-xs">الشهادات - RBAC</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
            onClick={() => setMobileOpen(false)}
          >
            {item.icon}
            {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div className="p-3 border-t border-white/10">
        {sidebarOpen ? (
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.fullName?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{user?.fullName}</div>
                <div className="text-white/60 text-xs truncate">{user?.email}</div>
              </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded-lg border text-center font-medium ${roleColorMap[getRoleColor()]}`}>
              <Lock size={10} className="inline ml-1" />
              {getRoleLabel()}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.fullName?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full mt-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all text-sm"
        >
          <LogOut size={16} />
          {sidebarOpen && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-gradient-to-b from-blue-900 to-blue-800 shadow-2xl transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-b from-blue-900 to-blue-800 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Desktop toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Menu size={18} />
            </button>
            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">
                نظام حماية الشهادات
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full border font-medium ${
              roleColorMap[getRoleColor()] || 'bg-gray-100 text-gray-700'
            }`}>
              <Lock size={10} className="inline ml-1" />
              {getRoleLabel()}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
