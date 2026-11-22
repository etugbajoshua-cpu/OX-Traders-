import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, closeDatabase, getDatabaseDiagnostics } from './server/db.ts';
import apiRoutes, { initAuthSecret } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.set('trust proxy', 1);

  // Initialize Turso Cloud SQLite, External PostgreSQL, or Local SQLite
  await initDatabase();
  await initAuthSecret();

  // Middleware
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // Mount API endpoints
  app.use('/api', apiRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    const diag = getDatabaseDiagnostics();
    res.json({
      status: 'healthy',
      platform: 'OX TRADERS',
      domain: 'oxtraders.online',
      database: diag.engine,
      database_label: diag.label,
      persistent: diag.persistent,
      timestamp: new Date().toISOString()
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[OX TRADERS] Vite dev middleware mounted');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OX TRADERS] Server running at http://0.0.0.0:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[OX TRADERS] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    setTimeout(async () => {
      await closeDatabase();
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[OX TRADERS] Failed to start server:', err);
  process.exit(1);
});
