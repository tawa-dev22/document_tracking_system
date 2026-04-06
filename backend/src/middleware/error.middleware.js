import { env } from '../config/env.js';
import { ZodError } from 'zod';

export function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(error, _req, res, _next) {
  if (env.nodeEnv === 'production') {
    console.error('[error]', error?.message || 'Unknown error');
  } else {
    console.error(error);
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  const statusCode = error.statusCode || 500;
  const safeMessage = statusCode >= 500 && env.nodeEnv === 'production'
    ? 'Internal server error'
    : (error.message || 'Internal server error');
  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    errors: error.errors || []
  });
}
