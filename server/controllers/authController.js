const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../config/db');
const { jwtSecret, jwtExpiresIn, isProduction } = require('../config/env');
const { COOKIE_NAME } = require('../middleware/auth');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

// Hash falso para igualar el tiempo de respuesta cuando el correo no existe.
const DUMMY_HASH = bcrypt.hashSync('contraseña-inexistente', 12);

function cookieOptions(maxAgeMs, secure = isProduction) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const admin = db.prepare('SELECT id, email, password_hash FROM admin WHERE email = ?').get(email);
    const ok = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);

    if (!admin || !ok) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const token = jwt.sign({ email: admin.email }, jwtSecret, {
      algorithm: 'HS256',
      subject: String(admin.id),
      expiresIn: jwtExpiresIn,
    });
    const { exp } = jwt.decode(token);
    const secure = req.app.get('isProduction') ?? isProduction;
    res.cookie(COOKIE_NAME, token, cookieOptions(exp * 1000 - Date.now(), secure));
    return res.json({ admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    return next(err);
  }
}

function logout(req, res) {
  const secure = req.app.get('isProduction') ?? isProduction;
  res.clearCookie(COOKIE_NAME, cookieOptions(undefined, secure));
  res.json({ ok: true });
}

function me(req, res) {
  res.json({ admin: req.admin });
}

module.exports = { loginSchema, login, logout, me };
