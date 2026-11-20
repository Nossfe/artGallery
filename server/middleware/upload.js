const multer = require('multer');

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1, fields: 20, fieldSize: 20 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      const err = new Error('Formato no permitido. Usa JPG, PNG o WebP.');
      err.status = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

// Comprueba la firma real del archivo (no basta con confiar en el mimetype del cliente).
function hasValidSignature(buf) {
  if (!buf || buf.length < 12) return false;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  return jpg || png || webp;
}

// Acepta un campo de archivo opcional (multipart). Si la petición es JSON, no hace nada.
function createImageUpload(fieldName = 'imagen') {
  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          err.status = 413;
          err.message = 'La imagen supera el máximo de 8 MB.';
        } else if (err.name === 'MulterError') {
          err.status = 400;
          err.message = 'Subida de archivo inválida.';
        }
        return next(err);
      }
      if (req.file && !hasValidSignature(req.file.buffer)) {
        const e = new Error('El archivo no es una imagen JPG, PNG o WebP válida.');
        e.status = 400;
        return next(e);
      }
      return next();
    });
  };
}

const uploadImage = createImageUpload('imagen');

module.exports = { uploadImage, createImageUpload, MAX_SIZE };
