import crypto from 'crypto';
import { env } from '../config/env.js';

export function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateOtp(length = 6) {
  return Array.from({ length }, () => crypto.randomInt(0, 10)).join('');
}


export function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/v1/auth/refresh' // Specific path for rotation
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.cookieSecure,
    path: '/api/v1/auth/refresh'
  });
}

