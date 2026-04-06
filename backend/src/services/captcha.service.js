import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Verifies a CAPTCHA / Turnstile token with the provider's API.
 * Currently configured for Cloudflare Turnstile but works with reCAPTCHA v2/v3 compatible endpoints.
 * @param {string} token - The client-side token (cf-turnstile-response)
 * @param {string} ip - The remote client IP for risk analysis
 */
export async function verifyCaptcha(token, ip) {
  if (!env.captcha.enabled) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      new URLSearchParams({
        secret: env.captcha.secret,
        response: token,
        remoteip: ip
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );

    return !!response.data.success;
  } catch (error) {
    console.error('[security] captcha verification error:', error.message);
    return env.nodeEnv !== 'production';
  }
}
