const db = require('../config/db');
const { thumbnailUrl } = require('../utils/images');
const { getWhatsappNumber } = require('../utils/whatsapp');
const { aboutSchema } = require('../utils/aboutSchemas');

const SETTING_KEYS = {
  nombre: 'about_nombre',
  biografia: 'about_biografia',
  whatsapp: 'whatsapp_number',
  email: 'about_email',
  ubicacion: 'about_ubicacion',
  instagram: 'about_instagram',
  facebook: 'about_facebook',
  tiktok: 'about_tiktok',
  foto_url: 'about_foto_url',
  foto_public_id: 'about_foto_public_id',
};

const ALL_KEYS = Object.values(SETTING_KEYS);

function httpError(status, message, detalles) {
  const err = new Error(message);
  err.status = status;
  if (detalles) err.detalles = detalles;
  return err;
}

function readSettings() {
  const placeholders = ALL_KEYS.map(() => '?').join(', ');
  const rows = db.prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`).all(...ALL_KEYS);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  return map;
}

function getAboutDto() {
  const s = readSettings();
  const whatsapp = getWhatsappNumber();
  const fotoUrl = s[SETTING_KEYS.foto_url] || null;
  return {
    nombre: s[SETTING_KEYS.nombre] || '',
    biografia: s[SETTING_KEYS.biografia] || '',
    foto_url: fotoUrl,
    foto_thumb_url: thumbnailUrl(fotoUrl),
    whatsapp,
    whatsapp_url: whatsapp ? `https://wa.me/${whatsapp}` : null,
    email: s[SETTING_KEYS.email] || '',
    ubicacion: s[SETTING_KEYS.ubicacion] || '',
    instagram: s[SETTING_KEYS.instagram] || '',
    facebook: s[SETTING_KEYS.facebook] || '',
    tiktok: s[SETTING_KEYS.tiktok] || '',
  };
}

function createAboutController(imageService) {
  async function destroyQuietly(publicId) {
    if (!publicId) return;
    try {
      await imageService.destroy(publicId);
    } catch (err) {
      console.error(`No se pudo borrar la foto ${publicId} en Cloudinary:`, err.message);
    }
  }

  const upsert = db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );

  const saveAll = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, value);
    }
  });

  return {
    get(req, res) {
      res.json({ data: getAboutDto() });
    },

    async update(req, res, next) {
      let uploaded = null;
      try {
        const parsed = aboutSchema.safeParse(req.body || {});
        if (!parsed.success) {
          throw httpError(
            400,
            'Datos inválidos',
            parsed.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
          );
        }

        const data = parsed.data;
        const current = readSettings();
        const prevPublicId = current[SETTING_KEYS.foto_public_id] || '';
        let fotoUrl = current[SETTING_KEYS.foto_url] || '';
        let fotoPublicId = prevPublicId;

        if (req.file) {
          uploaded = await imageService.upload(req.file.buffer);
          fotoUrl = uploaded.url;
          fotoPublicId = uploaded.publicId;
        } else if (data.eliminar_foto) {
          fotoUrl = '';
          fotoPublicId = '';
        }

        saveAll([
          [SETTING_KEYS.nombre, data.nombre],
          [SETTING_KEYS.biografia, data.biografia],
          [SETTING_KEYS.whatsapp, data.whatsapp],
          [SETTING_KEYS.email, data.email],
          [SETTING_KEYS.ubicacion, data.ubicacion],
          [SETTING_KEYS.instagram, data.instagram],
          [SETTING_KEYS.facebook, data.facebook],
          [SETTING_KEYS.tiktok, data.tiktok],
          [SETTING_KEYS.foto_url, fotoUrl],
          [SETTING_KEYS.foto_public_id, fotoPublicId],
        ]);

        if ((uploaded || data.eliminar_foto) && prevPublicId) {
          await destroyQuietly(prevPublicId);
        }

        res.json({ data: getAboutDto() });
      } catch (err) {
        if (uploaded) await destroyQuietly(uploaded.publicId);
        next(err);
      }
    },
  };
}

module.exports = { createAboutController, SETTING_KEYS };
