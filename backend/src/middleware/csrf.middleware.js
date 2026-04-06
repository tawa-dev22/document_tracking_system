import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function requireCsrf(req, _res, next) {
  // CSRF protection is temporarily disabled.
  return next();

  /* Original implementation:
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  const cookieToken = req.cookies?.[env.csrfCookieName];
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(403, 'Invalid CSRF token'));
  }
  next();
  */
}
