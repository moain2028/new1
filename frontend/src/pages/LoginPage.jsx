import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error);
  };

  // Demo accounts
  const demoAccounts = [
    { role: 'super_admin', email: 'superadmin@demo.com', color: 'bg-red-50 border-red-200 text-red-700', label: 'مدير النظام' },
    { role: 'admin', email: 'admin@demo.com', color: 'bg-purple-50 border-purple-200 text-purple-700', label: 'مدير' },
    { role: 'issuer', email: 'issuer@demo.com', color: 'bg-blue-50 border-blue-200 text-blue-700', label: 'مُصدِر' },
    { role: 'verifier', email: 'verifier@demo.com', color: 'bg-green-50 border-green-200 text-green-700', label: 'مُتحقِق' },
    { role: 'holder', email: 'holder@demo.com', color: 'bg-gray-50 border-gray-200 text-gray-700', label: 'حامل الشهادة' },
  ];

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">نظام حماية الشهادات</h1>
            <p className="text-gray-500 text-sm mt-1">بروتوكول الوصول المبني على الأدوار (RBAC)</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm pl-10"
                  placeholder="كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              إنشاء حساب
            </Link>
          </p>

          {/* Demo Accounts */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 mb-3 font-medium">حسابات تجريبية (Demo)</p>
            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => setForm({ email: acc.email, password: 'Demo123!' })}
                  className={`text-xs px-3 py-2 border rounded-lg transition-all hover:opacity-80 text-right flex items-center justify-between ${acc.color}`}
                >
                  <span className="font-semibold">{acc.label}</span>
                  <span className="opacity-70">{acc.email}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">كلمة المرور للجميع: Demo123!</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Info */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <Shield size={64} className="mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">حماية الشهادات بنظام RBAC</h2>
          <p className="text-blue-200 mb-8 leading-relaxed">
            نظام متكامل لإدارة وحماية الشهادات الرقمية باستخدام بروتوكول التحكم في الوصول المبني على الأدوار
          </p>
          <div className="grid grid-cols-1 gap-3 text-sm">
            {[
              { icon: '🔐', text: '5 أدوار أمنية متخصصة' },
              { icon: '✍️', text: 'توقيع رقمي SHA-256' },
              { icon: '🔍', text: 'التحقق من الشهادات بلحظة' },
              { icon: '📋', text: 'سجل مراجعة أمني شامل' },
              { icon: '🚫', text: 'منع الوصول غير المصرح به' },
              { icon: '🔄', text: 'JWT مع Refresh Token' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <span className="text-lg">{item.icon}</span>
                <span className="text-blue-100">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
