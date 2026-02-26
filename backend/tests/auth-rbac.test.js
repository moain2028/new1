/**
 * Authentication & RBAC API Integration Tests
 */

require('./setup');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const { ROLES } = require('../src/config/rbac');
const { generateTokenPair } = require('../src/utils/jwt');

// Test Users
let superAdmin, admin, issuer, verifier, holder;
let superAdminToken, adminToken, issuerToken, verifierToken, holderToken;

const createTestUser = async (role, suffix = '') => {
  const user = await User.create({
    fullName: `Test ${role} ${suffix}`,
    email: `${role}${suffix}@test.com`,
    password: 'TestPass123!',
    role,
    isActive: true,
  });
  const tokens = generateTokenPair(user);
  return { user, token: tokens.accessToken };
};

beforeEach(async () => {
  ({ user: superAdmin, token: superAdminToken } = await createTestUser(ROLES.SUPER_ADMIN, '1'));
  ({ user: admin, token: adminToken } = await createTestUser(ROLES.ADMIN, '1'));
  ({ user: issuer, token: issuerToken } = await createTestUser(ROLES.ISSUER, '1'));
  ({ user: verifier, token: verifierToken } = await createTestUser(ROLES.VERIFIER, '1'));
  ({ user: holder, token: holderToken } = await createTestUser(ROLES.HOLDER, '1'));
});

// ============================================================
// AUTH TESTS
// ============================================================
describe('POST /api/auth/register', () => {
  test('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'New User',
        email: 'newuser@test.com',
        password: 'Password123',
        organization: 'Test Org',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe(ROLES.HOLDER);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
  });

  test('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Duplicate',
        email: 'holder1@test.com', // already registered
        password: 'Password123',
      });
    
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  test('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        email: 'weakpass@test.com',
        password: '123', // too short
      });
    
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  test('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'holder1@test.com', password: 'TestPass123!' });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens).toHaveProperty('accessToken');
    expect(res.body.data.tokens).toHaveProperty('refreshToken');
  });

  test('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'holder1@test.com', password: 'WrongPassword' });
    
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notexist@test.com', password: 'Password123' });
    
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  test('should return profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${holderToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('holder1@test.com');
  });

  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  test('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
  });
});

// ============================================================
// RBAC ACCESS CONTROL TESTS
// ============================================================
describe('RBAC - Certificate Access Control', () => {
  let certId;
  
  beforeEach(async () => {
    // Create a certificate as issuer for testing
    const Certificate = require('../src/models/Certificate');
    const cert = await Certificate.create({
      title: 'Test Certificate',
      type: 'academic',
      holder: holder._id,
      holderName: holder.fullName,
      issuedBy: issuer._id,
      issuerName: issuer.fullName,
      issuingOrganization: 'Test University',
      status: 'active',
    });
    certId = cert._id;
  });

  test('ISSUER can create certificates', async () => {
    const res = await request(app)
      .post('/api/certificates')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        title: 'Python Certification',
        type: 'professional',
        holderEmail: 'holder1@test.com',
        issuingOrganization: 'Tech Academy',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.certificate.status).toBe('active'); // auto-signed
  });

  test('HOLDER cannot create certificates', async () => {
    const res = await request(app)
      .post('/api/certificates')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({
        title: 'Fake Certificate',
        type: 'academic',
        holderEmail: 'holder1@test.com',
        issuingOrganization: 'Fake Org',
      });
    
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PERMISSION_DENIED');
  });

  test('VERIFIER cannot create certificates', async () => {
    const res = await request(app)
      .post('/api/certificates')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        title: 'Unauthorized Cert',
        type: 'academic',
        holderEmail: 'holder1@test.com',
        issuingOrganization: 'Fake Org',
      });
    
    expect(res.status).toBe(403);
  });

  test('ADMIN can revoke certificates', async () => {
    const res = await request(app)
      .put(`/api/certificates/${certId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Testing revocation' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.certificate.status).toBe('revoked');
  });

  test('HOLDER cannot revoke certificates', async () => {
    const res = await request(app)
      .put(`/api/certificates/${certId}/revoke`)
      .set('Authorization', `Bearer ${holderToken}`)
      .send({ reason: 'Should not work' });
    
    expect(res.status).toBe(403);
  });

  test('ISSUER can revoke certificates', async () => {
    const res = await request(app)
      .put(`/api/certificates/${certId}/revoke`)
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({ reason: 'Issuer revocation' });
    
    expect(res.status).toBe(200);
  });
});

// ============================================================
// RBAC - USER MANAGEMENT TESTS
// ============================================================
describe('RBAC - User Management', () => {
  test('ADMIN can list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.users).toBeDefined();
  });

  test('HOLDER cannot list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${holderToken}`);
    
    expect(res.status).toBe(403);
  });

  test('VERIFIER cannot list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${verifierToken}`);
    
    expect(res.status).toBe(403);
  });

  test('ADMIN can assign roles', async () => {
    const res = await request(app)
      .patch(`/api/users/${holder._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLES.VERIFIER });
    
    expect(res.status).toBe(200);
    expect(res.body.data.newRole).toBe(ROLES.VERIFIER);
  });

  test('ADMIN cannot assign SUPER_ADMIN role', async () => {
    const res = await request(app)
      .patch(`/api/users/${holder._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: ROLES.SUPER_ADMIN });
    
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PRIVILEGE');
  });

  test('SUPER_ADMIN can assign any role', async () => {
    const res = await request(app)
      .patch(`/api/users/${holder._id}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: ROLES.ADMIN });
    
    expect(res.status).toBe(200);
    expect(res.body.data.newRole).toBe(ROLES.ADMIN);
  });

  test('HOLDER cannot assign roles', async () => {
    const res = await request(app)
      .patch(`/api/users/${issuer._id}/role`)
      .set('Authorization', `Bearer ${holderToken}`)
      .send({ role: ROLES.HOLDER });
    
    expect(res.status).toBe(403);
  });

  test('Only SUPER_ADMIN can delete users', async () => {
    // Admin tries - should fail
    const adminTry = await request(app)
      .delete(`/api/users/${holder._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminTry.status).toBe(403);

    // Super admin - should succeed
    const superAdminTry = await request(app)
      .delete(`/api/users/${holder._id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(superAdminTry.status).toBe(200);
  });
});

// ============================================================
// CERTIFICATE VERIFICATION TESTS
// ============================================================
describe('Certificate Verification', () => {
  let verificationToken;
  
  beforeEach(async () => {
    const Certificate = require('../src/models/Certificate');
    const cert = await Certificate.create({
      title: 'Verifiable Certificate',
      type: 'professional',
      holder: holder._id,
      holderName: holder.fullName,
      issuedBy: issuer._id,
      issuerName: issuer.fullName,
      issuingOrganization: 'Test Org',
      status: 'active',
    });
    verificationToken = cert.verificationToken;
    
    // Sign it
    const SIGNING_SECRET = process.env.CERT_SIGNING_SECRET;
    cert.signCertificate(SIGNING_SECRET);
    await cert.save();
  });

  test('should verify valid certificate successfully', async () => {
    const res = await request(app)
      .get(`/api/verify/${verificationToken}`)
      .set('Authorization', `Bearer ${verifierToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('valid');
    expect(res.body.data.isValid).toBe(true);
  });

  test('should return revoked status for revoked certificate', async () => {
    const Certificate = require('../src/models/Certificate');
    const cert = await Certificate.findOne({ verificationToken });
    cert.status = 'revoked';
    cert.revocationReason = 'Test revocation';
    await cert.save();

    const res = await request(app)
      .get(`/api/verify/${verificationToken}`)
      .set('Authorization', `Bearer ${verifierToken}`);
    
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('revoked');
    expect(res.body.data.isValid).toBe(false);
  });

  test('should return invalid for non-existent token', async () => {
    const res = await request(app)
      .get('/api/verify/invalid-token-xyz')
      .set('Authorization', `Bearer ${verifierToken}`);
    
    expect(res.status).toBe(404);
    expect(res.body.result).toBe('invalid');
  });
});

// ============================================================
// SECURITY TESTS
// ============================================================
describe('Security Tests', () => {
  test('should reject requests without authentication', async () => {
    const protectedRoutes = [
      ['GET', '/api/certificates'],
      ['GET', '/api/users'],
      ['GET', '/api/audit'],
    ];

    for (const [method, route] of protectedRoutes) {
      const res = await request(app)[method.toLowerCase()](route);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    }
  });

  test('Health check should be publicly accessible', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('RBAC info should be publicly accessible', async () => {
    const res = await request(app).get('/api/rbac/info');
    expect(res.status).toBe(200);
    expect(res.body.data.roles).toBeDefined();
  });

  test('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
  });
});
