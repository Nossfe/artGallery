const fs = require('fs');
const path = require('path');
const { port, nodeEnv } = require('./config/env');
const db = require('./config/db');
const { migrate } = require('./db/migrate');
const { isConfigured } = require('./config/cloudinary');
const { createApp } = require('./app');

// Garantiza que las tablas existan al montar un disco persistente nuevo en producción.
migrate();

if (!isConfigured) {
  console.warn('Aviso: faltan variables de Cloudinary en .env; no se podrán subir imágenes.');
}

const cssPath = path.join(__dirname, '..', 'public', 'css', 'output.css');
if (!fs.existsSync(cssPath)) {
  console.warn('Aviso: no existe public/css/output.css. Ejecuta "npm run build" antes de iniciar.');
}

const app = createApp();

const server = app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port} (${nodeEnv})`);
});

// Cierre ordenado para hacer checkpoint seguro del WAL de SQLite al reiniciar o redesplegar.
function shutdown(signal) {
  console.log(`Recibida señal ${signal}, cerrando servidor…`);
  server.close(() => {
    try {
      db.close();
    } catch (err) {
      console.error('Error al cerrar SQLite:', err.message);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
