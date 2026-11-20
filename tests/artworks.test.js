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

// PNG mínimo válido (1x1)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// Cloudinary simulado
function createFakeImages() {
  const state = { uploads: [], destroyed: [], failDestroy: false, failUpload: false, seq: 0 };
  return {
    state,
    async upload() {
      if (state.failUpload) throw new Error('fallo de subida');
      const publicId = `galeria/fake-${++state.seq}`;
      state.uploads.push(publicId);
      return { publicId, url: `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${publicId}.png` };
    },
    async destroy(publicId) {
      if (state.failDestroy) throw new Error('fallo de Cloudinary');
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
  db.prepare('DELETE FROM artworks').run();
  images = createFakeImages();
  app = createApp({ loginMaxAttempts: 1000, imageService: images });
  admin = request.agent(app);
  await admin.post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
});

const crear = (campos = {}, { agente = admin, imagen = PNG, filename = 'obra.png', contentType = 'image/png' } = {}) => {
  const base = { nombre: 'Atardecer', precio: '1500000', ancho_cm: '60', alto_cm: '40', estilo_tecnica: 'Óleo sobre lienzo', ...campos };
  let req = agente.post('/api/artworks');
  Object.entries(base).forEach(([k, v]) => {
    if (v !== undefined) req = req.field(k, v);
  });
  if (imagen) req = req.attach('imagen', imagen, { filename, contentType });
  return req;
};

describe('Autenticación en rutas de escritura', () => {
  it('devuelve 401 sin sesión en POST, PUT, PATCH y DELETE', async () => {
    const anon = request(app);
    expect((await anon.post('/api/artworks').field('nombre', 'x')).status).toBe(401);
    expect((await anon.put('/api/artworks/1').send({})).status).toBe(401);
    expect((await anon.patch('/api/artworks/1/sold').send({ vendida: true })).status).toBe(401);
    expect((await anon.delete('/api/artworks/1')).status).toBe(401);
    expect(images.state.uploads).toHaveLength(0);
  });

  it('las lecturas son públicas', async () => {
    expect((await request(app).get('/api/artworks')).status).toBe(200);
  });
});

describe('POST /api/artworks', () => {
  it('crea una obra con imagen y devuelve URL optimizada y miniatura', async () => {
    const res = await crear();
    expect(res.status).toBe(201);
    const o = res.body.data;
    expect(o).toMatchObject({ nombre: 'Atardecer', precio: 1500000, ancho_cm: 60, alto_cm: 40, vendida: false });
    expect(o.imagen_public_id).toBe('galeria/fake-1');
    expect(o.imagen_url).toContain('f_auto,q_auto');
    expect(o.imagen_thumb_url).toContain('c_limit,w_600');
    expect(o.profundidad_cm).toBeNull();
  });

  it('exige imagen', async () => {
    const res = await crear({}, { imagen: null });
    expect(res.status).toBe(400);
  });

  it.each([
    ['nombre vacío', { nombre: '' }],
    ['precio cero', { precio: '0' }],
    ['precio negativo', { precio: '-5' }],
    ['precio decimal', { precio: '100.5' }],
    ['precio no numérico', { precio: 'abc' }],
    ['ancho no numérico', { ancho_cm: 'ancho' }],
    ['alto negativo', { alto_cm: '-3' }],
  ])('rechaza %s con 400 y no sube la imagen', async (_n, campos) => {
    const res = await crear(campos);
    expect(res.status).toBe(400);
    expect(res.body.detalles?.length).toBeGreaterThan(0);
    expect(images.state.uploads).toHaveLength(0);
  });

  it('rechaza formatos no permitidos', async () => {
    const res = await crear({}, { imagen: Buffer.from('GIF89a....'), filename: 'a.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
  });

  it('rechaza un archivo con mimetype falso (firma inválida)', async () => {
    const res = await crear({}, { imagen: Buffer.from('esto no es una imagen, solo texto'), filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(images.state.uploads).toHaveLength(0);
  });

  it('rechaza imágenes de más de 8 MB con 413', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(8 * 1024 * 1024 + 1024)]);
    const res = await crear({}, { imagen: grande });
    expect(res.status).toBe(413);
  });

  it('borra la imagen subida si falla el guardado en la base de datos', async () => {
    // Fuerza fallo de INSERT: nombre válido pero se elimina la tabla temporalmente
    db.exec('ALTER TABLE artworks RENAME TO artworks_tmp');
    try {
      const res = await crear();
      expect(res.status).toBe(500);
    } finally {
      db.exec('ALTER TABLE artworks_tmp RENAME TO artworks');
    }
    expect(images.state.destroyed).toEqual(images.state.uploads);
    expect(images.state.uploads).toHaveLength(1);
  });

  it('responde 500 genérico si Cloudinary falla al subir', async () => {
    images.state.failUpload = true;
    const res = await crear();
    expect(res.status).toBe(500);
    expect(db.prepare('SELECT COUNT(*) c FROM artworks').get().c).toBe(0);
  });
});

describe('GET /api/artworks', () => {
  beforeEach(async () => {
    await crear({ nombre: 'Mar en calma', estilo_tecnica: 'Acuarela' });
    await crear({ nombre: 'Bosque', estilo_tecnica: 'Óleo sobre lienzo', descripcion: 'Verde profundo' });
    const vendida = await crear({ nombre: 'Luna 100%', estilo_tecnica: 'Acrílico' });
    await admin.patch(`/api/artworks/${vendida.body.data.id}/sold`).send({ vendida: true });
  });

  it('lista con paginación', async () => {
    const res = await request(app).get('/api/artworks?limit=2&page=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('ordena de más reciente a más antigua', async () => {
    const res = await request(app).get('/api/artworks');
    expect(res.body.data.map((o) => o.nombre)).toEqual(['Luna 100%', 'Bosque', 'Mar en calma']);
  });

  it('busca por nombre, descripción y estilo', async () => {
    const porNombre = await request(app).get('/api/artworks?q=mar');
    expect(porNombre.body.data.map((o) => o.nombre)).toEqual(['Mar en calma']);
    const porDesc = await request(app).get('/api/artworks?q=profundo');
    expect(porDesc.body.data.map((o) => o.nombre)).toEqual(['Bosque']);
    const porEstilo = await request(app).get('/api/artworks?q=acuarela');
    expect(porEstilo.body.data).toHaveLength(1);
  });

  it('trata los comodines de LIKE de forma literal', async () => {
    const res = await request(app).get('/api/artworks?q=' + encodeURIComponent('%'));
    expect(res.body.data.map((o) => o.nombre)).toEqual(['Luna 100%']);
  });

  it('filtra por disponibilidad y estilo', async () => {
    const vendidas = await request(app).get('/api/artworks?vendida=true');
    expect(vendidas.body.data.map((o) => o.nombre)).toEqual(['Luna 100%']);
    const disp = await request(app).get('/api/artworks?vendida=false');
    expect(disp.body.pagination.total).toBe(2);
    const estilo = await request(app).get('/api/artworks?estilo=' + encodeURIComponent('Óleo sobre lienzo'));
    expect(estilo.body.data.map((o) => o.nombre)).toEqual(['Bosque']);
  });

  it('usa valores por defecto con parámetros inválidos', async () => {
    const res = await request(app).get('/api/artworks?page=-4&limit=abc&vendida=quizas');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 12, total: 3 });
  });

  it('GET /:id devuelve la obra o 404', async () => {
    const lista = await request(app).get('/api/artworks');
    const id = lista.body.data[0].id;
    expect((await request(app).get(`/api/artworks/${id}`)).body.data.id).toBe(id);
    expect((await request(app).get('/api/artworks/99999')).status).toBe(404);
    expect((await request(app).get('/api/artworks/abc')).status).toBe(404);
  });
});

describe('PUT /api/artworks/:id', () => {
  it('actualiza datos sin imagen y conserva la foto', async () => {
    const { body } = await crear();
    const id = body.data.id;
    const res = await admin.put(`/api/artworks/${id}`).send({ nombre: 'Nuevo nombre', precio: 2000000, alto_cm: 50, ancho_cm: '' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nombre: 'Nuevo nombre', precio: 2000000, alto_cm: 50, ancho_cm: null });
    expect(res.body.data.imagen_public_id).toBe('galeria/fake-1');
    expect(images.state.destroyed).toHaveLength(0);
  });

  it('al reemplazar la foto borra la anterior en Cloudinary', async () => {
    const { body } = await crear();
    const res = await admin
      .put(`/api/artworks/${body.data.id}`)
      .field('nombre', 'Atardecer')
      .field('precio', '1500000')
      .attach('imagen', PNG, { filename: 'n.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.imagen_public_id).toBe('galeria/fake-2');
    expect(images.state.destroyed).toEqual(['galeria/fake-1']);
  });

  it('valida los datos y no sube ni borra nada si son inválidos', async () => {
    const { body } = await crear();
    const res = await admin.put(`/api/artworks/${body.data.id}`).send({ nombre: 'x', precio: 0 });
    expect(res.status).toBe(400);
    expect(images.state.uploads).toHaveLength(1);
    expect(images.state.destroyed).toHaveLength(0);
  });

  it('devuelve 404 si la obra no existe', async () => {
    expect((await admin.put('/api/artworks/9999').send({ nombre: 'x', precio: 10 })).status).toBe(404);
  });
});

describe('PATCH /api/artworks/:id/sold', () => {
  it('marca como vendida y como disponible', async () => {
    const { body } = await crear();
    const id = body.data.id;
    const a = await admin.patch(`/api/artworks/${id}/sold`).send({ vendida: true });
    expect(a.status).toBe(200);
    expect(a.body.data.vendida).toBe(true);
    const b = await admin.patch(`/api/artworks/${id}/sold`).send({ vendida: false });
    expect(b.body.data.vendida).toBe(false);
  });

  it('valida el cuerpo y la existencia', async () => {
    const { body } = await crear();
    expect((await admin.patch(`/api/artworks/${body.data.id}/sold`).send({ vendida: 'tal vez' })).status).toBe(400);
    expect((await admin.patch(`/api/artworks/${body.data.id}/sold`).send({})).status).toBe(400);
    expect((await admin.patch('/api/artworks/9999/sold').send({ vendida: true })).status).toBe(404);
  });
});

describe('DELETE /api/artworks/:id', () => {
  it('elimina la obra y su imagen en Cloudinary', async () => {
    const { body } = await crear();
    const res = await admin.delete(`/api/artworks/${body.data.id}`);
    expect(res.status).toBe(204);
    expect(images.state.destroyed).toEqual(['galeria/fake-1']);
    expect((await request(app).get(`/api/artworks/${body.data.id}`)).status).toBe(404);
  });

  it('conserva la obra si Cloudinary falla (502) para poder reintentar', async () => {
    const { body } = await crear();
    images.state.failDestroy = true;
    const res = await admin.delete(`/api/artworks/${body.data.id}`);
    expect(res.status).toBe(502);
    expect((await request(app).get(`/api/artworks/${body.data.id}`)).status).toBe(200);
  });

  it('devuelve 404 si no existe', async () => {
    expect((await admin.delete('/api/artworks/9999')).status).toBe(404);
  });
});

describe('Seguridad', () => {
  it('no permite inyección SQL en la búsqueda', async () => {
    await crear();
    const res = await request(app).get('/api/artworks?q=' + encodeURIComponent("'; DROP TABLE artworks; --"));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(db.prepare('SELECT COUNT(*) c FROM artworks').get().c).toBe(1);
  });
});
