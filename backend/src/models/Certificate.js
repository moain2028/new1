/**
 * Certificate Model - Certificate Protection System (RBAC)
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const CERTIFICATE_TYPES = {
  ACADEMIC: 'academic',
  PROFESSIONAL: 'professional',
  TRAINING: 'training',
  ACHIEVEMENT: 'achievement',
  MEDICAL: 'medical',
  GOVERNMENT: 'government',
  OTHER: 'other',
};

const CERTIFICATE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  SUSPENDED: 'suspended',
};

const certificateSchema = new mongoose.Schema(
  {
    // Certificate Identity
    certificateId: {
      type: String,
      unique: true,
      index: true,
    },
    serialNumber: {
      type: String,
      unique: true,
      index: true,
    },

    // Certificate Info
    title: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: Object.values(CERTIFICATE_TYPES),
      required: [true, 'Certificate type is required'],
    },
    status: {
      type: String,
      enum: Object.values(CERTIFICATE_STATUS),
      default: CERTIFICATE_STATUS.DRAFT,
    },

    // Parties
    holder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Certificate holder is required'],
      index: true,
    },
    holderName: {
      type: String,
      required: true,
    },
    holderNationalId: {
      type: String,
    },

    // Issuer Info
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Issuer is required'],
    },
    issuerName: {
      type: String,
      required: true,
    },
    issuingOrganization: {
      type: String,
      required: [true, 'Issuing organization is required'],
      trim: true,
    },
    issuingDepartment: {
      type: String,
      trim: true,
    },

    // Dates
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    suspendedAt: {
      type: Date,
    },

    // Revocation Info
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    revocationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Cryptographic Security
    digitalSignature: {
      type: String, // SHA-256 HMAC signature
      select: false,
    },
    signatureAlgorithm: {
      type: String,
      default: 'SHA-256-HMAC',
    },
    checksum: {
      type: String, // Data integrity hash
    },
    publicKey: {
      type: String, // For signature verification
    },

    // QR Code & Verification
    qrCode: {
      type: String, // Base64 QR code image
    },
    verificationUrl: {
      type: String,
    },
    verificationToken: {
      type: String,
      index: true,
    },

    // Certificate Content
    skills: [{
      type: String,
      trim: true,
    }],
    grade: {
      type: String,
      trim: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    credits: {
      type: Number,
      min: 0,
    },
    duration: {
      type: String, // e.g., "40 hours", "1 year"
    },

    // File Attachments
    attachments: [{
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      path: String,
      uploadedAt: { type: Date, default: Date.now },
    }],

    // Template & Appearance
    templateId: {
      type: String,
    },
    templateData: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Access Control
    isPublic: {
      type: Boolean,
      default: false,
    },
    accessList: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      grantedAt: { type: Date, default: Date.now },
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],

    // Verification History
    verificationHistory: [{
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date, default: Date.now },
      ipAddress: String,
      userAgent: String,
      result: { type: String, enum: ['valid', 'invalid', 'expired', 'revoked'] },
    }],

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
certificateSchema.index({ holder: 1, status: 1 });
certificateSchema.index({ issuedBy: 1 });
certificateSchema.index({ verificationToken: 1 });
certificateSchema.index({ expiresAt: 1 });
certificateSchema.index({ type: 1, status: 1 });
certificateSchema.index({ serialNumber: 1 });

// Virtual: is certificate valid?
certificateSchema.virtual('isValid').get(function () {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
});

// Virtual: is expired?
certificateSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

// Pre-save: generate IDs, serial, verification token, checksum
certificateSchema.pre('save', function (next) {
  // Generate Certificate ID
  if (!this.certificateId) {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.certificateId = `CERT-${year}-${random}`;
  }

  // Generate Serial Number
  if (!this.serialNumber) {
    this.serialNumber = crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  // Generate Verification Token
  if (!this.verificationToken) {
    this.verificationToken = crypto.randomBytes(32).toString('hex');
  }

  // Set Verification URL
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  this.verificationUrl = `${baseUrl}/verify/${this.verificationToken}`;

  // Calculate Checksum for integrity
  const dataToHash = JSON.stringify({
    title: this.title,
    holder: this.holder?.toString(),
    holderName: this.holderName,
    issuingOrganization: this.issuingOrganization,
    issuedAt: this.issuedAt,
    type: this.type,
  });
  this.checksum = crypto.createHash('sha256').update(dataToHash).digest('hex');

  next();
});

// Method: Sign certificate
certificateSchema.methods.signCertificate = function (secretKey) {
  const payload = `${this.certificateId}|${this.serialNumber}|${this.checksum}`;
  this.digitalSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
  return this.digitalSignature;
};

// Method: Verify signature
certificateSchema.methods.verifySignature = function (secretKey) {
  if (!this.digitalSignature) return false;
  const payload = `${this.certificateId}|${this.serialNumber}|${this.checksum}`;
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(this.digitalSignature, 'hex'),
    Buffer.from(expected, 'hex')
  );
};

// Method: Auto-expire
certificateSchema.statics.autoExpireCertificates = async function () {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() },
    },
    { $set: { status: 'expired' } }
  );
  return result;
};

module.exports = mongoose.model('Certificate', certificateSchema);
module.exports.CERTIFICATE_TYPES = CERTIFICATE_TYPES;
module.exports.CERTIFICATE_STATUS = CERTIFICATE_STATUS;
