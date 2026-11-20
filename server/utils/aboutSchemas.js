const { z } = require('zod');

const limpiarTexto = (v) => (typeof v === 'string' ? v.trim() : '');

const textoOpcional = (max) =>
  z.preprocess(limpiarTexto, z.string().max(max, `Máximo ${max} caracteres`));

const emailOpcional = z.preprocess(
  limpiarTexto,
  z
    .string()
    .max(254, 'Máximo 254 caracteres')
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Correo electrónico inválido'),
);

// Solo permite URLs http:// o https:// (evita esquemas peligrosos como javascript:)
const urlOpcional = z.preprocess(
  limpiarTexto,
  z
    .string()
    .max(300, 'Máximo 300 caracteres')
    .refine((v) => {
      if (!v) return true;
      try {
        const parsed = new URL(v);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    }, 'Debe ser una URL válida que empiece por https:// o http://'),
);

// Número de WhatsApp: solo dígitos (con código de país, formato wa.me), entre 7 y 15 dígitos si se indica.
const whatsappOpcional = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/[\s\-()+]/g, '') : ''),
  z
    .string()
    .refine((v) => !v || /^\d{7,15}$/.test(v), 'Usa solo dígitos con código de país (entre 7 y 15 dígitos, ej. 573001234567)'),
);

const booleanoOpcional = z
  .preprocess((v) => v === true || v === 'true' || v === '1' || v === 1, z.boolean())
  .optional()
  .default(false);

const aboutSchema = z.object({
  nombre: textoOpcional(120),
  biografia: textoOpcional(5000),
  whatsapp: whatsappOpcional,
  email: emailOpcional,
  ubicacion: textoOpcional(150),
  instagram: urlOpcional,
  facebook: urlOpcional,
  tiktok: urlOpcional,
  eliminar_foto: booleanoOpcional,
});

module.exports = { aboutSchema };
