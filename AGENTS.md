# Rol
Eres un ingeniero full-stack senior. Vas a crear desde cero una aplicación web para exhibir y vender pinturas, con un panel de administración. Entregas un proyecto que funcione de punta a punta, pero **por etapas**: este documento describe todo el proyecto, y en cada sesión yo te indicaré en cuál etapa trabajar.

# Forma de trabajar (reglas obligatorias)
1. Trabaja **únicamente** en la etapa que yo indique. No adelantes trabajo de etapas posteriores.
2. Antes de escribir código en cada etapa, resume en pocas líneas tu plan. No esperes aprobación, sigue adelante.
3. Al terminar la etapa: verifica los criterios de la sección "Cómo verificar", haz un resumen breve de lo hecho, indica qué falta configurar de mi parte y **detente a esperar mi orden** para la siguiente etapa.
4. No inventes credenciales, claves ni números. Pídeme los valores cuando los necesites. Nunca escribas secretos en el código ni en el repositorio.
5. Si algo no está especificado, elige la opción más razonable y anótala en el `README.md`, en la sección "Decisiones tomadas".
6. Haz cambios puntuales en los archivos existentes; no reescribas archivos completos si solo cambia una parte.
7. Al cerrar cada etapa, sugiere el mensaje de commit de Git (en español, claro y corto).

# Objetivo
Una galería pública donde cada obra se muestra con foto, datos y un botón de compra que abre un chat de WhatsApp para cerrar la venta. Un administrador inicia sesión para gestionar las obras (CRUD). Incluye una página "Acerca de mí" con la información de contacto.

# Stack (obligatorio)
- **Frontend:** HTML5 semántico, CSS con Tailwind CSS y JavaScript vanilla (módulos ES). Sin React, Vue ni otros frameworks.
- **Backend:** Node.js con Express, API REST en JSON. Express también sirve los archivos estáticos del frontend (un solo proyecto).
- **Base de datos:** SQLite (usa `better-sqlite3`).
- **Imágenes:** Cloudinary (SDK oficial de Node, subida con `multer` en memoria). Guarda en la base de datos `url` y `public_id`. Al borrar o reemplazar una obra, elimina también la imagen en Cloudinary.
- **Tailwind:** compílalo con el CLI de Tailwind y genera un CSS final. No uses el CDN en producción.
- **Idioma y moneda:** interfaz solo en español. Precios en pesos colombianos (COP), con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.

# Funcionalidades del proyecto completo

## Sitio público
1. **Galería (inicio):** cuadrícula responsive de obras. Cada tarjeta muestra la miniatura, el nombre, el precio, las dimensiones, el estilo/técnica y el estado.
2. **Ampliar foto:** al hacer clic en la imagen se abre un lightbox/modal a pantalla completa con zoom. Se cierra con la tecla Esc, con clic fuera de la imagen y con un botón. Accesible: gestión del foco y `aria-modal`.
3. **Botón "Comprar":** abre `https://wa.me/<NUMERO>?text=<mensaje codificado>`. El mensaje viene prellenado, por ejemplo: "Hola, me interesa la obra «{nombre}» ({dimensiones}) con precio {precio}. ¿Sigue disponible?". El número de WhatsApp sale de la configuración del sitio (tabla de ajustes o variable de entorno), no del código.
4. **Obra vendida:** el botón aparece deshabilitado con el texto "Vendida" y la tarjeta muestra una insignia visible. El estado debe aplicarse también en el servidor, no solo en la interfaz.
5. **Acerca de mí:** biografía, foto de la artista y datos de contacto (WhatsApp, correo, redes sociales, ubicación). Editable desde el panel admin.
6. **Navegación:** encabezado y pie de página comunes, menú responsive para móvil y enlace discreto a "Admin".
7. **Extras ligeros:** filtro por estilo/técnica y por disponibilidad (disponibles / vendidas), y estados de carga y vacío.

## Panel de administración
1. **Login:** correo y contraseña. Una sola cuenta de administrador, creada con un script (`npm run seed:admin`) que lee las credenciales del `.env`. Contraseñas con `bcrypt`.
2. **Sesión:** JWT en cookie `httpOnly`, `sameSite=strict` y `secure` en producción. Alternativa válida: `express-session`. Incluye cierre de sesión y expiración.
3. **CRUD de obras:** listar (con búsqueda y paginación), crear, editar y eliminar (con confirmación). Campos de cada obra:
   - `id`
   - `nombre` (requerido)
   - `precio` (entero COP, requerido, mayor que 0)
   - `ancho_cm`, `alto_cm` (y opcional `profundidad_cm`)
   - `estilo_tecnica` (texto o lista, por ejemplo "Óleo sobre lienzo")
   - `imagen_url`, `imagen_public_id`
   - `vendida` (booleano)
   - `descripcion` (opcional)
   - `created_at`, `updated_at`
4. **Marcar como vendida / disponible:** interruptor rápido en la lista que actualiza el estado y deshabilita o habilita el botón de compra en el sitio.
5. **Subida de imagen:** vista previa antes de guardar. Valida JPG, PNG o WebP y máximo 8 MB. Pide a Cloudinary una versión optimizada (`f_auto,q_auto`) y una miniatura para la galería.
6. **Edición de "Acerca de mí" y contacto** desde el panel.

# API (propuesta, puedes mejorarla)
- Públicas: `GET /api/artworks`, `GET /api/artworks/:id`, `GET /api/about`
- Auth: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Protegidas (admin): `POST /api/artworks`, `PUT /api/artworks/:id`, `PATCH /api/artworks/:id/sold`, `DELETE /api/artworks/:id`, `PUT /api/about`

# Seguridad y calidad (aplican a todas las etapas)
- Valida y sanea toda entrada del servidor (por ejemplo con `zod` o `express-validator`) y usa consultas parametrizadas.
- Usa `helmet`, `cors` restringido, rate limiting en el login (`express-rate-limit`) y límites de tamaño en las subidas.
- Las rutas de escritura requieren autenticación (401 si no hay sesión).
- Escapa el contenido al insertarlo en el DOM: usa `textContent` y nunca `innerHTML` con datos del usuario.
- Manejo de errores centralizado y mensajes claros al usuario.
- Secretos solo en `.env`, con un `.env.example` documentado. Nunca subas `.env` ni el archivo `.db` al repositorio.
- Accesibilidad: HTML semántico, `alt` en imágenes (usa el nombre de la obra), contraste suficiente y navegación por teclado.
- SEO básico: `<title>` y meta descripción por página, Open Graph con la imagen de la obra.
- Diseño mobile-first y responsive.

# Diseño
Estética de galería de arte: minimalista, mucho espacio en blanco, tipografía elegante (serif para títulos y sans-serif para el texto) y que la obra sea la protagonista. Paleta neutra y sobria. En la etapa 1 propón en un párrafo la dirección visual (paleta, tipografías, estilo de tarjetas) y aplícala de forma consistente en todo el proyecto.

# Estructura sugerida
```
/
├─ server/
│  ├─ index.js
│  ├─ config/ (env, db, cloudinary)
│  ├─ db/ (schema.sql, migrate.js, seed-admin.js)
│  ├─ routes/ (artworks, auth, about)
│  ├─ controllers/
│  ├─ middleware/ (auth, errorHandler, upload, validate)
│  └─ utils/
├─ public/
│  ├─ index.html          (galería)
│  ├─ acerca.html         (acerca de mí)
│  ├─ admin/ (login.html, dashboard.html)
│  ├─ js/ (api.js, gallery.js, lightbox.js, admin.js, ...)
│  └─ css/ (input.css → output.css)
├─ tailwind.config.js
├─ package.json
├─ .env.example
├─ AGENTS.md
└─ README.md
```

# Scripts de npm (se van creando según la etapa)
`dev` (nodemon + Tailwind en modo watch), `build:css`, `start`, `migrate`, `seed:admin`, `test`.

---

# ETAPAS DEL PROYECTO

Recuerda: trabaja solo en la etapa que yo indique y detente al terminarla.

## Etapa 0: Preparación
**Qué haces tú (el agente):**
- Crear la carpeta del proyecto e inicializar Git con un `.gitignore` (incluye `.env`, `node_modules` y archivos `.db`).
- Guardar este documento como `AGENTS.md` en la raíz del proyecto.
- Generar un `.env.example` con todas las variables previstas: Cloudinary (cloud name, API key, API secret), número de WhatsApp, correo y contraseña del admin, secreto JWT, puerto y entorno.
- Entregarme una lista corta y clara con los pasos para que **yo** obtenga cada dato (crear la cuenta de Cloudinary y dónde ver las claves, formato del número de WhatsApp para `wa.me`, etc.).
- NO crear cuentas, NO inventar valores y NO escribir ningún secreto real.

**Cómo verificar:** existen `AGENTS.md`, `.gitignore`, `.env.example` y la lista de pasos. No hay secretos en ningún archivo.

## Etapa 1: Base del proyecto
**Qué haces:**
- Crear la estructura de carpetas, `package.json` y las dependencias necesarias.
- Servidor Express básico que sirve `public/` y un endpoint de salud (`GET /api/health`).
- Configuración de entorno y conexión a SQLite con esquema y script de migración (tablas `admin`, `artworks` y `settings`).
- Tailwind configurado con el CLI, y scripts `dev` y `build:css`.
- Proponer la dirección visual (paleta, tipografías y estilo de tarjetas) y dejarla definida en la configuración de Tailwind.
- Una página de inicio mínima con estilos y el encabezado/pie comunes.
- Mostrarme la estructura de carpetas final antes de cerrar.

**Cómo verificar:** `npm run migrate` crea la base de datos y `npm run dev` arranca el servidor y muestra una página con estilos.

## Etapa 2: Autenticación
**Qué haces:**
- Script `npm run seed:admin` que crea el admin con las credenciales del `.env` (contraseña con `bcrypt`).
- Endpoints `POST /api/auth/login`, `POST /api/auth/logout` y `GET /api/auth/me`.
- Sesión con JWT en cookie `httpOnly`, `sameSite=strict` y `secure` en producción, con expiración.
- Middleware que protege las rutas de escritura.
- Rate limiting en el login, `helmet` y `cors` restringido.
- Pruebas automatizadas (Vitest o Jest con supertest) para el login y las rutas protegidas.

**Cómo verificar:** se puede iniciar sesión con las credenciales del admin, una ruta protegida devuelve 401 sin sesión, y las pruebas pasan.

## Etapa 3: CRUD de obras (API)
**Qué haces:**
- Endpoints públicos de lectura y endpoints protegidos de crear, editar, cambiar estado de vendida y eliminar.
- Validación de todos los campos (precio entero mayor que 0, dimensiones numéricas, etc.).
- Subida de imagen con `multer` en memoria hacia Cloudinary: valida JPG, PNG o WebP y máximo 8 MB, guarda `imagen_url` e `imagen_public_id`, y usa transformaciones `f_auto,q_auto` más miniatura.
- Al eliminar o reemplazar una obra, borrar la imagen anterior en Cloudinary.
- Paginación y búsqueda en el listado.
- Pruebas con supertest (puedes simular Cloudinary en las pruebas).

**Cómo verificar:** las pruebas pasan y puedo crear una obra con foto usando curl o Postman, verla en `GET /api/artworks` y eliminarla (la imagen desaparece de Cloudinary).

## Etapa 4: Panel de administración (interfaz)
**Qué haces:**
- Pantalla de login y dashboard en `public/admin/`.
- Lista de obras con búsqueda, paginación e interruptor rápido de vendida/disponible.
- Formulario de crear/editar con vista previa de la imagen y validación en el cliente.
- Confirmación antes de eliminar, mensajes de éxito y error, y estados de carga.
- Redirigir al login si la sesión expira.

**Cómo verificar:** desde el navegador puedo iniciar sesión, crear, editar, marcar como vendida y eliminar una obra, y cerrar sesión.

## Etapa 5: Sitio público
**Qué haces:**
- Galería responsive con tarjetas (miniatura, nombre, precio en COP, dimensiones, estilo/técnica y estado).
- Lightbox con zoom, cierre con Esc/clic fuera/botón, gestión del foco y `aria-modal`.
- Botón "Comprar" con la URL de `wa.me` y el mensaje prellenado, usando el número de la configuración.
- Estado "Vendida": botón deshabilitado e insignia visible.
- Filtros por estilo/técnica y disponibilidad, y estados de carga y vacío.

**Cómo verificar:** una obra vendida muestra el botón deshabilitado, la URL de WhatsApp sale correcta y codificada, y el lightbox se cierra de las tres formas.

## Etapa 6: Acerca de mí y contacto
**Qué haces:**
- Endpoints `GET /api/about` (público) y `PUT /api/about` (protegido), guardados en la tabla `settings`. Incluye el número de WhatsApp.
- Página pública `acerca.html` con biografía, foto de la artista y datos de contacto (WhatsApp, correo, redes, ubicación).
- Pantalla en el panel admin para editar ese contenido (incluida la foto, subida a Cloudinary).

**Cómo verificar:** lo que edito en el admin aparece en la página pública, y cambiar el número de WhatsApp cambia el enlace de los botones de compra.

## Etapa 7: Pulido y cierre
**Qué haces:**
- Revisión de diseño y consistencia visual, y responsive en móvil.
- Estados vacíos y de error en todas las pantallas.
- SEO básico (títulos, meta descripciones, Open Graph).
- Revisión de accesibilidad (teclado, contraste, `alt`, foco).
- Revisión de seguridad según la sección "Seguridad y calidad".
- `README.md` completo en español: instalación, variables de entorno, configuración de Cloudinary, scripts, estructura y sección "Decisiones tomadas".

**Cómo verificar (criterios de aceptación):**
- [ ] La galería muestra nombre, precio en COP, dimensiones y estilo/técnica de cada obra.
- [ ] La foto se amplía y se cierra con Esc, clic fuera y botón.
- [ ] "Comprar" abre WhatsApp con el mensaje prellenado y queda deshabilitado si la obra está vendida.
- [ ] Solo el admin autenticado puede crear, editar, eliminar o cambiar el estado (401 en las demás peticiones de escritura).
- [ ] Al eliminar una obra se elimina su imagen en Cloudinary.
- [ ] "Acerca de mí" muestra la información de contacto editable desde el admin.
- [ ] Es usable en móvil y no hay secretos en el repositorio.
- [ ] El proyecto arranca con `npm install && npm run migrate && npm run seed:admin && npm run dev`.

## Etapa 8: Despliegue
**Qué haces:**
- Recomendarme un hosting (Render, Railway o un VPS) explicando que SQLite necesita disco persistente.
- Preparar la configuración de producción: variables de entorno, `NODE_ENV=production`, build del CSS, `secure` en cookies y HTTPS.
- Documentar en el README el despliegue paso a paso y una estrategia de respaldo periódico del archivo `.db`.

**Cómo verificar:** la aplicación funciona en una URL real y el flujo completo (login, crear obra, verla, comprar por WhatsApp, marcar como vendida) se prueba allí.
