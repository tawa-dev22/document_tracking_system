import crypto from 'crypto';
import { env } from '../config/env.js';

export function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateOtp(length = 6) {
  return Array.from({ length }, () => crypto.randomInt(0, 10)).join('');
}

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
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

export function setCsrfCookie(res, token) {
  res.cookie(env.csrfCookieName, token, {
    httpOnly: false, // Accessible by frontend for double-submit
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearCsrfCookie(res) {
  res.clearCookie(env.csrfCookieName, {
    httpOnly: false,
    sameSite: 'lax',
    secure: env.cookieSecure,
    path: '/'
  });
}
