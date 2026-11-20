const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

export const formatCOP = (valor) => cop.format(valor);

/** "60 × 40 cm" o "60 × 40 × 3 cm"; cadena vacía si no hay medidas. */
export function formatDimensions({ ancho_cm: ancho, alto_cm: alto, profundidad_cm: prof }) {
  const partes = [ancho, alto, prof].filter((v) => v !== null && v !== undefined).map((v) => num.format(v));
  return partes.length ? `${partes.join(' × ')} cm` : '';
}
