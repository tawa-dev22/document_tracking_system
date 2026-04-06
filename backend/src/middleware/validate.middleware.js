import { ApiError } from '../utils/ApiError.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ApiError(
          400,
          'Validation failed',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        )
      );
    }
    req.body = result.data;
    next();
  };
}
