import dotenv from 'dotenv';
dotenv.config();

function required(name, fallback = '') {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function parseDurationToMs(duration, fallbackMs) {
  if (!duration) return fallbackMs;
  const value = String(duration).trim();
  const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(value);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return amount * multipliers[unit];
}

export function parseTrustProxy() {
  const v = process.env.TRUST_PROXY;
  if (v === undefined || v === '') return false;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  return false;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: required('CLIENT_URL'),
  mongodbUri: required('MONGODB_URI'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  cookieSecure: parseBoolean(process.env.COOKIE_SECURE, false),
  /** Set when behind nginx / a load balancer so req.ip and rate limits use X-Forwarded-For. */
  trustProxy: parseTrustProxy(),
  /** Requests per window per client IP (raise behind shared NAT, e.g. ministry office). */
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 2000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  mongodbMaxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 50),
  /** Optional: enables Socket.IO across multiple Node processes (use with load balancer). */
  redisUrl: process.env.REDIS_URL || '',
  refreshTokenTtlMs: parseDurationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d', 7 * 24 * 60 * 60 * 1000),
  accessTokenTtlMs: parseDurationToMs(process.env.ACCESS_TOKEN_EXPIRES_IN || '15m', 15 * 60 * 1000),
  smtp: {
    from: process.env.SMTP_FROM || 'no-reply@example.gov.zw',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  captcha: {
    secret: process.env.CAPTCHA_SECRET || '',
    siteKey: process.env.CAPTCHA_SITE_KEY || '',
    enabled: parseBoolean(process.env.ENABLE_CAPTCHA, false)
  },
  security: {
    maxOtpAttempts: Number(process.env.MAX_OTP_ATTEMPTS || 5),
    otpCooldownSeconds: Number(process.env.OTP_COOLDOWN_SECONDS || 60),
    maxFailedLoginsBeforeCaptcha: Number(process.env.MAX_FAILED_LOGINS_BEFORE_CAPTCHA || 3)
  },
  adminSeed: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  }
};
