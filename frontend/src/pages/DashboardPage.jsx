import React, { useEffect, useState } from 'react';
import { Shield, Award, Users, CheckCircle, XCircle, Clock, TrendingUp, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { certificatesAPI, usersAPI } from '../utils/api';

const StatCard = ({ title, value, subtitle, icon, color, loading }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 fade-in-up`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <div className={`text-3xl font-bold mt-1 ${color}`}>
          {loading ? <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" /> : value}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('700', '100').replace('600', '100')}`}>
        {icon}
      </div>
    </div>
  </div>
);

const RBACInfoCard = ({ user, getRoleLabel, hasPermission }) => {
  const rolePermissions = {
    super_admin: { color: 'from-red-600 to-red-800', desc: 'صلاحيات كاملة على النظام', permsCount: 'الكل' },
    admin: { color: 'from-purple-600 to-purple-800', desc: 'إدارة المستخدمين والشهادات وسجل المراجعة', permsCount: '17' },
    issuer: { color: 'from-blue-600 to-blue-800', desc: 'إصدار وتوقيع وإلغاء الشهادات', permsCount: '9' },
    verifier: { color: 'from-green-600 to-green-800', desc: 'التحقق من صحة الشهادات', permsCount: '4' },
    holder: { color: 'from-gray-600 to-gray-800', desc: 'عرض شهاداتك الخاصة فقط', permsCount: '4' },
  };
  
  const info = rolePermissions[user?.role] || rolePermissions.holder;

  return (
    <div className={`bg-gradient-to-br ${info.color} rounded-2xl p-6 text-white shadow-lg`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Lock size={24} />
        </div>
        <div>
          <div className="text-white/70 text-sm">دورك في النظام</div>
          <div className="text-xl font-bold">{getRoleLabel()}</div>
        </div>
      </div>
      <p className="text-white/80 text-sm mb-4">{info.desc}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'إصدار شهادة', check: hasPermission('certificate:create') },
          { label: 'إلغاء شهادة', check: hasPermission('certificate:revoke') },
          { label: 'إدارة مستخدمين', check: hasPermission('user:read') },
          { label: 'سجل المراجعة', check: hasPermission('audit:read') },
          { label: 'توقيع رقمي', check: hasPermission('certificate:sign') },
          { label: 'تعيين الأدوار', check: hasPermission('user:assign_role') },
        ].map((item, i) => (
          <div key={i} className="bg-white/10 rounded-lg py-2 px-1">
            {item.check ? <CheckCircle size={14} className="mx-auto text-green-300 mb-1" /> : <XCircle size={14} className="mx-auto text-red-300 mb-1" />}
            <div className="text-xs text-white/80 leading-tight">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user, getRoleLabel, hasPermission } = useAuth();
  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const promises = [];
        if (hasPermission('certificate:read') || hasPermission('certificate:read:own')) {
          promises.push(certificatesAPI.getStats());
        } else {
          promises.push(Promise.resolve(null));
        }
        if (hasPermission('user:read')) {
          promises.push(usersAPI.getStats());
        } else {
          promises.push(Promise.resolve(null));
        }

        const [certRes, userRes] = await Promise.all(promises);
        if (certRes) setStats(certRes.data.data);
        if (userRes) setUserStats(userRes.data.data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          مرحباً، {user?.fullName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الشهادات"
          value={stats?.summary?.total ?? '-'}
          subtitle="في النظام"
          icon={<Award size={22} className="text-blue-600" />}
          color="text-blue-700"
          loading={loading}
        />
        <StatCard
          title="شهادات نشطة"
          value={stats?.summary?.active ?? '-'}
          subtitle="سارية المفعول"
          icon={<CheckCircle size={22} className="text-green-600" />}
          color="text-green-700"
          loading={loading}
        />
        <StatCard
          title="شهادات ملغاة"
          value={stats?.summary?.revoked ?? '-'}
          subtitle="تم إلغاؤها"
          icon={<XCircle size={22} className="text-red-600" />}
          color="text-red-700"
          loading={loading}
        />
        <StatCard
          title={hasPermission('user:read') ? 'المستخدمون' : 'شهادات منتهية'}
          value={hasPermission('user:read') ? (userStats?.total ?? '-') : (stats?.summary?.expired ?? '-')}
          subtitle={hasPermission('user:read') ? 'مسجلون في النظام' : 'انتهت صلاحيتها'}
          icon={hasPermission('user:read') ? <Users size={22} className="text-purple-600" /> : <Clock size={22} className="text-orange-600" />}
          color={hasPermission('user:read') ? 'text-purple-700' : 'text-orange-700'}
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RBAC Info */}
        <RBACInfoCard user={user} getRoleLabel={getRoleLabel} hasPermission={hasPermission} />

        {/* RBAC Roles Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-blue-600" />
            هيكل الأدوار في بروتوكول RBAC
          </h3>
          <div className="space-y-3">
            {[
              { role: 'super_admin', label: 'مدير النظام الأعلى', perms: 'كل الصلاحيات', color: 'bg-red-100 border-red-200 text-red-800', dot: 'bg-red-500' },
              { role: 'admin', label: 'مدير', perms: 'إدارة المستخدمين والشهادات وسجل المراجعة', color: 'bg-purple-100 border-purple-200 text-purple-800', dot: 'bg-purple-500' },
              { role: 'issuer', label: 'مُصدِر الشهادات', perms: 'إنشاء، توقيع، إلغاء الشهادات', color: 'bg-blue-100 border-blue-200 text-blue-800', dot: 'bg-blue-500' },
              { role: 'verifier', label: 'مُتحقِق', perms: 'التحقق من صحة الشهادات فقط', color: 'bg-green-100 border-green-200 text-green-800', dot: 'bg-green-500' },
              { role: 'holder', label: 'حامل الشهادة', perms: 'عرض شهاداته الخاصة فقط', color: 'bg-gray-100 border-gray-200 text-gray-800', dot: 'bg-gray-400' },
            ].map((item) => (
              <div key={item.role} className={`flex items-center gap-3 p-3 rounded-xl border ${item.color} ${item.role === user?.role ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                <div className={`w-3 h-3 rounded-full ${item.dot} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{item.label}</span>
                    {item.role === user?.role && (
                      <span className="text-xs bg-current/20 px-2 py-0.5 rounded-full font-medium">دورك الحالي</span>
                    )}
                  </div>
                  <p className="text-xs opacity-70 truncate">{item.perms}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certificates by type */}
      {stats?.byType && stats.byType.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            الشهادات حسب النوع
          </h3>
          <div className="flex flex-wrap gap-3">
            {stats.byType.map((item) => (
              <div key={item._id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                <Award size={14} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{item._id}</span>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
