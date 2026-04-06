import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from '../services/audit.service.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, env.jwtAccessSecret);

    const user = await User.findById(payload.sub).select('-passwordHash -refreshTokenHash -emailVerificationOtpHash -passwordResetOtpHash');

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Include version in sub comparison to handle direct user object changes
    if (payload.version !== undefined && user.tokenVersion !== payload.version) {
      throw new ApiError(401, 'Session has expired');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Access token has expired'));
    } else {
      next(error instanceof ApiError ? error : new ApiError(401, 'Invalid authentication'));
    }
  }
}

export function requireActiveAccount(req, res, next) {
  if (req.user.accountStatus === 'LOCKED') {
    return next(new ApiError(423, 'Account is currently locked'));
  }
  if (req.user.accountStatus === 'SUSPENDED') {
    return next(new ApiError(403, 'Account has been suspended'));
  }
  if (req.user.accountStatus !== 'ACTIVE') {
    return next(new ApiError(403, 'Account has not been activated'));
  }
  next();
}

export function requireVerifiedEmail(req, res, next) {
  if (!req.user.emailVerified) {
    return next(new ApiError(403, 'Email verification is required'));
  }
  next();
}

/** Allows only verification routes for users who haven't verified their email yet */
export function restrictToPending(req, res, next) {
  if (req.user.emailVerified && req.user.accountStatus === 'ACTIVE') {
    return next(new ApiError(400, 'Account already activated'));
  }
  next();
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user.permissions?.includes(permission)) {
      await createAuditLog({
        actor: req.user._id,
        action: 'ACCESS_DENIED',
        newValue: { permission, path: req.path },
        req
      });
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied: high-level administrative privileges required'));
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
