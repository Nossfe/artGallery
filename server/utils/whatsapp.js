const db = require('../config/db');
const { whatsappNumber } = require('../config/env');

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/** "60 × 40 cm" o "60 × 40 × 3 cm"; cadena vacía si no hay medidas. */
function formatDimensions({ ancho_cm: ancho, alto_cm: alto, profundidad_cm: prof }) {
  const partes = [ancho, alto, prof].filter((v) => v !== null && v !== undefined).map((v) => num.format(v));
  return partes.length ? `${partes.join(' × ')} cm` : '';
}

// Número de WhatsApp de la configuración del sitio (tabla settings) o, si no existe, del .env.
// Solo dígitos, con código de país (formato wa.me).
function getWhatsappNumber() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_number'").get();
  const raw = row && row.value ? row.value : whatsappNumber;
  return String(raw || '').replace(/\D/g, '');
}

function buildMessage(a) {
  const dims = formatDimensions(a);
  return `Hola, me interesa la obra «${a.nombre}»${dims ? ` (${dims})` : ''} con precio ${cop.format(a.precio)}. ¿Sigue disponible?`;
}

/** Enlace de compra por WhatsApp. null si la obra está vendida o no hay número configurado. */
function buildWhatsappUrl(a, number = getWhatsappNumber()) {
  if (a.vendida || !number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildMessage(a))}`;
}

module.exports = { getWhatsappNumber, buildWhatsappUrl, buildMessage, formatDimensions };
