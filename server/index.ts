import 'dotenv/config';
import crypto from 'node:crypto';
import express, { type Express } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CSP_FRAME_ANCESTORS,
  DEFAULT_PORT,
  JSON_BODY_LIMIT,
  MIN_HMAC_SECRET_LENGTH,
  STORE_DEBOUNCE_MS,
} from '../shared/config.ts';
import { ChatSessionStore } from '../shared/security.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { createGeneralApiRateLimiter } from './middleware/rateLimit.ts';
import { requestIdMiddleware } from './middleware/requestId.ts';
import { createChatRouter } from './routes/chat.ts';
import { createStudentsRouter } from './routes/students.ts';
import { createTeacherRouter } from './routes/teacher.ts';
import { PersistentShikshaStore, resolveDefaultStorePath } from './services/store.ts';

/**
 * Resolves the HMAC secret used to sign chat session identifiers, falling back
 * to a cryptographically secure per-process key when unset or too short.
 *
 * @returns Secret string with at least 16 characters of entropy.
 */
export function resolveSessionHmacSecret(): string {
  const configured = process.env.SESSION_HMAC_SECRET?.trim();
  if (configured && configured.length >= MIN_HMAC_SECRET_LENGTH) {
    return configured;
  }
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates and configures the Shiksha-Agent Express application with security
 * headers, JSON limits, rate limiters, API routes, and central error handling.
 *
 * @param params Store manager, session store, and environment flag.
 * @returns Configured {@link Express} app instance (without Vite/static mounting).
 */
export function createApp(params: {
  storeManager: PersistentShikshaStore;
  sessionStore: ChatSessionStore;
  isProd: boolean;
}): Express {
  const { storeManager, sessionStore, isProd } = params;
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestIdMiddleware);

  app.use(
    helmet({
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isProd
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: [...CSP_FRAME_ANCESTORS],
          upgradeInsecureRequests: isProd ? [] : null,
        },
      },
    })
  );

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use('/api', createGeneralApiRateLimiter());

  app.use('/api', createStudentsRouter(storeManager, sessionStore));
  app.use('/api', createTeacherRouter(storeManager));
  app.use('/api', createChatRouter(storeManager, sessionStore));

  app.use(errorHandler);
  return app;
}

/**
 * Bootstraps the persistent store, Express server, dev/prod frontend assets,
 * and graceful shutdown handlers.
 */
export async function startServer(): Promise<void> {
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const isProd = process.env.NODE_ENV === 'production';

  const storeManager = new PersistentShikshaStore(
    resolveDefaultStorePath(),
    STORE_DEBOUNCE_MS
  );
  await storeManager.init();

  const sessionStore = new ChatSessionStore(resolveSessionHmacSecret());
  const app = createApp({ storeManager, sessionStore, isProd });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Shiksha-Agent server running at http://localhost:${port}`);
  });

  const handleShutdown = async () => {
    await storeManager.flush();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', () => {
    void handleShutdown();
  });
  process.once('SIGTERM', () => {
    void handleShutdown();
  });
}

const isDirectEntry =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectEntry) {
  void startServer();
}
