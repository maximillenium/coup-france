import express from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import apiRouter from './src/server/routes.ts';
import { validateEnvironment, parseTrustProxyHops } from './src/server/auth.ts';

async function startServer() {
  // Fail fast if required environment variables (such as JWT_SECRET) are missing or insecure
  validateEnvironment();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security: Remove Express fingerprint
  app.disable('x-powered-by');

  // Trust configured reverse proxy hops (Nginx / Docker ingress)
  // Allows accurate client IP resolution without exposing to arbitrary client header forgery
  const proxyHops = parseTrustProxyHops(process.env.TRUST_PROXY_HOPS);
  app.set('trust proxy', proxyHops);

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // Serve uploaded media files with strict content-type
  app.use(
    '/uploads',
    express.static(path.resolve(process.cwd(), 'data', 'uploads'), {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  // Mount API routes
  app.use(apiRouter);

  // In development, attach Vite development server middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built client assets
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CoupFranc server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
