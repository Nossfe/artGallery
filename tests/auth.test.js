import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import request from 'supertest';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('../server/config/db');
const { migrate } = require('../server/db/migrate');
const { createApp } = require('../server/app');
const { requireAuth } = require('../server/middleware/auth');

const EMAIL = 'admin@ejemplo.test';
const PASSWORD = 'contraseña-de-prueba-123';

let app;

beforeAll(async () => {
  migrate();
  const hash = await bcrypt.hash(PASSWORD, 4);
  db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run(EMAIL, hash);
});

beforeEach(() => {
  app = createApp({ loginMaxAttempts: 1000 });
});

const login = (body = { email: EMAIL, password: PASSWORD }, a = app) =>
  request(a).post('/api/auth/login').send(body);

describe('POST /api/auth/login', () => {
  it('inicia sesión con credenciales correctas y fija una cookie segura', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(EMAIL);
    expect(res.body.admin).not.toHaveProperty('password_hash');

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Max-Age=/i);
    expect(cookie).not.toMatch(/Secure/i); // solo en producción
  });

  it('acepta el correo sin distinguir mayúsculas', async () => {
    const res = await login({ email: EMAIL.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
  });

  it('rechaza contraseña incorrecta con 401', async () => {
    const res = await login({ email: EMAIL, password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rechaza un correo inexistente con el mismo mensaje', async () => {
    const mala = await login({ email: EMAIL, password: 'incorrecta' });
    const noExiste = await login({ email: 'otro@ejemplo.test', password: PASSWORD });
    expect(noExiste.status).toBe(401);
    expect(noExiste.body.error).toBe(mala.body.error);
  });

  it('valida el cuerpo y responde 400', async () => {
    expect((await login({ email: 'no-es-correo', password: 'x' })).status).toBe(400);
    expect((await login({})).status).toBe(400);
  });

  it('aplica rate limiting tras demasiados intentos', async () => {
    const limitada = createApp({ loginMaxAttempts: 3 });
    const estados = [];
    for (let i = 0; i < 5; i++) {
      estados.push((await login({ email: EMAIL, password: 'mala' }, limitada)).status);
    }
    expect(estados.slice(0, 3)).toEqual([401, 401, 401]);
    expect(estados.slice(3)).toEqual([429, 429]);
  });
});

describe('GET /api/auth/me y rutas protegidas', () => {
  it('devuelve 401 sin sesión', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('devuelve el admin con una sesión válida', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(EMAIL);
  });

  it('devuelve 401 con un token manipulado o firmado con otra clave', async () => {
    const falso = jwt.sign({ email: EMAIL }, 'otra-clave', { subject: '1' });
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${falso}`);
    expect(res.status).toBe(401);
  });

  it('devuelve 401 con un token expirado', async () => {
    const expirado = jwt.sign({ email: EMAIL }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${expirado}`);
    expect(res.status).toBe(401);
  });

  it('requireAuth protege cualquier ruta de escritura', async () => {
    const mini = express();
    mini.use(cookieParser());
    mini.post('/recurso', requireAuth, (req, res) => res.status(201).json({ ok: true }));

    expect((await request(mini).post('/recurso')).status).toBe(401);

    const agent = request.agent(app);
    const sesion = await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    const cookie = sesion.headers['set-cookie'][0].split(';')[0];
    expect((await request(mini).post('/recurso').set('Cookie', cookie)).status).toBe(201);
  });
});

describe('POST /api/auth/logout', () => {
  it('borra la cookie y la sesión deja de ser válida', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/token=;/);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('Seguridad HTTP', () => {
  it('incluye cabeceras de helmet y oculta x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CORS solo permite orígenes configurados', async () => {
    const permitido = await request(app).get('/api/health').set('Origin', 'http://origen-permitido.test');
    expect(permitido.headers['access-control-allow-origin']).toBe('http://origen-permitido.test');

    const ajeno = await request(app).get('/api/health').set('Origin', 'http://malo.test');
    expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('responde 404 JSON en rutas /api desconocidas', async () => {
    const res = await request(app).get('/api/nada');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
