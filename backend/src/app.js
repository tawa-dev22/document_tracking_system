import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { requireCsrf } from './middleware/csrf.middleware.js';

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', env.trustProxy);
  }

  app.use((req, _res, next) => {
    req.io = req.app.get('io');
    next();
  });

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/health' || req.path === '/health'
    })
  );
  app.use('/api/v1', requireCsrf);

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Server is healthy',
      environment: env.nodeEnv
    });
  });

  app.use('/api/v1', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
