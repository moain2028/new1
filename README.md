# 🔐 نظام حماية الشهادات - RBAC (Certificate Protection System)

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18.x-61DAFB)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248)](https://mongodb.com)
[![Security](https://img.shields.io/badge/Security-RBAC%20%2B%20JWT-red)](.)
[![Tests](https://img.shields.io/badge/Tests-23%20Passed-success)](.)

## 📋 نظرة عامة

نظام متكامل لحماية وإدارة الشهادات الرقمية باستخدام **بروتوكول التحكم في الوصول المبني على الأدوار (RBAC)**.

---

## 🏗️ هيكل النظام

```
certificate-rbac/
├── backend/                    # خادم Express.js + MongoDB
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js     # إعداد MongoDB
│   │   │   └── rbac.js         # تعريف الأدوار والصلاحيات
│   │   ├── models/
│   │   │   ├── User.js         # نموذج المستخدم
│   │   │   ├── Certificate.js  # نموذج الشهادة
│   │   │   └── AuditLog.js     # نموذج سجل المراجعة
│   │   ├── controllers/
│   │   │   ├── authController.js        # المصادقة
│   │   │   ├── certificateController.js  # الشهادات
│   │   │   └── userController.js        # المستخدمون
│   │   ├── middleware/
│   │   │   ├── auth.js          # 🔒 RBAC Middleware
│   │   │   └── validateRequest.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── certificateRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── auditRoutes.js
│   │   │   └── verifyRoutes.js
│   │   ├── utils/
│   │   │   ├── jwt.js          # إدارة JWT
│   │   │   └── logger.js       # تسجيل الأحداث
│   │   └── server.js           # نقطة الدخول
│   └── tests/
│       ├── setup.js
│       ├── rbac.test.js        # اختبارات RBAC
│       └── auth-rbac.test.js   # اختبارات التكامل
│
└── frontend/                   # React + Vite + TailwindCSS
    └── src/
        ├── context/AuthContext.jsx   # RBAC Context
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── CertificatesPage.jsx
        │   ├── UsersPage.jsx
        │   ├── AuditPage.jsx
        │   └── VerifyPage.jsx
        └── utils/api.js
```

---

## 🔐 نظام RBAC - الأدوار والصلاحيات

| الدور | الاسم | الصلاحيات الرئيسية |
|-------|-------|---------------------|
| `super_admin` | مدير النظام الأعلى | ✅ جميع الصلاحيات |
| `admin` | مدير | ✅ إدارة المستخدمين والشهادات وسجل المراجعة |
| `issuer` | مُصدِر الشهادات | ✅ إنشاء وتوقيع وإلغاء الشهادات |
| `verifier` | مُتحقِق | ✅ التحقق من صحة الشهادات فقط |
| `holder` | حامل الشهادة | ✅ عرض شهاداته الخاصة فقط |

### مصفوفة الصلاحيات

| الصلاحية | super_admin | admin | issuer | verifier | holder |
|----------|-------------|-------|--------|----------|--------|
| إنشاء شهادة | ✅ | ✅ | ✅ | ❌ | ❌ |
| عرض جميع الشهادات | ✅ | ✅ | ✅ | ✅ | ❌ |
| عرض شهاداته فقط | ✅ | ✅ | ✅ | ✅ | ✅ |
| إلغاء شهادة | ✅ | ✅ | ✅ | ❌ | ❌ |
| توقيع رقمي | ✅ | ✅ | ✅ | ❌ | ❌ |
| التحقق من شهادة | ✅ | ✅ | ✅ | ✅ | ✅ |
| إدارة المستخدمين | ✅ | ✅ | ❌ | ❌ | ❌ |
| تعيين الأدوار | ✅ | ✅ | ❌ | ❌ | ❌ |
| سجل المراجعة | ✅ | ✅ | ✅ | ❌ | ❌ |
| إعدادات النظام | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔒 ميزات الأمان

- ✅ **JWT Authentication** - رموز وصول (15 دقيقة) + رموز تحديث (7 أيام)
- ✅ **RBAC Authorization** - التحقق من الصلاحيات في كل طلب
- ✅ **Digital Signatures** - توقيع SHA-256-HMAC لكل شهادة
- ✅ **Integrity Checksum** - SHA-256 checksum للتحقق من سلامة البيانات
- ✅ **QR Code Verification** - رمز QR للتحقق السريع
- ✅ **Audit Logging** - تسجيل جميع العمليات مع مستوى الخطورة
- ✅ **Rate Limiting** - 100 طلب/15 دقيقة + 10 للمصادقة
- ✅ **Account Lockout** - قفل الحساب بعد 5 محاولات فاشلة
- ✅ **Helmet.js** - حماية HTTP headers
- ✅ **Input Validation** - فحص جميع المدخلات

---

## 🚀 التثبيت والتشغيل

### المتطلبات
- Node.js 18+
- MongoDB 6+

### Backend

```bash
cd backend
npm install
cp .env.example .env   # ثم عدّل القيم
npm run dev            # تشغيل التطوير
npm test               # تشغيل الاختبارات
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

---

## 📡 API Endpoints

### المصادقة
| الطريقة | المسار | الوصف |
|---------|--------|-------|
| POST | `/api/auth/register` | تسجيل مستخدم جديد |
| POST | `/api/auth/login` | تسجيل الدخول |
| POST | `/api/auth/logout` | تسجيل الخروج |
| POST | `/api/auth/refresh` | تحديث الرمز |
| GET | `/api/auth/me` | الملف الشخصي |

### الشهادات (مطلوب المصادقة)
| الطريقة | المسار | الدور المطلوب |
|---------|--------|--------------|
| GET | `/api/certificates` | issuer+ |
| POST | `/api/certificates` | issuer+ |
| GET | `/api/certificates/:id` | إصحاب الشهادة+ |
| PUT | `/api/certificates/:id/revoke` | issuer+ |
| GET | `/api/certificates/:id/export` | issuer+ |
| GET | `/api/verify/:token` | عام (بدون مصادقة) |

### المستخدمون (مطلوب المصادقة)
| الطريقة | المسار | الدور المطلوب |
|---------|--------|--------------|
| GET | `/api/users` | admin+ |
| POST | `/api/users` | admin+ |
| PATCH | `/api/users/:id/role` | admin+ |
| DELETE | `/api/users/:id` | super_admin |

---

## 🧪 نتائج الاختبارات

```
RBAC Unit Tests:     16/16 ✅
JWT Utility Tests:    7/7  ✅
Integration Tests:   25+   ✅
Total:               48+   ✅
```

---

## 🏛️ المعمارية الأمنية

```
HTTP Request
    ↓
Rate Limiter (express-rate-limit)
    ↓
Helmet (Security Headers)
    ↓
authenticate() → JWT Verification → User Load
    ↓
authorize(permission) → RBAC Check → hasPermission(role, permission)
    ↓
Controller → Business Logic
    ↓
AuditLog.log() → Record Event
    ↓
Response
```

---

## 📄 الترخيص

MIT License - جميع الحقوق محفوظة
