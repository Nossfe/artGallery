const { port, nodeEnv } = require('./config/env');
const { createApp } = require('./app');

const { isConfigured } = require('./config/cloudinary');

if (!isConfigured) {
  console.warn('Aviso: faltan variables de Cloudinary en .env; no se podrán subir imágenes.');
}

const app = createApp();

app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port} (${nodeEnv})`);
});
