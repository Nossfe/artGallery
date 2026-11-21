import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = require('../server/config/db');
const { migrate } = require('../server/db/migrate');
const { createApp } = require('../server/app');
const { backupDatabase } = require('../server/db/backup');

const EMAIL = 'admin-prod@ejemplo.test';
const PASSWORD = 'contraseña-produccion-123';

let prodApp;
const tempDirs = [];

beforeAll(async () => {
  migrate();
  const hash = await bcrypt.hash(PASSWORD, 4);
  db.prepare('INSERT OR IGNORE INTO admin (email, password_hash) VALUES (?, ?)').run(EMAIL, hash);
  prodApp = createApp({ loginMaxAttempts: 1000, isProduction: true });
});

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('Configuración de producción', () => {
  it('activa trust proxy, HSTS y upgrade-insecure-requests en CSP', async () => {
    expect(prodApp.get('trust proxy')).toBe(1);
    const res = await request(prodApp).get('/api/health').set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toMatch(/max-age=15552000/);
    expect(res.headers['content-security-policy']).toContain('upgrade-insecure-requests');
  });

  it('redirige tráfico HTTP (detrás de proxy) a HTTPS con 301', async () => {
    const res = await request(prodApp)
      .get('/acerca.html?ref=1')
      .set('Host', 'mi-galeria.example')
      .set('X-Forwarded-Proto', 'http');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://mi-galeria.example/acerca.html?ref=1');
  });

  it('no redirige /api/health para no romper health checks internos por HTTP', async () => {
    const res = await request(prodApp).get('/api/health').set('X-Forwarded-Proto', 'http');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('emite cookies de login y logout con el atributo Secure en producción', async () => {
    const login = await request(prodApp)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    const cookie = login.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Secure/i);

    const logout = await request(prodApp).post('/api/auth/logout').set('X-Forwarded-Proto', 'https');
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie'][0]).toMatch(/Secure/i);
  });
});

describe('Respaldo de SQLite (backupDatabase)', () => {
  it('crea una copia íntegra de la base de datos y rota respaldos antiguos', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artgallery-bkp-'));
    tempDirs.push(dir);

    const r1 = await backupDatabase({ database: db, backupDir: dir, keep: 2, filename: 'gallery-2026-01-01.db' });
    const r2 = await backupDatabase({ database: db, backupDir: dir, keep: 2, filename: 'gallery-2026-01-02.db' });
    const r3 = await backupDatabase({ database: db, backupDir: dir, keep: 2, filename: 'gallery-2026-01-03.db' });

    expect(r1.kept).toBe(1);
    expect(r2.kept).toBe(2);
    expect(r3.kept).toBe(2);
    expect(r3.removed).toEqual(['gallery-2026-01-01.db']);

    // Verifica que el respaldo es un archivo SQLite legible con los mismos datos
    const copia = new Database(r3.target, { readonly: true });
    try {
      const adminRow = copia.prepare('SELECT email FROM admin WHERE email = ?').get(EMAIL);
      expect(adminRow?.email).toBe(EMAIL);
    } finally {
      copia.close();
    }
  });
});
