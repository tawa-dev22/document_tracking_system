import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true, default: 'Unassigned' },
    grade: { type: String, required: true, trim: true, default: 'Unassigned' },
    role: { type: String, enum: ['USER', 'MANAGER', 'ADMIN'], default: 'USER' },
    permissions: [{ type: String }],
    accountStatus: { type: String, enum: ['PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'SUSPENDED'], default: 'PENDING_VERIFICATION' },
    emailVerified: { type: Boolean, default: false },
    emailVerificationOtpHash: { type: String },
    emailVerificationExpiresAt: { type: Date },
    emailVerificationAttempts: { type: Number, default: 0 },
    emailVerificationLastAttemptAt: { type: Date },
    passwordResetOtpHash: { type: String },
    passwordResetExpiresAt: { type: Date },
    passwordResetAttempts: { type: Number, default: 0 },
    passwordResetLastAttemptAt: { type: Date },
    otpResentAt: { type: Date },
    passwordChangedAt: { type: Date },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date },
    refreshTokenHash: { type: String }, // To be deprecated once sessions are fully utilized
    tokenVersion: { type: Number, default: 0 },
    lastPasswordChangeAt: { type: Date },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);



export default mongoose.model('User', userSchema);
