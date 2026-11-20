const db = require('../config/db');
const { thumbnailUrl } = require('../utils/images');
const { artworkSchema, soldSchema, listQuerySchema } = require('../utils/artworkSchemas');

const COLUMNS = `id, nombre, precio, ancho_cm, alto_cm, profundidad_cm, estilo_tecnica,
  imagen_url, imagen_public_id, vendida, descripcion, created_at, updated_at`;

function httpError(status, message, detalles) {
  const err = new Error(message);
  err.status = status;
  if (detalles) err.detalles = detalles;
  return err;
}

function toDto(row) {
  return { ...row, vendida: Boolean(row.vendida), imagen_thumb_url: thumbnailUrl(row.imagen_url) };
}

function parseBody(schema, body) {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    throw httpError(
      400,
      'Datos inválidos',
      result.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    );
  }
  return result.data;
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw httpError(404, 'Obra no encontrada');
  return id;
}

function findOrFail(id) {
  const row = db.prepare(`SELECT ${COLUMNS} FROM artworks WHERE id = ?`).get(id);
  if (!row) throw httpError(404, 'Obra no encontrada');
  return row;
}

// Escapa comodines de LIKE para que la búsqueda sea literal.
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function createArtworksController(imageService) {
  // Borrado de imagen "al mejor esfuerzo": no debe romper una operación ya completada.
  async function destroyQuietly(publicId) {
    try {
      await imageService.destroy(publicId);
    } catch (err) {
      console.error(`No se pudo borrar la imagen ${publicId} en Cloudinary:`, err.message);
    }
  }

  return {
    list(req, res) {
      const { page, limit, q, estilo, vendida } = listQuerySchema.parse(req.query);
      const where = [];
      const params = [];
      if (q) {
        const like = `%${likeEscape(q)}%`;
        where.push(`(nombre LIKE ? ESCAPE '\\' OR descripcion LIKE ? ESCAPE '\\' OR estilo_tecnica LIKE ? ESCAPE '\\')`);
        params.push(like, like, like);
      }
      if (estilo) {
        where.push('estilo_tecnica = ?');
        params.push(estilo);
      }
      if (vendida) {
        where.push('vendida = ?');
        params.push(vendida === 'true' ? 1 : 0);
      }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const { total } = db.prepare(`SELECT COUNT(*) AS total FROM artworks ${clause}`).get(...params);
      const rows = db
        .prepare(`SELECT ${COLUMNS} FROM artworks ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
        .all(...params, limit, (page - 1) * limit);

      res.json({
        data: rows.map(toDto),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    },

    get(req, res) {
      res.json({ data: toDto(findOrFail(parseId(req.params.id))) });
    },

    async create(req, res, next) {
      let uploaded = null;
      try {
        const data = parseBody(artworkSchema, req.body);
        if (!req.file) throw httpError(400, 'La imagen de la obra es requerida');

        uploaded = await imageService.upload(req.file.buffer);
        const info = db
          .prepare(
            `INSERT INTO artworks (nombre, precio, ancho_cm, alto_cm, profundidad_cm, estilo_tecnica,
               imagen_url, imagen_public_id, vendida, descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            data.nombre,
            data.precio,
            data.ancho_cm,
            data.alto_cm,
            data.profundidad_cm,
            data.estilo_tecnica,
            uploaded.url,
            uploaded.publicId,
            data.vendida ? 1 : 0,
            data.descripcion,
          );
        res.status(201).json({ data: toDto(findOrFail(info.lastInsertRowid)) });
      } catch (err) {
        if (uploaded) await destroyQuietly(uploaded.publicId); // no dejar imágenes huérfanas
        next(err);
      }
    },

    async update(req, res, next) {
      let uploaded = null;
      try {
        const id = parseId(req.params.id);
        const actual = findOrFail(id);
        const data = parseBody(artworkSchema, req.body);

        if (req.file) uploaded = await imageService.upload(req.file.buffer);

        db.prepare(
          `UPDATE artworks SET nombre = ?, precio = ?, ancho_cm = ?, alto_cm = ?, profundidad_cm = ?,
             estilo_tecnica = ?, descripcion = ?, vendida = ?, imagen_url = ?, imagen_public_id = ?,
             updated_at = datetime('now')
           WHERE id = ?`,
        ).run(
          data.nombre,
          data.precio,
          data.ancho_cm,
          data.alto_cm,
          data.profundidad_cm,
          data.estilo_tecnica,
          data.descripcion,
          data.vendida === undefined ? actual.vendida : data.vendida ? 1 : 0,
          uploaded ? uploaded.url : actual.imagen_url,
          uploaded ? uploaded.publicId : actual.imagen_public_id,
          id,
        );

        // Al reemplazar la foto, se elimina la anterior en Cloudinary.
        if (uploaded && actual.imagen_public_id) await destroyQuietly(actual.imagen_public_id);
        res.json({ data: toDto(findOrFail(id)) });
      } catch (err) {
        if (uploaded) await destroyQuietly(uploaded.publicId);
        next(err);
      }
    },

    setSold(req, res) {
      const id = parseId(req.params.id);
      findOrFail(id);
      const { vendida } = parseBody(soldSchema, req.body);
      db.prepare("UPDATE artworks SET vendida = ?, updated_at = datetime('now') WHERE id = ?").run(vendida ? 1 : 0, id);
      res.json({ data: toDto(findOrFail(id)) });
    },

    async remove(req, res, next) {
      try {
        const id = parseId(req.params.id);
        const actual = findOrFail(id);
        // Primero la imagen: si Cloudinary falla, la obra se conserva y se puede reintentar.
        try {
          await imageService.destroy(actual.imagen_public_id);
        } catch (err) {
          console.error('Error al borrar en Cloudinary:', err.message);
          throw httpError(502, 'No se pudo eliminar la imagen en Cloudinary. Intenta de nuevo.');
        }
        db.prepare('DELETE FROM artworks WHERE id = ?').run(id);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createArtworksController };
