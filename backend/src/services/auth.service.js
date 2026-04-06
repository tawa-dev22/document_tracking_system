import jwt from 'jsonwebtoken';
import { UAParser } from 'ua-parser-js';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { hashValue } from '../utils/security.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from './audit.service.js';

const SESSION_LIMIT = 5;

export const createRefreshSession = async ({ userId, refreshToken, ipAddress, userAgent, tokenVersion, req }) => {
  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const os = parser.getOS();
  const browser = parser.getBrowser();

  // Enforce session limit
  const activeSessions = await RefreshSession.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ lastUsedAt: 1 });

  if (activeSessions.length >= SESSION_LIMIT) {
    const oldest = activeSessions[0];
    oldest.revokedAt = new Date();
    oldest.revokedReason = 'SESSION_LIMIT_EXCEEDED';
    await oldest.save();
    
    await createAuditLog({
      actor: userId,
      action: 'SESSION_REVOKED_AUTO',
      req,
      details: { reason: 'Limit exceeded', sessionId: oldest._id }
    });
  }

  const expiresAt = new Date(Date.now() + env.refreshTokenTtlMs);

  return await RefreshSession.create({
    userId,
    refreshTokenHash: hashValue(refreshToken),
    tokenVersion,
    ipAddress,
    userAgent,
    deviceInfo: {
      browser: `${browser.name || 'Unknown'} ${browser.version || ''}`.trim(),
      os: `${os.name || 'Unknown'} ${os.version || ''}`.trim(),
      device: `${device.vendor || ''} ${device.model || 'Desktop'}`.trim()
    },
    expiresAt
  });
};

export const rotateRefreshSession = async (oldToken, userId, ipAddress, userAgent, req) => {
  const oldHash = hashValue(oldToken);
  const session = await RefreshSession.findOne({ refreshTokenHash: oldHash, userId });

  if (!session) {
    // REUSE DETECTION: If token not found but was once valid, revoke all sessions
    await RefreshSession.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date(), revokedReason: 'TOKEN_REUSE_DETECTED' }
    );
    
    const user = await User.findById(userId);
    if (user) {
      user.tokenVersion += 1;
      await user.save();
    }

    await createAuditLog({
      actor: userId,
      action: 'REFRESH_TOKEN_REUSE_DETECTED',
      req,
      details: { ipAddress, userAgent }
    });
    
    throw new ApiError(401, 'Suspicious activity detected. All sessions revoked.');
  }

  if (!session.isActive()) {
    throw new ApiError(401, 'Session is no longer active');
  }

  // Verify token version matches user
  const user = await User.findById(userId);
  if (!user || user.tokenVersion !== session.tokenVersion) {
    session.revokedAt = new Date();
    session.revokedReason = 'TOKEN_VERSION_MISMATCH';
    await session.save();
    throw new ApiError(401, 'Session invalidated due to account change');
  }

  // Revoke old session and issue new one
  session.revokedAt = new Date();
  session.revokedReason = 'ROTATED';
  await session.save();

  // New token and session will be created in the controller after this
  return { session, user };
};

export const revokeAllUserSessions = async (userId, reason = 'LOGOUT_ALL', excludeSessionId = null) => {
  const filter = { userId, revokedAt: null };
  if (excludeSessionId) {
    filter._id = { $ne: excludeSessionId };
  }
  
  await RefreshSession.updateMany(
    filter,
    { revokedAt: new Date(), revokedReason: reason }
  );
  
  // Optionally increment token version for total invalidation
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};
