const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { loginSchema, login, logout, me } = require('../controllers/authController');

function createAuthRouter({ loginMaxAttempts = 10 } = {}) {
  const router = express.Router();

  // Limita los intentos de login para frenar la fuerza bruta.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: loginMaxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
  });

  router.post('/login', loginLimiter, validateBody(loginSchema), login);
  router.post('/logout', logout);
  router.get('/me', requireAuth, me);

  return router;
}

module.exports = { createAuthRouter };
