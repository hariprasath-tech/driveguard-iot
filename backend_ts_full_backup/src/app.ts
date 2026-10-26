import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { swaggerDocument } from './docs/swagger';

import authRouter from './routes/auth';
import historyRouter from './routes/history';
import settingsRouter from './routes/settings';
import usersRouter from './routes/users';
import pushRouter from './routes/push';
import healthRouter from './routes/health';
import { createTelemetryRouter } from './routes/telemetry';
import { createAlertsRouter } from './routes/alerts';
import { AlertEngine } from './alerts/engine';
import { DriveGuardWebSocketServer } from './ws/server';

export function createApp(alertEngine?: AlertEngine, wsServer?: DriveGuardWebSocketServer) {
  const app = express();

  // Security middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false // Allow Swagger UI inline scripts & styles
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, postman)
        if (!origin || config.CORS_ORIGINS.includes(origin) || config.CORS_ORIGINS.includes('*')) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for local dev
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(globalLimiter);

  // Swagger Documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  const engine = alertEngine || new AlertEngine();

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api', createTelemetryRouter(engine, wsServer));
  app.use('/api', createAlertsRouter(wsServer));
  app.use('/api', historyRouter);
  app.use('/api', settingsRouter);
  app.use('/api', usersRouter);
  app.use('/api', pushRouter);
  app.use('/api', healthRouter);

  // Error handling
  app.use(errorHandler);

  return { app, alertEngine: engine };
}
