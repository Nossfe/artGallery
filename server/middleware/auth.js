const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const COOKIE_NAME = 'token';

function verifyToken(token) {
  return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
}

// Protege rutas: 401 si no hay sesión válida.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión.' });
  }
  try {
    const payload = verifyToken(token);
    req.admin = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
  }
}

module.exports = { requireAuth, COOKIE_NAME };
