const { cloudinary, isConfigured } = require('../config/cloudinary');

const FOLDER = 'galeria';

// Servicio real de imágenes (Cloudinary). En las pruebas se reemplaza por uno simulado.
const cloudinaryImageService = {
  async upload(buffer) {
    if (!isConfigured) {
      const err = new Error('Cloudinary no está configurado en el servidor');
      err.status = 503;
      throw err;
    }
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: FOLDER, resource_type: 'image' }, (error, res) =>
          error ? reject(error) : resolve(res),
        )
        .end(buffer);
    });
    return {
      publicId: result.public_id,
      // Versión optimizada: formato y calidad automáticos
      url: cloudinary.url(result.public_id, {
        secure: true,
        version: result.version,
        fetch_format: 'auto',
        quality: 'auto',
      }),
    };
  },

  async destroy(publicId) {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  },
};

// Miniatura para la galería (máx. 600 px de ancho) derivada de la URL optimizada.
function thumbnailUrl(url) {
  if (!url) return null;
  return url.replace('/upload/', '/upload/c_limit,w_600/');
}

module.exports = { cloudinaryImageService, thumbnailUrl };
