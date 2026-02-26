import React, { useEffect, useState } from 'react';
import { Award, Plus, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, Shield, ExternalLink, Download } from 'lucide-react';
import { certificatesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const cfg = {
    active: { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle size={12} />, label: 'نشطة' },
    revoked: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={12} />, label: 'ملغاة' },
    expired: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Clock size={12} />, label: 'منتهية' },
    pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle size={12} />, label: 'معلقة' },
    draft: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <AlertCircle size={12} />, label: 'مسودة' },
  };
  const c = cfg[status] || cfg.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const types = {
    academic: 'أكاديمية', professional: 'مهنية', training: 'تدريبية',
    achievement: 'إنجاز', medical: 'طبية', government: 'حكومية', other: 'أخرى',
  };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200 font-medium">
      {types[type] || type}
    </span>
  );
};

const CreateCertModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    title: '', type: 'academic', holderEmail: '', issuingOrganization: '',
    description: '', expiresAt: '', grade: '', skills: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await certificatesAPI.create({
        ...form,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [],
      });
      toast.success('تم إنشاء الشهادة بنجاح!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل إنشاء الشهادة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><Award size={18} className="text-blue-600" />إنشاء شهادة جديدة</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الشهادة *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الشهادة *</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="academic">أكاديمية</option>
              <option value="professional">مهنية</option>
              <option value="training">تدريبية</option>
              <option value="achievement">إنجاز</option>
              <option value="medical">طبية</option>
              <option value="government">حكومية</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">بريد الحامل (المستلم) *</label>
            <input type="email" value={form.holderEmail} onChange={e => setForm({...form, holderEmail: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الجهة المُصدِرة</label>
            <input type="text" value={form.issuingOrganization} onChange={e => setForm({...form, issuingOrganization: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
            <input type="date" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المهارات (مفصولة بفاصلة)</label>
            <input type="text" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})}
              placeholder="Python, JavaScript, React"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50">إلغاء</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
              {loading ? 'جاري الإنشاء...' : 'إنشاء الشهادة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CertificatesPage = () => {
  const { hasPermission } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await certificatesAPI.getAll({ page, limit: 10, search, status: statusFilter });
      setCertificates(res.data.data.certificates);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('فشل تحميل الشهادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCertificates(); }, [page, search, statusFilter]);

  const handleRevoke = async (id) => {
    if (!confirm('هل تريد إلغاء هذه الشهادة؟')) return;
    try {
      await certificatesAPI.revoke(id, { reason: 'إلغاء من لوحة التحكم' });
      toast.success('تم إلغاء الشهادة');
      fetchCertificates();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الإلغاء');
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {showCreate && (
        <CreateCertModal onClose={() => setShowCreate(false)} onSuccess={fetchCertificates} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award size={22} className="text-blue-600" /> إدارة الشهادات
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination.total || 0} شهادة في النظام
          </p>
        </div>
        {hasPermission('certificate:create') && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
            <Plus size={16} /><span>شهادة جديدة</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="بحث في الشهادات..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none">
          <option value="">جميع الحالات</option>
          <option value="active">نشطة</option>
          <option value="revoked">ملغاة</option>
          <option value="expired">منتهية</option>
          <option value="pending">معلقة</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Award size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد شهادات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['رقم الشهادة', 'العنوان', 'الحامل', 'النوع', 'الحالة', 'تاريخ الإصدار', 'الإجراءات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {certificates.map(cert => (
                  <tr key={cert._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-blue-600">{cert.certificateId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm text-gray-800 max-w-[200px] truncate">{cert.title}</div>
                      <div className="text-xs text-gray-400">{cert.issuingOrganization}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cert.holderName}</td>
                    <td className="px-4 py-3"><TypeBadge type={cert.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={cert.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString('ar')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={`/verify/${cert.verificationToken}`} target="_blank" rel="noopener"
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="تحقق">
                          <ExternalLink size={14} />
                        </a>
                        {hasPermission('certificate:revoke') && cert.status === 'active' && (
                          <button onClick={() => handleRevoke(cert._id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="إلغاء">
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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

export default CertificatesPage;
