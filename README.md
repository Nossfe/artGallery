# Galería de Arte

Aplicación web para exhibir y vender pinturas originales, con panel de administración, compra directa por WhatsApp, base de datos SQLite e imágenes alojadas en Cloudinary.

## Requisitos previos

- **Node.js** 22 o superior.
- Cuenta gratuita en **Cloudinary** para alojar y optimizar las imágenes.
- Número de **WhatsApp** con código de país (sin `+`, espacios ni guiones).

## Instalación y puesta en marcha

```bash
npm install
cp .env.example .env     # en Windows: copy .env.example .env
# Completa las variables en .env antes de continuar
npm run build:css
npm run migrate
npm run seed:admin
npm run dev
```

Abre `http://localhost:3000` para ver la galería pública y `http://localhost:3000/admin/login.html` para acceder al panel de administración.

## Variables de entorno

Copia `.env.example` a `.env` y define los siguientes valores (nunca subas `.env` al repositorio):

| Variable | Descripción | Ejemplo / Notas |
| --- | --- | --- |
| `NODE_ENV` | Entorno de ejecución | `development`, `production` o `test` |
| `PORT` | Puerto HTTP de Express | `3000` |
| `DB_PATH` | Ruta al archivo SQLite (opcional) | Por defecto `data/gallery.db` (en producción apunta al disco persistente, ej. `/var/data/gallery.db`) |
| `BACKUP_DIR` | Carpeta de respaldos locales (opcional) | Por defecto `backups/` (en producción usa una subcarpeta del disco persistente) |
| `BACKUP_KEEP` | Número de respaldos a conservar (opcional) | Por defecto `14` |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud en Cloudinary | Dashboard → *Settings → API Keys* |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | Dashboard → *Settings → API Keys* |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary | Dashboard → *Settings → API Keys* |
| `WHATSAPP_NUMBER` | Número de WhatsApp de respaldo | Solo dígitos con código de país (`573001234567`) |
| `ADMIN_EMAIL` | Correo de la cuenta administradora | Usado por `npm run seed:admin` |
| `ADMIN_PASSWORD` | Contraseña del administrador | Mínimo 12 caracteres (`seed:admin`) |
| `JWT_SECRET` | Clave secreta para firmar sesiones JWT | Cadena aleatoria de al menos 32 caracteres |
| `JWT_EXPIRES_IN` | Duración de la sesión JWT | Por defecto `2h` (ej. `2h`, `1d`) |
| `CORS_ORIGIN` | Orígenes externos permitidos (opcional) | Vacío = mismo origen; varios separados por coma |

> **Tip para generar `JWT_SECRET`:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

## Configuración de Cloudinary

1. Crea una cuenta gratuita en [Cloudinary](https://cloudinary.com/users/register_free).
2. Entra al **Dashboard** y abre **Settings → API Keys**.
3. Copia el **Cloud name**, **API Key** y **API Secret** en tu archivo `.env`.
4. Todas las obras y la foto de la artista se suben a la carpeta `galeria` con optimización automática (`f_auto,q_auto`) y miniatura calculada (`c_limit,w_600`). Al reemplazar o eliminar una imagen, se borra la versión anterior en Cloudinary.

## Scripts de npm

| Script | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor con `nodemon` y Tailwind CSS en modo `--watch` |
| `npm run build` | Prepara los archivos estáticos de producción (ejecuta `build:css`) |
| `npm run build:css` | Compila y minifica `public/css/input.css` hacia `public/css/output.css` |
| `npm run watch:css` | Compila el CSS automáticamente al detectar cambios |
| `npm start` | Arranca el servidor en modo normal (`node server/index.js`) |
| `npm run migrate` | Crea o actualiza las tablas (`admin`, `artworks`, `settings`) en SQLite |
| `npm run seed:admin` | Crea o actualiza la única cuenta de administrador desde `.env` |
| `npm run backup:db` | Genera un respaldo consistente de SQLite en caliente y rota respaldos antiguos |
| `npm test` | Ejecuta la suite de pruebas automatizadas con Vitest y Supertest |

## Estructura del proyecto

```text
/
├─ server/
│  ├─ index.js                  # Arranque del servidor HTTP
│  ├─ app.js                    # Configuración de Express, helmet, CORS y rutas
│  ├─ config/                   # Variables de entorno, SQLite y Cloudinary
│  ├─ db/                       # schema.sql, migrate.js y seed-admin.js
│  ├─ routes/                   # Rutas REST: auth, artworks y about
│  ├─ controllers/              # Lógica de negocio de auth, obras y acerca de mí
│  ├─ middleware/               # auth (JWT), upload (multer), validate (zod) y errorHandler
│  └─ utils/                    # Esquemas zod, servicio Cloudinary y enlaces WhatsApp
├─ public/
│  ├─ index.html                # Galería pública
│  ├─ acerca.html               # Página pública "Acerca de mí" y contacto
│  ├─ admin/                    # login.html, dashboard.html y acerca.html
│  ├─ js/                       # Módulos ES vanilla (gallery, lightbox, about, admin, api, ui, format)
│  └─ css/                      # input.css → output.css (generado por Tailwind)
├─ tests/                       # Pruebas de integración (auth, artworks, about)
├─ data/                        # Base SQLite local (ignorada por Git)
├─ tailwind.config.js
├─ vitest.config.mjs
├─ render.yaml                  # Blueprint opcional para desplegar en Render
├─ .env.example
└─ AGENTS.md
```

## Despliegue en producción

### ¿Qué hosting elegir? (Importante: SQLite necesita disco persistente)

Esta aplicación guarda las obras, la cuenta de administrador y la página «Acerca de mí» en un archivo **SQLite** (`.db`). En muchos servicios en la nube con plan gratuito, el disco del contenedor es **efímero**: cada vez que la app se reinicia o se hace un nuevo despliegue, cualquier archivo local se borra. Por eso es indispensable montar un **disco o volumen persistente** y apuntar `DB_PATH` a ese volumen (las imágenes ya viven en Cloudinary, así que no ocupan disco).

Comparativa de las 3 opciones recomendadas:

| Opción | Facilidad | Disco persistente | Cuándo conviene |
| --- | --- | --- | --- |
| **Railway** *(recomendado)* | Muy alta | Volumen persistente (~$0,25/GB al mes + plan Hobby) | Mejor equilibrio entre simplicidad, HTTPS automático y costo bajo para proyectos con SQLite |
| **Render** | Muy alta (`render.yaml` incluido) | Persistent Disk (desde plan Starter ~$7/mes + $0,25/GB) | Ideal si prefieres configuración declarativa con Blueprint (`render.yaml`) y cero mantenimiento |
| **VPS (Hetzner, DigitalOcean, etc.)** | Media | Disco SSD completo incluido (~$4–6/mes) | Mejor relación costo/control y cron nativo para respaldos, si te sientes cómodo administrando Linux |

> **Regla importante:** con SQLite ejecuta siempre **una sola instancia** (réplica = 1) montada sobre el disco persistente.

### Variables de entorno en producción

Configura estas variables en el panel de tu hosting (nunca subas `.env` al repositorio):

- `NODE_ENV=production` — activa `trust proxy`, redirección HTTP → HTTPS, cabeceras HSTS, `upgrade-insecure-requests` y `Secure` en la cookie de sesión.
- `PORT` — la mayoría de PaaS (Render/Railway) lo inyectan automáticamente; en VPS usa `3000`.
- `DB_PATH` — ruta dentro del disco persistente (ej. `/data/gallery.db` en Railway o `/var/data/gallery.db` en Render).
- `BACKUP_DIR` — subcarpeta para respaldos dentro del volumen (ej. `/data/backups` o `/var/data/backups`).
- `JWT_SECRET` — cadena aleatoria de al menos 32 caracteres (genera una **nueva** para producción).
- `JWT_EXPIRES_IN=2h`
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` — contraseña fuerte de 12+ caracteres (tras crear el admin con `npm run seed:admin`, puedes retirar `ADMIN_PASSWORD` del panel si lo prefieres).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `WHATSAPP_NUMBER` — solo dígitos con código de país (ej. `573001234567`).
- `CORS_ORIGIN` — déjalo vacío si el frontend y la API se sirven desde el mismo dominio.

### Opción A: Despliegue paso a paso en Railway (recomendado)

1. Sube el repositorio a GitHub (asegúrate de que `.env`, `.env.example` con datos reales si existiera, y `*.db` no estén en Git).
2. Crea un proyecto en [Railway](https://railway.app) → **Deploy from GitHub repo** y selecciona este repositorio.
3. En la pestaña **Volumes** del servicio, agrega un volumen montado en `/data`.
4. En **Settings → Build & Deploy**:
   - **Build Command:** `npm ci --include=dev && npm run build` *(necesario para instalar `tailwindcss` y compilar `public/css/output.css` aunque `NODE_ENV=production` esté activo)*.
   - **Start Command:** `npm start` *(al arrancar ejecuta `migrate()` automáticamente sobre `/data/gallery.db`)*.
   - **Healthcheck Path:** `/api/health`.
5. En **Variables**, carga todas las variables de producción con `DB_PATH=/data/gallery.db` y `BACKUP_DIR=/data/backups`.
6. En **Settings → Networking**, genera el dominio público (incluye **HTTPS automático**).
7. Crea la cuenta de administrador una sola vez desde la consola de Railway (o con `railway run`):
   ```bash
   npm run seed:admin
   ```

### Opción B: Despliegue paso a paso en Render

El repositorio incluye [render.yaml](render.yaml) preconfigurado:

1. Sube el repositorio a GitHub.
2. En [Render](https://render.com), elige **New → Blueprint** y selecciona tu repositorio (detectará `render.yaml`, que configura el plan `starter`, el disco persistente en `/var/data`, `DB_PATH=/var/data/gallery.db`, `buildCommand` y `healthCheckPath`).
3. Completa los valores de las variables marcadas con `sync: false` en el asistente de Render.
4. Espera a que el despliegue quede en estado **Live** (Render provee **HTTPS automático**).
5. Abre la pestaña **Shell** del servicio en Render y ejecuta una sola vez:
   ```bash
   npm run seed:admin
   ```

### Opción C: Despliegue en un VPS (Ubuntu + Nginx + PM2 + HTTPS)

1. Instala Node.js 20+, Nginx, Certbot y PM2 (`npm install -g pm2`).
2. Clona el repositorio (ej. en `/var/www/art-gallery`), crea el `.env` de producción con `NODE_ENV=production` y `DB_PATH=/var/lib/art-gallery/gallery.db`, y ejecuta:
   ```bash
   npm ci --include=dev
   npm run build
   npm run migrate
   npm run seed:admin
   pm2 start server/index.js --name galeria
   pm2 save && pm2 startup
   ```
3. Configura Nginx como proxy inverso hacia `http://127.0.0.1:3000` enviando `X-Forwarded-Proto` y `X-Forwarded-For`, con `client_max_body_size 10m` (para admitir fotos de hasta 8 MB), y habilita HTTPS gratuito con Certbot (`sudo certbot --nginx -d tudominio.com`).

### Verificación en la URL real

Una vez desplegada la aplicación en su dominio `https://...`:

1. Verifica `https://tu-dominio/api/health` → debe responder `200` con `{"status":"ok","db":true,"env":"production"}`.
2. Entra a `https://tu-dominio/admin/login.html`, inicia sesión y confirma en las DevTools que la cookie `token` tiene `HttpOnly`, `SameSite=Strict` y `Secure`.
3. Crea una obra de prueba con foto real y verifica que aparece en `https://tu-dominio/` con el botón «Comprar» apuntando a `https://wa.me/...`.
4. Márcala como vendida en el panel y confirma que el botón queda deshabilitado en el sitio público.
5. Edita «Acerca de mí» y comprueba que los cambios se ven en `https://tu-dominio/acerca.html`.

### Estrategia de respaldo periódico de SQLite (`.db`)

Como SQLite opera en modo `WAL`, **no** copies el archivo `.db` directamente con `cp` mientras el servidor está en marcha. Usa el script incluido, que utiliza la API oficial `db.backup()` de SQLite para generar una copia consistente en caliente y conservar automáticamente los últimos `BACKUP_KEEP` respaldos (por defecto 14):

```bash
npm run backup:db
```

**Recomendación de rutina (regla 3-2-1 ligera):**
1. **Respaldo diario automático en el servidor:**
   - En un **VPS**, agrega una tarea `cron` diaria a las 03:00 (`crontab -e`):
     ```cron
     0 3 * * * cd /var/www/art-gallery && /usr/bin/npm run backup:db >> /var/log/galeria-backup.log 2>&1
     ```
   - En **Railway** o **Render**, ejecuta `npm run backup:db` periódicamente desde un Cron Job conectado al mismo volumen (o desde la consola antes de cambios importantes).
2. **Copia fuera del servidor (off-site):** un respaldo en el mismo disco no protege si el disco falla. Sube semanalmente el archivo `.db` más reciente a almacenamiento externo (por ejemplo, un bucket privado en Cloudflare R2 / S3 con `rclone`, o descárgalo a tu computador/Google Drive con `scp` o la CLI del hosting).
3. **Prueba de restauración:** para restaurar un respaldo, detén la app, reemplaza el archivo en `DB_PATH` por la copia `.db` (borrando antes los archivos `-wal` y `-shm` viejos si existen) y vuelve a iniciar el servidor.

## Decisiones tomadas

- **Dirección visual:** estética de galería minimalista. Fondo "lienzo" cálido (`#FAF8F5`), texto "tinta" casi negro (`#1F1D1A`), grises cálidos para detalles y un único acento bronce apagado (`#8A6F4D`). Títulos en *Cormorant Garamond* (serif) y texto en *Inter* (sans), cargadas desde Google Fonts. Tarjetas blancas sin bordes pesados, con sombra suave y esquinas rectas, para que la obra sea la protagonista. Todo está definido en `tailwind.config.js`.
- **Tailwind 3:** se usa la v3 porque el proyecto lleva `tailwind.config.js`. El CSS compilado (`public/css/output.css`) no se versiona; se genera con `npm run build:css`.
- **Variable `JWT_EXPIRES_IN`:** añadida a `.env.example` para configurar la duración de la sesión.
- **Ubicación de la base de datos:** `data/gallery.db` por defecto, configurable con `DB_PATH`. Está ignorada por Git.
- **Dependencias de desarrollo:** `nodemon` y `concurrently` para ejecutar el servidor y Tailwind en modo watch con `npm run dev`.
- **Administrador único:** `npm run seed:admin` lee `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env` (contraseña de 12 caracteres o más) y es repetible: si el correo ya existe, actualiza la contraseña; si cambias el correo, elimina la cuenta anterior para dejar una sola.
- **Sesión:** JWT (HS256) en la cookie `token` con `httpOnly`, `sameSite=strict` y `secure` en producción. La duración sale de `JWT_EXPIRES_IN` (por defecto 2h) y la cookie caduca a la vez que el token. `sameSite=strict` cubre la protección CSRF.
- **Login:** limitado a 10 intentos por IP cada 15 minutos. Mensaje de error genérico y tiempo de respuesta similar si el correo no existe.
- **CORS:** por defecto solo mismo origen. Para permitir otros, usa `CORS_ORIGIN` (variable añadida a `.env.example`).
- **CSP (helmet):** permite Google Fonts e imágenes de `res.cloudinary.com`. No se permiten scripts ni estilos en línea.
- **Pruebas:** Vitest + supertest con base SQLite en memoria y valores propios de prueba (no usan el `.env` real). Cloudinary se simula inyectando un `imageService` falso en `createApp`.
- **Estructura:** `server/app.js` crea la aplicación (sin escuchar puerto) y `server/index.js` la arranca, para poder probarla.
- **Imágenes:** la imagen se sube a la carpeta `galeria` de Cloudinary. En la base se guarda la URL optimizada (`f_auto,q_auto`) y el `public_id`. La miniatura (`c_limit,w_600`) no se guarda: la API la devuelve calculada como `imagen_thumb_url`.
- **Creación y edición de obras:** `POST` y `PUT` aceptan `multipart/form-data` (campo `imagen`). `PUT` también acepta JSON si no se cambia la foto, y la imagen es obligatoria solo al crear. `PUT` reemplaza todos los campos (los vacíos pasan a `null`); `vendida` se conserva si no se envía.
- **Validación de imágenes:** JPG, PNG o WebP, máximo 8 MB, comprobando también la firma real del archivo. La autenticación se evalúa antes de procesar la subida.
- **Consistencia con Cloudinary:** si falla el guardado en la base, se borra la imagen recién subida. Al reemplazar, la foto anterior se borra después de guardar (si falla, solo se registra en consola). Al eliminar, se borra primero la imagen y, si Cloudinary falla, se responde 502 y la obra se conserva para reintentar.
- **Listado:** `GET /api/artworks?page=&limit=&q=&estilo=&vendida=true|false`. Por defecto 12 por página (máximo 50), ordenado de más reciente a más antigua. La búsqueda (`q`) busca en nombre, descripción y estilo. Parámetros inválidos usan los valores por defecto. Las respuestas tienen la forma `{ data, pagination }`.
- **Panel de administración:** vive en `public/admin/` (`login.html`, `dashboard.html` y `acerca.html`) y usa módulos ES (`api.js`, `ui.js`, `format.js`, `admin.js`, `admin-login.js`, `admin-acerca.js`). Es JavaScript vanilla, sin scripts ni estilos en línea (compatible con la CSP) y todo el contenido dinámico se inserta con `textContent`.
- **Sesión expirada:** cualquier respuesta 401 del panel redirige a `/admin/login.html?expirada=1`. Al entrar al dashboard o a la edición de "Acerca de mí" se verifica la sesión con `/api/auth/me`. Las páginas del panel son estáticas (el HTML no es secreto); lo protegido es la API. Llevan `noindex`.
- **Formularios:** el formulario de crear/editar y la confirmación de borrado usan `<dialog>` nativo (gestión de foco, Esc y `aria-modal`). El formulario valida en el cliente y muestra los errores del servidor junto a cada campo.
- **Lista del panel:** 10 obras por página, búsqueda con retardo de 350 ms. El interruptor de vendida actualiza el estado en el servidor y la fila al confirmarse la respuesta.
- **Botón "Comprar":** el servidor construye el enlace y lo devuelve en `whatsapp_url`: `https://wa.me/<número>?text=<mensaje codificado>`. Si la obra está vendida, `whatsapp_url` es `null`, así el estado "vendida" se aplica en el servidor y no solo en la interfaz. El mensaje es «Hola, me interesa la obra «{nombre}» ({dimensiones}) con precio {precio}. ¿Sigue disponible?» (sin paréntesis si la obra no tiene medidas).
- **Número de WhatsApp:** se lee de la tabla `settings` (clave `whatsapp_number`) y, si no existe o está vacío, de `WHATSAPP_NUMBER` del `.env`. Se limpia a solo dígitos. Si no hay número, la tarjeta muestra el botón deshabilitado "No disponible por ahora".
- **Galería pública:** 12 obras por carga con botón "Ver más obras". Los filtros por estilo y disponibilidad se aplican en el servidor. `GET /api/artworks/estilos` devuelve los estilos existentes para llenar el filtro. La miniatura se muestra completa (`object-contain`) sobre fondo marfil para no recortarla.
- **Lightbox:** `<dialog>` modal a pantalla completa con `aria-modal`. Zoom de 100 % a 400 % (botones +/−, teclas `+`, `-` y `0`, y clic sobre la imagen). Se cierra con Esc, clic en el fondo o botón ✕, y devuelve el foco a la imagen que lo abrió.
- **Acerca de mí y contacto:** se guarda en la tabla `settings` mediante pares clave-valor (`about_nombre`, `about_biografia`, `about_foto_url`, `about_foto_public_id`, `whatsapp_number`, `about_email`, `about_ubicacion`, `about_instagram`, `about_facebook`, `about_tiktok`). Se exponen `GET /api/about` (público) y `PUT /api/about` (protegido, acepta `multipart/form-data` con campo `foto` o JSON).
- **Redes sociales:** se soportan Instagram, Facebook y TikTok como URLs completas validadas con esquema `http://` o `https://` tanto en servidor como en cliente.
- **SEO y Open Graph:** todas las páginas públicas incluyen `<title>`, meta descripción y etiquetas Open Graph (`og:title`, `og:description`, `og:type`, `og:locale`), y actualizan `og:image` dinámicamente con la primera obra de la galería o la foto de la artista.
- **Producción y despliegue (Etapa 8):** en `NODE_ENV=production` la aplicación activa `trust proxy`, HSTS, `upgrade-insecure-requests`, cookie `Secure` y redirección `301` de `x-forwarded-proto: http` a HTTPS (excluyendo `/api/health` para los health checks internos). `server/index.js` ejecuta `migrate()` al arrancar (idempotente, ideal al montar un disco persistente nuevo) y maneja `SIGTERM`/`SIGINT` cerrando el servidor HTTP y SQLite limpiamente para hacer checkpoint del WAL.
- **Build y respaldos:** se añadieron los scripts `npm run build` (alias de `build:css`) y `npm run backup:db` (`server/db/backup.js`), que utiliza `better-sqlite3` `db.backup()` para copias consistentes en caliente con rotación automática (`BACKUP_KEEP=14`). También se incluye `render.yaml` opcional y se ignora `backups/` en Git.
