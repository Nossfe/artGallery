function notFound(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// Manejo de errores centralizado
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Cuerpo JSON mal formado o demasiado grande
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }
  // Errores controlados (4xx y 502/503 con mensaje propio, sin detalles internos)
  if (err.status && (err.status < 500 || err.status === 502 || err.status === 503)) {
    return res.status(err.status).json({ error: err.message, ...(err.detalles ? { detalles: err.detalles } : {}) });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
