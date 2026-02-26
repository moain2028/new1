# 🔒 Security Documentation - Certificate Protection System (RBAC)

## Access Control Matrix

| Permission | super_admin | admin | issuer | verifier | holder |
|-----------|-------------|-------|--------|----------|--------|
| certificate:create | ✅ | ✅ | ✅ | ❌ | ❌ |
| certificate:read | ✅ | ✅ | ✅ | ✅ | ❌ |
| certificate:read:own | ✅ | ✅ | ✅ | ✅ | ✅ |
| certificate:revoke | ✅ | ✅ | ✅ | ❌ | ❌ |
| certificate:sign | ✅ | ✅ | ✅ | ❌ | ❌ |
| certificate:verify | ✅ | ✅ | ✅ | ✅ | ✅ |
| certificate:export | ✅ | ✅ | ✅ | ❌ | ❌ |
| certificate:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| user:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| user:read | ✅ | ✅ | ✅ | ❌ | ❌ |
| user:read:own | ✅ | ✅ | ✅ | ✅ | ✅ |
| user:update | ✅ | ✅ | ❌ | ❌ | ❌ |
| user:update:own | ✅ | ✅ | ✅ | ✅ | ✅ |
| user:delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| user:assign_role | ✅ | ✅ | ❌ | ❌ | ❌ |
| audit:read | ✅ | ✅ | ✅ | ❌ | ❌ |
| audit:export | ✅ | ✅ | ❌ | ❌ | ❌ |
| system:config | ✅ | ❌ | ❌ | ❌ | ❌ |
| system:backup | ✅ | ❌ | ❌ | ❌ | ❌ |

## Security Measures

### Authentication
- JWT Access Tokens (15 min expiry)
- JWT Refresh Tokens (7 days expiry)
- Account lockout after 5 failed attempts (2 hours)
- bcrypt password hashing (salt rounds: 12)

### Digital Certificates
- SHA-256-HMAC digital signature per certificate
- SHA-256 integrity checksum
- Unique certificate ID + serial number per certificate
- QR Code for instant verification

### Network Security
- Helmet.js security headers
- CORS with whitelist
- Rate limiting: 100 req/15min (global), 10 req/15min (auth)
- Input validation with express-validator

### Audit Trail
- All auth events logged (login, logout, failed attempts)
- All certificate operations logged
- All user management operations logged
- Security events with severity levels (info/warning/critical)
- IP address + User-Agent captured per request
