import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Shield, CheckCircle, XCircle, Lock } from 'lucide-react';
import { usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = ['super_admin', 'admin', 'issuer', 'verifier', 'holder'];
const ROLE_LABELS = { super_admin: 'مدير النظام', admin: 'مدير', issuer: 'مُصدِر', verifier: 'مُتحقِق', holder: 'حامل' };
const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-700 border-red-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  issuer: 'bg-blue-100 text-blue-700 border-blue-200',
  verifier: 'bg-green-100 text-green-700 border-green-200',
  holder: 'bg-gray-100 text-gray-700 border-gray-200',
};

const UsersPage = () => {
  const { user: currentUser, hasPermission, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAll({ page, limit: 10, search, role: roleFilter });
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersAPI.assignRole(userId, newRole);
      toast.success(`تم تغيير الدور إلى "${ROLE_LABELS[newRole]}"`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تغيير الدور');
    }
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      await usersAPI.toggleStatus(userId, isActive);
      toast.success(isActive ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل تغيير الحالة');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await usersAPI.delete(userId);
      toast.success('تم حذف المستخدم');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل الحذف');
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-purple-600" /> إدارة المستخدمين
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total || 0} مستخدم مسجّل</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="بحث في المستخدمين..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none">
          <option value="">جميع الأدوار</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا يوجد مستخدمون</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['المستخدم', 'الدور', 'الحالة', 'المنظمة', 'تاريخ التسجيل', 'الإجراءات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u._id} className={`hover:bg-gray-50 transition-colors ${u._id === currentUser?.id ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                          {u.fullName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-800">
                            {u.fullName}
                            {u._id === currentUser?.id && <span className="text-xs text-blue-500 mr-1">(أنت)</span>}
                          </div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {hasPermission('user:assign_role') && u._id !== currentUser?.id ? (
                        <select value={u.role}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          disabled={u.role === 'super_admin' && !hasRole('super_admin')}
                          className={`text-xs px-2 py-1 rounded-lg border font-medium outline-none cursor-pointer ${ROLE_COLORS[u.role] || ''}`}>
                          {ROLES.map(r => (
                            <option key={r} value={r} disabled={['admin', 'super_admin'].includes(r) && !hasRole('super_admin')}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${ROLE_COLORS[u.role] || ''}`}>
                          <Lock size={10} />{ROLE_LABELS[u.role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${u.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {u.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {u.isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.organization || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString('ar')}</td>
                    <td className="px-4 py-3">
                      {u._id !== currentUser?.id && hasPermission('user:update') && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggleStatus(u._id, !u.isActive)}
                            className={`px-2 py-1 text-xs rounded-lg border transition-colors ${u.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {u.isActive ? 'إيقاف' : 'تفعيل'}
                          </button>
                          {hasRole('super_admin') && (
                            <button onClick={() => handleDelete(u._id)}
                              className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                              حذف
                            </button>
                          )}
                        </div>
                      )}
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

export default UsersPage;
