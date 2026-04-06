import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { clearCsrfCookie, clearRefreshCookie, generateCsrfToken, generateOtp, hashValue, setCsrfCookie, setRefreshCookie } from '../utils/security.js';
import { calculatePasswordStrength } from '../utils/password.js';
import { createAuditLog } from '../services/audit.service.js';
import { sendOtpEmail } from '../services/email.service.js';
import { claimSharedDocumentsForUser } from '../services/user.service.js';
import * as authService from '../services/auth.service.js';
import { verifyCaptcha } from '../services/captcha.service.js';
import RefreshSession from '../models/RefreshSession.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password is too long')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

const registerSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().email(),
  password: passwordSchema,
  employeeId: z.string().trim().min(3).max(40),
  department: z.string().trim().min(2).max(120),
  grade: z.string().trim().min(1).max(50)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const otpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().length(6)
});

const resetSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().length(6),
  newPassword: passwordSchema
});

function sanitizeEmail(email) {
  return email.toLowerCase().trim();
}

function userPayload(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    department: user.department,
    grade: user.grade,
    emailVerified: user.emailVerified,
    accountStatus: user.accountStatus
  };
}

async function issueLoginSession(req, res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  
  await authService.createRefreshSession({
    userId: user._id,
    refreshToken,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    tokenVersion: user.tokenVersion,
    req
  });

  setRefreshCookie(res, refreshToken);
  return accessToken;
}

export const getCsrfToken = asyncHandler(async (_req, res) => {
  const csrfToken = generateCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.json({ success: true, csrfToken });
});

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const email = sanitizeEmail(data.email);
  const exists = await User.findOne({ $or: [{ email }, { employeeId: data.employeeId.trim() }] });
  if (exists) throw new ApiError(409, 'Email or employee ID already exists');

  const otp = generateOtp();
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await User.create({
    fullName: data.fullName.trim(),
    email,
    passwordHash,
    employeeId: data.employeeId.trim(),
    department: data.department.trim(),
    grade: data.grade.trim(),
    role: 'USER',
    emailVerificationOtpHash: hashValue(otp),
    emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });

  await sendOtpEmail({
    to: user.email,
    fullName: user.fullName,
    subject: 'Verify your ministry account',
    otp,
    purpose: 'email verification'
  });

  await createAuditLog({ actor: user._id, action: 'USER_REGISTERED', req, metadata: { email } });

  res.status(201).json({
    success: true,
    message: 'Signup successful. Check your email for the verification OTP.',
    data: { email: user.email, passwordStrength: calculatePasswordStrength(data.password) }
  });
});

export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const data = otpSchema.parse(req.body);
  const email = sanitizeEmail(data.email);
  const user = await User.findOne({ email });

  if (!user) throw new ApiError(404, 'Account not found');
  
  // Anti-Brute Force for OTP
  if (user.emailVerificationAttempts >= env.security.maxOtpAttempts) {
    throw new ApiError(429, 'Too many failed verification attempts. Please request a new OTP.');
  }

  if (!user.emailVerificationOtpHash || !user.emailVerificationExpiresAt) {
    throw new ApiError(400, 'No verification request found');
  }

  if (user.emailVerificationExpiresAt < new Date()) {
    throw new ApiError(400, 'Verification OTP has expired');
  }

  if (user.emailVerificationOtpHash !== hashValue(data.otp)) {
    user.emailVerificationAttempts += 1;
    user.emailVerificationLastAttemptAt = new Date();
    await user.save();
    throw new ApiError(400, `Invalid verification OTP. ${env.security.maxOtpAttempts - user.emailVerificationAttempts} attempts remaining.`);
  }

  user.emailVerified = true;
  user.accountStatus = 'ACTIVE';
  user.emailVerificationOtpHash = null;
  user.emailVerificationExpiresAt = null;
  user.emailVerificationAttempts = 0;
  await user.save();
  await claimSharedDocumentsForUser(user);

  await createAuditLog({ actor: user._id, action: 'EMAIL_VERIFIED', req });

  res.json({ success: true, message: 'Email verified successfully. You can now sign in.' });
});

export const resendVerificationOtp = asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);
  const user = await User.findOne({ email: sanitizeEmail(email) });
  
  if (!user) throw new ApiError(404, 'Account not found');
  if (user.emailVerified) throw new ApiError(400, 'Email is already verified');

  // Enforce Cooldown
  const now = new Date();
  if (user.otpResentAt && (now.getTime() - user.otpResentAt.getTime()) < env.security.otpCooldownSeconds * 1000) {
    const remaining = Math.ceil((env.security.otpCooldownSeconds * 1000 - (now.getTime() - user.otpResentAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${remaining} seconds before requesting a new OTP.`);
  }

  const otp = generateOtp();
  user.emailVerificationOtpHash = hashValue(otp);
  user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationAttempts = 0; // Reset attempts for new code
  user.otpResentAt = now;
  await user.save();

  await sendOtpEmail({
    to: user.email,
    fullName: user.fullName,
    subject: 'Your new verification OTP',
    otp,
    purpose: 'email verification'
  });

  res.json({ success: true, message: 'A new verification OTP has been sent.' });
});

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const email = sanitizeEmail(data.email);
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (user.lockUntil && user.lockUntil > new Date()) throw new ApiError(423, 'Account is temporarily locked. Try again later.');
  if (!user.emailVerified) throw new ApiError(403, 'Please verify your email before signing in.');
  if (user.accountStatus === 'SUSPENDED') throw new ApiError(403, 'Account is suspended. Contact support.');

  const match = await bcrypt.compare(data.password, user.passwordHash);
  
  // CAPTCHA ESCALATION: If failed attempts high, require captcha
  if (user.failedLoginCount >= env.security.maxFailedLoginsBeforeCaptcha) {
    const captchaToken = req.body.captchaToken;
    const isHuman = await verifyCaptcha(captchaToken, req.ip);
    if (!isHuman) {
      throw new ApiError(403, 'Suspicious activity detected. Please complete the CAPTCHA to continue.');
    }
  }

  if (!match) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.accountStatus = 'LOCKED';
    }
    await user.save();
    
    const attemptsRemaining = 5 - user.failedLoginCount;
    const msg = attemptsRemaining > 0 
      ? `Invalid credentials. ${attemptsRemaining} attempts remaining before lockout.`
      : 'Invalid credentials. Your account has been temporarily locked.';
    
    throw new ApiError(401, msg);
  }

  user.failedLoginCount = 0;
  user.lockUntil = null;
  user.accountStatus = 'ACTIVE';
  user.lastLoginAt = new Date();
  await user.save();
  
  await claimSharedDocumentsForUser(user);

  const accessToken = await issueLoginSession(req, res, user);

  await createAuditLog({ actor: user._id, action: 'LOGIN_SUCCESS', req });

  res.json({
    success: true,
    accessToken,
    user: userPayload(user)
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw new ApiError(401, 'Refresh token required');

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (err) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Invalid or expired session');
  }

  const { session, user } = await authService.rotateRefreshSession(
    refreshToken,
    payload.sub,
    req.ip,
    req.headers['user-agent'],
    req
  );

  const accessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  // Create new session after rotation
  await authService.createRefreshSession({
    userId: user._id,
    refreshToken: newRefreshToken,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    tokenVersion: user.tokenVersion,
    req
  });

  setRefreshCookie(res, newRefreshToken);
  res.json({ success: true, accessToken, user: userPayload(user) });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const hash = hashValue(refreshToken);
    await RefreshSession.findOneAndUpdate(
      { refreshTokenHash: hash },
      { revokedAt: new Date(), revokedReason: 'LOGOUT' }
    );
  }

  clearRefreshCookie(res);
  clearCsrfCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

export const logoutAllDevices = asyncHandler(async (req, res) => {
  await authService.revokeAllUserSessions(req.user._id, 'LOGOUT_ALL_DEVICES');
  clearRefreshCookie(res);
  clearCsrfCookie(res);
  res.json({ success: true, message: 'Logged out from all devices successfully' });
});

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await RefreshSession.find({
    userId: req.user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ lastUsedAt: -1 });

  res.json({
    success: true,
    data: sessions.map(s => ({
      id: s._id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt,
      isCurrent: hashValue(req.cookies?.refreshToken || '') === s.refreshTokenHash
    }))
  });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = z.object({ sessionId: z.string() }).parse(req.params);
  
  const session = await RefreshSession.findOne({ _id: sessionId, userId: req.user._id });
  if (!session) throw new ApiError(404, 'Session not found');

  session.revokedAt = new Date();
  session.revokedReason = 'REMOTE_REVOCATION';
  await session.save();

  res.json({ success: true, message: 'Session revoked successfully' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);
  const user = await User.findOne({ email: sanitizeEmail(email) });

  // Anti-enumeration: always return same message
  if (user) {
    const now = new Date();
    if (user.otpResentAt && now - user.otpResentAt < env.security.otpCooldownSeconds * 1000) {
      return res.json({ success: true, message: 'If the email exists, a password reset OTP has been sent.' });
    } else {
      const otp = generateOtp();
      user.passwordResetOtpHash = hashValue(otp);
      user.passwordResetExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.passwordResetAttempts = 0;
      user.otpResentAt = now;
      await user.save();
      await sendOtpEmail({
        to: user.email,
        fullName: user.fullName,
        subject: 'Password reset OTP',
        otp,
        purpose: 'password reset'
      });
    }
  }

  res.json({ success: true, message: 'If the email exists, a password reset OTP has been sent.' });
});

export const verifyResetOtp = asyncHandler(async (req, res) => {
  const data = otpSchema.parse(req.body);
  const user = await User.findOne({ email: sanitizeEmail(data.email) });
  if (!user) throw new ApiError(404, 'Account not found');

  if (user.passwordResetAttempts >= 5) {
    throw new ApiError(429, 'Too many verification attempts. Please request a new OTP.');
  }

  user.passwordResetAttempts += 1;
  user.passwordResetLastAttemptAt = new Date();

  if (!user.passwordResetOtpHash || !user.passwordResetExpiresAt) {
    await user.save();
    throw new ApiError(400, 'No password reset request found');
  }

  if (user.passwordResetExpiresAt < new Date()) {
    await user.save();
    throw new ApiError(400, 'Password reset OTP has expired');
  }

  if (user.passwordResetOtpHash !== hashValue(data.otp)) {
    await user.save();
    throw new ApiError(400, 'Invalid password reset OTP');
  }

  await user.save();
  res.json({ success: true, message: 'OTP verified. You can now set a new password.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = resetSchema.parse(req.body);
  const user = await User.findOne({ email: sanitizeEmail(data.email) });
  
  if (!user || !user.passwordResetOtpHash || user.passwordResetOtpHash !== hashValue(data.otp)) {
    throw new ApiError(400, 'Invalid or expired session');
  }
  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    throw new ApiError(400, 'Invalid or expired session');
  }

  user.passwordHash = await bcrypt.hash(data.newPassword, 12);
  user.passwordResetOtpHash = null;
  user.passwordResetExpiresAt = null;
  user.passwordResetAttempts = 0;
  user.passwordChangedAt = new Date();
  user.lastPasswordChangeAt = new Date();
  user.tokenVersion += 1; // Invalidate all existing tokens globally
  await user.save();

  // Revoke all sessions for this user across all devices
  await authService.revokeAllUserSessions(user._id, 'PASSWORD_RESET');

  clearRefreshCookie(res);
  clearCsrfCookie(res);
  await createAuditLog({ actor: user._id, action: 'PASSWORD_RESET_SUCCESS', req });

  res.json({
    success: true,
    message: 'Password reset successful. Please sign in with your new password.',
    data: { passwordStrength: calculatePasswordStrength(data.newPassword) }
  });
});

export const getStatusPolicies = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      documentTransitions: {
        SUBMITTED: ['IN_PROGRESS', 'APPROVED', 'REJECTED'],
        IN_PROGRESS: ['APPROVED', 'REJECTED', 'RESUBMITTED'],
        REJECTED: ['RESUBMITTED'],
        RESUBMITTED: ['IN_PROGRESS', 'APPROVED', 'REJECTED'],
        APPROVED: []
      },
      userTransitions: {
        PENDING_VERIFICATION: ['ACTIVE'],
        ACTIVE: ['LOCKED', 'SUSPENDED'],
        LOCKED: ['ACTIVE'],
        SUSPENDED: ['ACTIVE']
      }
    }
  });
});const updateProfileSchema = z.object({
  fullName: z.string().trim().min(3).max(120).optional(),
  department: z.string().trim().min(2).max(120).optional(),
  grade: z.string().trim().min(1).max(50).optional(),
  employeeId: z.string().trim().min(3).max(40).optional()
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, 'No information provided to update');
  }

  // If Employee ID is changing, check uniqueness across other users
  if (data.employeeId && data.employeeId !== req.user.employeeId) {
    const existing = await User.findOne({ 
      employeeId: data.employeeId, 
      _id: { $ne: req.user._id } 
    });
    if (existing) {
      throw new ApiError(400, 'Another user is already registered with this Employee ID');
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: data },
    { new: true }
  ).select('-passwordHash -refreshTokenHash');

  await createAuditLog({
    actor: req.user._id,
    action: 'USER_PROFILE_UPDATED',
    newValue: data,
    req
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: updatedUser
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await User.findById(req.user._id);

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  user.lastPasswordChangeAt = new Date();
  
  // Revoke old tokens / force fresh authentication logic to be safer
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  await createAuditLog({
    actor: req.user._id,
    action: 'USER_PASSWORD_CHANGED',
    req
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});
