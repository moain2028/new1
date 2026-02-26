import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Award, Building, User, Calendar, ExternalLink } from 'lucide-react';
import { certificatesAPI } from '../utils/api';

const VerifyPage = () => {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await certificatesAPI.verify(token);
        setResult(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setResult({ result: 'invalid', message: 'الشهادة غير موجودة', data: {} });
        } else {
          setError('خطأ في خدمة التحقق');
        }
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">جاري التحقق من الشهادة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle size={64} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">خطأ في التحقق</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    valid: {
      icon: <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />,
      bg: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-800 border-green-300',
      badgeText: '✅ شهادة صحيحة وموثوقة',
      headerBg: 'from-green-600 to-emerald-700',
    },
    revoked: {
      icon: <XCircle size={64} className="text-red-500 mx-auto mb-4" />,
      bg: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800 border-red-300',
      badgeText: '❌ شهادة ملغاة',
      headerBg: 'from-red-600 to-rose-700',
    },
    expired: {
      icon: <Clock size={64} className="text-orange-500 mx-auto mb-4" />,
      bg: 'from-orange-50 to-amber-50',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800 border-orange-300',
      badgeText: '⏰ شهادة منتهية الصلاحية',
      headerBg: 'from-orange-600 to-amber-700',
    },
    invalid: {
      icon: <AlertTriangle size={64} className="text-yellow-500 mx-auto mb-4" />,
      bg: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      badgeText: '⚠️ شهادة غير صالحة',
      headerBg: 'from-yellow-600 to-amber-700',
    },
    suspended: {
      icon: <AlertTriangle size={64} className="text-orange-500 mx-auto mb-4" />,
      bg: 'from-orange-50',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800',
      badgeText: '⏸️ شهادة موقوفة مؤقتاً',
      headerBg: 'from-orange-600 to-orange-700',
    },
  };

  const config = statusConfig[result?.result] || statusConfig.invalid;
  const data = result?.data || {};

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bg} p-4 flex items-center justify-center`} dir="rtl">
      <div className={`bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border ${config.border}`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.headerBg} p-6 text-white`}>
          <div className="flex items-center gap-3 mb-3">
            <Shield size={28} />
            <div>
              <div className="font-bold text-lg">نظام التحقق من الشهادات</div>
              <div className="text-white/70 text-sm">Certificate Verification System - RBAC</div>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold bg-white/20 border-white/30`}>
            {config.badgeText}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-5 text-center">{result?.message}</p>

          {data.certificateId && (
            <div className="space-y-3">
              {/* Certificate ID */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Award size={12} />معرف الشهادة
                </div>
                <div className="font-mono font-bold text-blue-700 text-sm">{data.certificateId}</div>
                {data.serialNumber && (
                  <div className="text-xs text-gray-400 mt-0.5">الرقم التسلسلي: {data.serialNumber}</div>
                )}
              </div>

              {/* Title */}
              <div className="text-lg font-bold text-gray-800 text-center">{data.title}</div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-xs text-blue-500 mb-1"><User size={11} />حامل الشهادة</div>
                  <div className="font-semibold text-sm text-blue-900">{data.holderName}</div>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-xs text-indigo-500 mb-1"><Building size={11} />الجهة المُصدِرة</div>
                  <div className="font-semibold text-sm text-indigo-900">{data.issuingOrganization}</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-xs text-purple-500 mb-1"><Calendar size={11} />تاريخ الإصدار</div>
                  <div className="font-semibold text-sm text-purple-900">
                    {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString('ar') : '-'}
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-xs text-green-500 mb-1"><Calendar size={11} />تاريخ الانتهاء</div>
                  <div className="font-semibold text-sm text-green-900">
                    {data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('ar') : 'غير محدد'}
                  </div>
                </div>
              </div>

              {/* Revocation info */}
              {data.revocationReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-xs text-red-500 font-medium mb-1">سبب الإلغاء:</div>
                  <div className="text-sm text-red-700">{data.revocationReason}</div>
                </div>
              )}

              {/* Verified at */}
              <div className="text-center text-xs text-gray-400">
                تم التحقق في: {new Date(data.verifiedAt).toLocaleString('ar')}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Link to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all">
            <Shield size={16} />
            الدخول إلى النظام
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;
