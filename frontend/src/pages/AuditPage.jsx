import React, { useEffect, useState } from 'react';
import { ClipboardList, AlertTriangle, Shield, Info, XCircle, CheckCircle, Search } from 'lucide-react';
import { auditAPI } from '../utils/api';
import toast from 'react-hot-toast';

const SeverityBadge = ({ severity }) => {
  const cfg = {
    info: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Info size={10} />, label: 'معلومة' },
    warning: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertTriangle size={10} />, label: 'تحذير' },
    critical: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={10} />, label: 'حرج' },
    error: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <XCircle size={10} />, label: 'خطأ' },
  };
  const c = cfg[severity] || cfg.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
};

const actionToArabic = (action) => {
  const map = {
    'auth.login': 'تسجيل دخول',
    'auth.logout': 'تسجيل خروج',
    'auth.register': 'تسجيل جديد',
    'auth.login_failed': 'فشل تسجيل دخول',
    'auth.account_locked': 'تأمين الحساب',
    'certificate.create': 'إنشاء شهادة',
    'certificate.view': 'عرض شهادة',
    'certificate.revoke': 'إلغاء شهادة',
    'certificate.sign': 'توقيع شهادة',
    'certificate.verify': 'التحقق من شهادة',
    'certificate.export': 'تصدير شهادة',
    'certificate.access_denied': 'رفض وصول للشهادة',
    'user.create': 'إنشاء مستخدم',
    'user.update': 'تحديث مستخدم',
    'user.delete': 'حذف مستخدم',
    'user.role_assign': 'تعيين دور',
    'user.activate': 'تفعيل مستخدم',
    'user.deactivate': 'إيقاف مستخدم',
    'security.unauthorized': 'وصول غير مصرح',
    'security.forbidden': 'محظور',
    'security.rate_limit': 'تجاوز حد الطلبات',
    'security.suspicious_activity': 'نشاط مشبوه',
  };
  return map[action] || action;
};

const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const fn = tab === 'security' ? auditAPI.getSecurity : auditAPI.getAll;
      const res = await fn({ page, limit: 20 });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('فشل تحميل سجل المراجعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, tab]);

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    return (
      actionToArabic(log.action).includes(search) ||
      log.performedByEmail?.includes(search) ||
      log.ipAddress?.includes(search)
    );
  });

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList size={22} className="text-indigo-600" /> سجل المراجعة الأمني
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">جميع الأحداث الأمنية والعمليات في النظام</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 w-fit">
        <button onClick={() => { setTab('all'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
          جميع الأحداث
        </button>
        <button onClick={() => { setTab('security'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${tab === 'security' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
          <Shield size={14} /> الأحداث الأمنية
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-md">
        <Search size={16} className="text-gray-400" />
        <input type="text" placeholder="بحث في السجل..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none bg-transparent" />
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد سجلات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['الحدث', 'المستخدم', 'الخطورة', 'النتيجة', 'عنوان IP', 'الوقت'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLogs.map(log => (
                  <tr key={log._id} className={`hover:bg-gray-50 transition-colors ${!log.success ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-800">{actionToArabic(log.action)}</div>
                      <div className="text-xs text-gray-400 font-mono">{log.action}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">{log.performedBy?.fullName || log.performedByEmail || 'مجهول'}</div>
                      <div className="text-xs text-gray-400">{log.performedByRole}</div>
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={log.severity} /></td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle size={12} />نجح</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle size={12} />فشل</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{log.ipAddress || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">السابق</button>
          <span className="text-sm text-gray-600">صفحة {page} من {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">التالي</button>
        </div>
      )}
    </div>
  );
};

export default AuditPage;
