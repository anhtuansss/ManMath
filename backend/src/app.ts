import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { CORS_ORIGINS } from './config/env';
import { authRouter } from './routes/authRoutes';
import { examRouter } from './routes/examRoutes';
import { meRouter } from './routes/meRoutes';

/** Creates the HTTP app without opening a port, so it is usable by tests. */
export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: CORS_ORIGINS.length === 0 ? true : CORS_ORIGINS }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api', examRouter);

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      (error as { type?: unknown }).type === 'entity.too.large'
    ) {
      res.status(413).json({ message: 'Request body is too large' });
      return;
    }
    next(error);
  });

  return app;
}
