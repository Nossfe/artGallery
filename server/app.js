const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const db = require('./config/db');
const { createAuthRouter } = require('./routes/auth');
const { createArtworksRouter } = require('./routes/artworks');
const { createAboutRouter } = require('./routes/about');
const { cloudinaryImageService } = require('./utils/images');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function assertConfig() {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres (revisa tu .env).');
  }
}

function createApp({ loginMaxAttempts, imageService = cloudinaryImageService, isProduction = env.isProduction } = {}) {
  assertConfig();
  const app = express();
  app.disable('x-powered-by');
  app.set('isProduction', isProduction);

  // Detrás del proxy del hosting (Render, Railway, Nginx...) para que el rate limit y HTTPS vean el origen real.
  if (isProduction) {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
      const host = req.get('host');
      if (req.get('x-forwarded-proto') === 'http' && req.path !== '/api/health' && host && !/[\r\n]/.test(host)) {
        return res.redirect(301, `https://${host}${req.originalUrl}`);
      }
      return next();
    });
  }

  app.use(
    helmet({
      strictTransportSecurity: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'style-src': ["'self'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
          // En desarrollo (http) no se fuerza HTTPS
          'upgrade-insecure-requests': isProduction ? [] : null,
        },
      },
    }),
  );

  // CORS restringido: solo los orígenes de CORS_ORIGIN (por defecto, ninguno: mismo origen).
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    let dbOk = true;
    try {
      db.prepare('SELECT 1').get();
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'error', db: dbOk, env: env.nodeEnv });
  });

  app.use('/api/auth', createAuthRouter({ loginMaxAttempts }));
  app.use('/api/artworks', createArtworksRouter(imageService));
  app.use('/api/about', createAboutRouter(imageService));
  app.use('/api', notFound);

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
