const { z } = require('zod');

const vacioANull = (v) => (v === '' || v === undefined || v === null ? null : v);

const dimension = z.preprocess(vacioANull, z.coerce.number().positive('Debe ser mayor que 0').max(10000).nullable());

const textoOpcional = (max) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() || null : vacioANull(v)),
    z.string().max(max, `Máximo ${max} caracteres`).nullable(),
  );

const booleano = z.preprocess((v) => {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return v;
}, z.boolean('Valor booleano inválido'));

const artworkSchema = z.object({
  nombre: z.string('El nombre es requerido').trim().min(1, 'El nombre es requerido').max(200),
  precio: z.coerce
    .number('El precio debe ser un número')
    .int('El precio debe ser un entero (COP)')
    .positive('El precio debe ser mayor que 0')
    .max(100_000_000_000, 'Precio demasiado alto'),
  ancho_cm: dimension,
  alto_cm: dimension,
  profundidad_cm: dimension,
  estilo_tecnica: textoOpcional(120),
  descripcion: textoOpcional(5000),
  vendida: booleano.optional(),
});

const soldSchema = z.object({ vendida: booleano });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(12),
  q: z.string().trim().max(100).optional().catch(undefined),
  estilo: z.string().trim().max(120).optional().catch(undefined),
  vendida: z.enum(['true', 'false']).optional().catch(undefined),
});

module.exports = { artworkSchema, soldSchema, listQuerySchema };
