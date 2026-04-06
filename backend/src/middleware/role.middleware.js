import { ApiError } from '../utils/ApiError.js';

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden'));
    }
    next();
  };
}
