import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';
import { verifyCaptcha } from '../services/captcha.service.js';
import { env } from '../config/env.js';

/**
 * Enhanced Rate Limiter Factory
 * Production-ready: trust-proxy support, standard headers, and customizable logic
 */
const createLimiter = (windowMs, max, message, options = {}) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    handler: (req, res, next) => {
      // In a production environment behind a proxy, req.ip will hold the real client IP 
      // if 'trust proxy' is configured in Express. 
      console.warn(`[SECURITY] Rate Limit Exceeded for IP: ${req.ip} on ${req.originalUrl}`);
      next(new ApiError(429, message));
    },
    ...options
  });
};

/**
 * CAPTCHA Validation Middleware
 * Injects a verification check for the 'captchaToken' body field.
 */
export const validateCaptcha = async (req, _res, next) => {
  // If globally disabled, skip verification
  if (!env.captcha.enabled) return next();

  const token = req.body.captchaToken;
  const isVerified = await verifyCaptcha(token, req.ip);

  if (!isVerified) {
    return next(new ApiError(403, 'Anti-bot verification failed. Please try the CAPTCHA again.'));
  }

  next();
};

/**
 * AUTH LIMITER - Brute-force protection for login
 * 10 attempts per 15 minutes.
 */
export const authLimiter = createLimiter(
  15 * 60 * 1000, 
  10, 
  'Too many login attempts. Please try again after 15 minutes.'
);

/**
 * SIGNUP LIMITER - Production-safe registration throttling
 * 10 accounts per hour (Soft limit). 
 * This is high enough for shared institutions but prevents large-scale automated spam.
 */
export const registerLimiter = createLimiter(
  60 * 60 * 1000, 
  10, 
  'Signup limit exceeded for this network. Please try again in an hour.'
);

/**
 * OTP VERIFICATION LIMITER - Brute-force protection for guessing 6-digit codes
 * 5 attempts per 10 minutes. 
 */
export const verifyLimiter = createLimiter(
  10 * 60 * 1000, 
  5, 
  'Too many verification attempts. This session is temporarily locked for safety.'
);

/**
 * OTP RESEND LIMITER - Anti-spam for email/SMS triggers
 */
export const resendLimiter = createLimiter(
  1 * 60 * 1000, 
  2, 
  'Please wait 60 seconds before requesting a new OTP.'
);

/**
 * PASSWORD RESET REQUEST LIMITER
 */
export const resetRequestLimiter = createLimiter(
  30 * 60 * 1000, 
  3, 
  'Too many password reset requests. Please check your email or try again later.'
);
