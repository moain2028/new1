/**
 * JWT Token Utility - Certificate Protection System
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'cert-rbac-super-secret-change-in-production-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cert-rbac-refresh-secret-change-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate Access Token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'certificate-rbac-system',
      audience: 'certificate-rbac-users',
    }
  );
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (payload) => {
  const tokenId = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      tokenId,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'certificate-rbac-system',
    }
  );
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'certificate-rbac-system',
    audience: 'certificate-rbac-users',
  });
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: 'certificate-rbac-system',
  });
};

/**
 * Decode token without verification (for inspecting expired tokens)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate a pair of access + refresh tokens
 */
const generateTokenPair = (user) => {
  const payload = {
    userId: user._id || user.id,
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: JWT_EXPIRES_IN,
  };
};

/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
};
