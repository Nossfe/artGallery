# Galería de Arte

Aplicación web para exhibir y vender pinturas, con panel de administración. La especificación completa está en [AGENTS.md](AGENTS.md). El README final se completará en la Etapa 7.

## Inicio rápido (estado actual: Etapa 1)

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
npm run build:css
npm run migrate
npm run dev
```

Abre http://localhost:3000 y revisa http://localhost:3000/api/health.

## Decisiones tomadas

- **Dirección visual:** estética de galería minimalista. Fondo "lienzo" cálido (`#FAF8F5`), texto "tinta" casi negro, grises cálidos para detalles y un único acento bronce apagado. Títulos en *Cormorant Garamond* (serif) y texto en *Inter* (sans), cargadas desde Google Fonts. Tarjetas blancas sin bordes pesados, con sombra suave y esquinas rectas, para que la obra sea la protagonista. Todo está definido en `tailwind.config.js`.
- **Tailwind 3:** se usa la v3 porque el proyecto lleva `tailwind.config.js`. El CSS compilado (`public/css/output.css`) no se versiona; se genera con `npm run build:css`.
- **Variable `JWT_EXPIRES_IN`:** añadida a `.env.example` para configurar la duración de la sesión.
- **Ubicación de la base de datos:** `data/gallery.db` por defecto, configurable con `DB_PATH`. Está ignorada por Git.
- **Dependencias de desarrollo:** `nodemon` y `concurrently` para ejecutar el servidor y Tailwind en modo watch con `npm run dev`.
- **Scripts:** `seed:admin` y `test` ya están activos (Etapa 2).
- **Administrador único:** `npm run seed:admin` lee `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env` (contraseña de 12 caracteres o más) y es repetible: si el correo ya existe, actualiza la contraseña; si cambias el correo, elimina la cuenta anterior para dejar una sola.
- **Sesión:** JWT (HS256) en la cookie `token` con `httpOnly`, `sameSite=strict` y `secure` en producción. La duración sale de `JWT_EXPIRES_IN` (por defecto 2h) y la cookie caduca a la vez que el token. `sameSite=strict` cubre la protección CSRF.
- **Login:** limitado a 10 intentos por IP cada 15 minutos. Mensaje de error genérico y tiempo de respuesta similar si el correo no existe.
- **CORS:** por defecto solo mismo origen. Para permitir otros, usa `CORS_ORIGIN` (variable añadida a `.env.example`).
- **CSP (helmet):** permite Google Fonts e imágenes de `res.cloudinary.com`. No se permiten scripts ni estilos en línea.
- **Pruebas:** Vitest + supertest con base SQLite en memoria y valores propios de prueba (no usan el `.env` real). Con `npm test`.
- **Estructura:** `server/app.js` crea la aplicación (sin escuchar puerto) y `server/index.js` la arranca, para poder probarla.
- **Imágenes (Etapa 3):** la imagen se sube a la carpeta `galeria` de Cloudinary. En la base se guarda la URL optimizada (`f_auto,q_auto`) y el `public_id`. La miniatura (`c_limit,w_600`) no se guarda: la API la devuelve calculada como `imagen_thumb_url`.
- **Creación y edición:** `POST` y `PUT` aceptan `multipart/form-data` (campo `imagen`). `PUT` también acepta JSON si no se cambia la foto, y la imagen es obligatoria solo al crear. `PUT` reemplaza todos los campos (los vacíos pasan a `null`); `vendida` se conserva si no se envía.
- **Validación de imágenes:** JPG, PNG o WebP, máximo 8 MB, comprobando también la firma real del archivo. La autenticación se evalúa antes de procesar la subida.
- **Consistencia con Cloudinary:** si falla el guardado en la base, se borra la imagen recién subida. Al reemplazar, la foto anterior se borra después de guardar (si falla, solo se registra en consola). Al eliminar, se borra primero la imagen y, si Cloudinary falla, se responde 502 y la obra se conserva para reintentar.
- **Listado:** `GET /api/artworks?page=&limit=&q=&estilo=&vendida=true|false`. Por defecto 12 por página (máximo 50), ordenado de más reciente a más antigua. La búsqueda (`q`) busca en nombre, descripción y estilo. Parámetros inválidos usan los valores por defecto. Las respuestas tienen la forma `{ data, pagination }`.
- **Pruebas:** Cloudinary se simula inyectando un `imageService` falso en `createApp`.
