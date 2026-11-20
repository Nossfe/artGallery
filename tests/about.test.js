import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
import request from 'supertest';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const db = require('../server/config/db');
const { migrate } = require('../server/db/migrate');
const { createApp } = require('../server/app');

const EMAIL = 'admin@ejemplo.test';
const PASSWORD = 'contraseña-de-prueba-123';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function createFakeImages() {
  const state = { uploads: [], destroyed: [], seq: 0 };
  return {
    state,
    async upload() {
      const publicId = `galeria/artista-${++state.seq}`;
      state.uploads.push(publicId);
      return { publicId, url: `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${publicId}.png` };
    },
    async destroy(publicId) {
      state.destroyed.push(publicId);
    },
  };
}

let images;
let app;
let admin;

beforeAll(async () => {
  migrate();
  const hash = await bcrypt.hash(PASSWORD, 4);
  db.prepare('INSERT INTO admin (email, password_hash) VALUES (?, ?)').run(EMAIL, hash);
});

beforeEach(async () => {
  db.prepare('DELETE FROM settings').run();
  db.prepare('DELETE FROM artworks').run();
  images = createFakeImages();
  app = createApp({ loginMaxAttempts: 1000, imageService: images });
  admin = request.agent(app);
  await admin.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
});

describe('GET /api/about', () => {
  it('es público y devuelve los valores por defecto (con respaldo de WHATSAPP_NUMBER)', async () => {
    const res = await request(app).get('/api/about');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      nombre: '',
      biografia: '',
      foto_url: null,
      foto_thumb_url: null,
      whatsapp: '573001234567',
      whatsapp_url: 'https://wa.me/573001234567',
      email: '',
      ubicacion: '',
      instagram: '',
      facebook: '',
      tiktok: '',
    });
  });
});

describe('PUT /api/about', () => {
  it('devuelve 401 sin sesión', async () => {
    const res = await request(app).put('/api/about').send({ nombre: 'María' });
    expect(res.status).toBe(401);
  });

  it('guarda texto, contacto y foto en Cloudinary y los refleja en GET /api/about', async () => {
    const put = await admin
      .put('/api/about')
      .field('nombre', 'Elena Rojas')
      .field('biografia', 'Pintora colombiana.\n\nTrabajo principalmente en óleo.')
      .field('whatsapp', '+57 311 222 3344')
      .field('email', 'elena@ejemplo.com')
      .field('ubicacion', 'Medellín, Colombia')
      .field('instagram', 'https://instagram.com/elenarojas')
      .field('facebook', 'https://facebook.com/elenarojas')
      .field('tiktok', 'https://tiktok.com/@elenarojas')
      .attach('foto', PNG, { filename: 'elena.png', contentType: 'image/png' });

    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({
      nombre: 'Elena Rojas',
      biografia: 'Pintora colombiana.\n\nTrabajo principalmente en óleo.',
      whatsapp: '573112223344',
      whatsapp_url: 'https://wa.me/573112223344',
      email: 'elena@ejemplo.com',
      ubicacion: 'Medellín, Colombia',
      instagram: 'https://instagram.com/elenarojas',
      facebook: 'https://facebook.com/elenarojas',
      tiktok: 'https://tiktok.com/@elenarojas',
    });
    expect(put.body.data.foto_url).toContain('galeria/artista-1');
    expect(put.body.data.foto_thumb_url).toContain('c_limit,w_600');

    const get = await request(app).get('/api/about');
    expect(get.status).toBe(200);
    expect(get.body.data).toEqual(put.body.data);
  });

  it('al reemplazar la foto borra la anterior en Cloudinary', async () => {
    await admin.put('/api/about').field('nombre', 'Elena').attach('foto', PNG, { filename: '1.png', contentType: 'image/png' });
    const res = await admin.put('/api/about').field('nombre', 'Elena').attach('foto', PNG, { filename: '2.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data.foto_url).toContain('galeria/artista-2');
    expect(images.state.destroyed).toEqual(['galeria/artista-1']);
  });

  it('permite eliminar la foto actual y la borra en Cloudinary', async () => {
    await admin.put('/api/about').field('nombre', 'Elena').attach('foto', PNG, { filename: '1.png', contentType: 'image/png' });
    const res = await admin.put('/api/about').send({ nombre: 'Elena', eliminar_foto: true });

    expect(res.status).toBe(200);
    expect(res.body.data.foto_url).toBeNull();
    expect(images.state.destroyed).toEqual(['galeria/artista-1']);
  });

  it('valida correo, URLs peligrosas y WhatsApp', async () => {
    const r1 = await admin.put('/api/about').send({ email: 'no-es-correo' });
    expect(r1.status).toBe(400);

    const r2 = await admin.put('/api/about').send({ instagram: 'javascript:alert(1)' });
    expect(r2.status).toBe(400);

    const r3 = await admin.put('/api/about').send({ whatsapp: '123' });
    expect(r3.status).toBe(400);

    const r4 = await admin.put('/api/about').send({ facebook: 'no-es-url' });
    expect(r4.status).toBe(400);
  });

  it('cambiar el número de WhatsApp actualiza los enlaces de compra de las obras', async () => {
    const obra = await admin
      .post('/api/artworks')
      .field('nombre', 'Paisaje')
      .field('precio', '1200000')
      .attach('imagen', PNG, { filename: 'obra.png', contentType: 'image/png' });
    expect(obra.status).toBe(201);
    expect(new URL(obra.body.data.whatsapp_url).pathname).toBe('/573001234567');

    const upd = await admin.put('/api/about').send({ whatsapp: '573209876543' });
    expect(upd.status).toBe(200);

    const lista = await request(app).get('/api/artworks');
    expect(new URL(lista.body.data[0].whatsapp_url).pathname).toBe('/573209876543');

    const detalle = await request(app).get(`/api/artworks/${obra.body.data.id}`);
    expect(new URL(detalle.body.data.whatsapp_url).pathname).toBe('/573209876543');
  });
});
