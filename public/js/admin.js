import { api, ApiError, LOGIN_URL } from './api.js';
import { el, toast, debounce } from './ui.js';
import { formatCOP, formatDimensions } from './format.js';

const PAGE_SIZE = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const $ = (id) => document.getElementById(id);
const main = $('contenido');
const lista = $('lista');
const estado = $('lista-estado');
const resumen = $('resumen');
const paginacion = $('paginacion');

const state = { page: 1, q: '', items: [], pagination: null, loadId: 0 };

/* ------------------------------ Sesión ------------------------------ */

async function init() {
  try {
    const { admin } = await api('/api/auth/me'); // 401 → redirige al login
    $('admin-email').textContent = admin.email;
    main.hidden = false;
    loadArtworks();
  } catch (err) {
    if (err.status !== 401) {
      main.hidden = false;
      mostrarEstado('No se pudo verificar la sesión. Recarga la página.', true);
    }
  }
}

$('btn-logout').addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST', redirectOn401: false });
  } finally {
    location.replace(LOGIN_URL);
  }
});

/* ------------------------------ Listado ------------------------------ */

function mostrarEstado(texto, conReintento = false) {
  estado.replaceChildren(el('p', { text: texto }));
  if (conReintento) {
    estado.append(el('button', { type: 'button', class: 'boton-secundario mt-4', text: 'Reintentar', onClick: loadArtworks }));
  }
  estado.hidden = !texto;
}

async function loadArtworks() {
  const id = ++state.loadId;
  lista.replaceChildren();
  paginacion.hidden = true;
  resumen.textContent = '';
  mostrarEstado('Cargando obras…');

  const params = new URLSearchParams({ page: state.page, limit: PAGE_SIZE });
  if (state.q) params.set('q', state.q);

  try {
    const res = await api(`/api/artworks?${params}`);
    if (id !== state.loadId) return; // llegó una respuesta más nueva
    const { page, totalPages, total } = res.pagination;
    if (res.data.length === 0 && total > 0 && page > 1) {
      state.page = totalPages; // se vació la última página
      return loadArtworks();
    }
    state.items = res.data;
    state.pagination = res.pagination;
    renderList();
  } catch (err) {
    if (id !== state.loadId || err.status === 401) return;
    mostrarEstado(err.message || 'No se pudieron cargar las obras.', true);
  }
}

function renderList() {
  const { total, page, totalPages } = state.pagination;
  lista.replaceChildren(...state.items.map(renderItem));

  if (state.items.length === 0) {
    resumen.textContent = '';
    if (state.q) {
      mostrarEstado(`No hay obras que coincidan con «${state.q}».`);
    } else {
      estado.replaceChildren(
        el('p', { text: 'Aún no has agregado obras.' }),
        el('button', { type: 'button', class: 'boton mt-4', text: 'Agregar la primera obra', onClick: () => openForm(null) }),
      );
      estado.hidden = false;
    }
    return;
  }

  estado.hidden = true;
  resumen.textContent = `${total} ${total === 1 ? 'obra' : 'obras'}${state.q ? ` para «${state.q}»` : ''}`;
  paginacion.hidden = totalPages <= 1;
  $('pagina-info').textContent = `Página ${page} de ${totalPages}`;
  $('btn-prev').disabled = page <= 1;
  $('btn-next').disabled = page >= totalPages;
}

function renderItem(a) {
  const dims = formatDimensions(a);
  const detalles = [dims, a.estilo_tecnica].filter(Boolean).join(' · ');

  const toggle = el(
    'button',
    {
      type: 'button',
      role: 'switch',
      class: 'interruptor',
      'aria-checked': String(a.vendida),
      'aria-label': `Marcar «${a.nombre}» como vendida`,
      onClick: () => toggleSold(a, toggle),
    },
    el('span', { class: 'interruptor-perilla', 'aria-hidden': 'true' }),
  );

  return el(
    'li',
    { class: 'flex flex-wrap items-center gap-4 py-4 sm:flex-nowrap' },
    el('img', {
      src: a.imagen_thumb_url || a.imagen_url || '',
      alt: a.nombre,
      loading: 'lazy',
      class: 'h-20 w-20 shrink-0 bg-marfil object-cover',
    }),
    el(
      'div',
      { class: 'min-w-0 flex-1 basis-40' },
      el('p', { class: 'truncate font-serif text-xl', text: a.nombre }),
      el('p', { class: 'text-sm text-tinta', text: formatCOP(a.precio) }),
      detalles && el('p', { class: 'truncate text-sm text-piedra', text: detalles }),
    ),
    el(
      'div',
      { class: 'flex items-center gap-2 text-sm text-piedra' },
      toggle,
      el('span', { class: a.vendida ? 'font-medium text-vendida' : '', text: a.vendida ? 'Vendida' : 'Disponible', 'data-estado': '' }),
    ),
    el(
      'div',
      { class: 'flex gap-2' },
      el('button', { type: 'button', class: 'boton-secundario', text: 'Editar', 'aria-label': `Editar «${a.nombre}»`, onClick: () => openForm(a) }),
      el('button', { type: 'button', class: 'boton-peligro', text: 'Eliminar', 'aria-label': `Eliminar «${a.nombre}»`, onClick: () => openDelete(a) }),
    ),
  );
}

async function toggleSold(a, toggle) {
  toggle.disabled = true;
  try {
    const { data } = await api(`/api/artworks/${a.id}/sold`, { method: 'PATCH', body: { vendida: !a.vendida } });
    const i = state.items.findIndex((x) => x.id === a.id);
    if (i >= 0) state.items[i] = data;
    renderList();
    toast(data.vendida ? `«${data.nombre}» marcada como vendida.` : `«${data.nombre}» marcada como disponible.`);
    document.querySelectorAll('#lista [role="switch"]')[i]?.focus();
  } catch (err) {
    if (err.status !== 401) toast(err.message, 'error');
    toggle.disabled = false;
  }
}

$('form-busqueda').addEventListener('submit', (e) => e.preventDefault());
$('busqueda').addEventListener(
  'input',
  debounce((e) => {
    state.q = e.target.value.trim();
    state.page = 1;
    loadArtworks();
  }, 350),
);
$('btn-prev').addEventListener('click', () => {
  state.page -= 1;
  loadArtworks();
});
$('btn-next').addEventListener('click', () => {
  state.page += 1;
  loadArtworks();
});

/* --------------------------- Formulario de obra --------------------------- */

const dlgObra = $('dlg-obra');
const formObra = $('form-obra');
const errorForm = $('error-form');
const fileInput = $('f-imagen');
const preview = $('preview');
const previewWrap = $('preview-wrap');
let editing = null;
let objectUrl = null;
let lastFocus = null;

const CAMPOS = {
  nombre: $('f-nombre'),
  precio: $('f-precio'),
  estilo_tecnica: $('f-estilo'),
  ancho_cm: $('f-ancho'),
  alto_cm: $('f-alto'),
  profundidad_cm: $('f-prof'),
  descripcion: $('f-descripcion'),
  imagen: fileInput,
};

function setFieldError(campo, mensaje) {
  const input = CAMPOS[campo];
  const p = $(`e-${campo}`);
  if (!input || !p) return false;
  p.textContent = mensaje || '';
  p.hidden = !mensaje;
  if (mensaje) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  return true;
}

function clearErrors() {
  Object.keys(CAMPOS).forEach((c) => setFieldError(c, ''));
  errorForm.hidden = true;
  errorForm.textContent = '';
}

function setPreview(src) {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  if (src && src.startsWith('blob:')) objectUrl = src;
  preview.src = src || '';
  previewWrap.hidden = !src;
}

function openForm(artwork) {
  lastFocus = document.activeElement;
  editing = artwork;
  formObra.reset();
  clearErrors();
  setPreview(null);

  $('dlg-obra-titulo').textContent = artwork ? 'Editar obra' : 'Nueva obra';
  $('imagen-req').hidden = Boolean(artwork);
  $('ayuda-imagen').textContent = artwork
    ? 'Déjalo vacío para conservar la imagen actual. JPG, PNG o WebP, máximo 8 MB.'
    : 'JPG, PNG o WebP. Máximo 8 MB.';

  if (artwork) {
    CAMPOS.nombre.value = artwork.nombre;
    CAMPOS.precio.value = artwork.precio;
    CAMPOS.estilo_tecnica.value = artwork.estilo_tecnica ?? '';
    CAMPOS.ancho_cm.value = artwork.ancho_cm ?? '';
    CAMPOS.alto_cm.value = artwork.alto_cm ?? '';
    CAMPOS.profundidad_cm.value = artwork.profundidad_cm ?? '';
    CAMPOS.descripcion.value = artwork.descripcion ?? '';
    $('f-vendida').checked = artwork.vendida;
    preview.alt = `Imagen actual de ${artwork.nombre}`;
    setPreview(artwork.imagen_thumb_url || artwork.imagen_url);
  } else {
    preview.alt = 'Vista previa de la imagen seleccionada';
  }
  dlgObra.showModal();
  CAMPOS.nombre.focus();
}

function closeForm() {
  dlgObra.close();
}

dlgObra.addEventListener('close', () => {
  setPreview(null);
  lastFocus?.focus?.();
});
$('btn-cancelar').addEventListener('click', closeForm);
$('btn-nueva').addEventListener('click', () => openForm(null));

fileInput.addEventListener('change', () => {
  setFieldError('imagen', '');
  const file = fileInput.files[0];
  if (!file) {
    setPreview(editing ? editing.imagen_thumb_url || editing.imagen_url : null);
    return;
  }
  const problema = validateImage(file);
  if (problema) {
    setFieldError('imagen', problema);
    fileInput.value = '';
    setPreview(editing ? editing.imagen_thumb_url || editing.imagen_url : null);
    return;
  }
  preview.alt = 'Vista previa de la imagen seleccionada';
  setPreview(URL.createObjectURL(file));
});

function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen supera el máximo de 8 MB.';
  return '';
}

/** Valida en el cliente. Devuelve { campo: mensaje } (vacío si todo está bien). */
function validateForm() {
  const errores = {};
  if (!CAMPOS.nombre.value.trim()) errores.nombre = 'El nombre es requerido.';

  const precio = CAMPOS.precio.value.trim();
  if (!precio) errores.precio = 'El precio es requerido.';
  else if (!/^\d+$/.test(precio) || Number(precio) < 1) errores.precio = 'Ingresa un número entero mayor que 0.';

  for (const c of ['ancho_cm', 'alto_cm', 'profundidad_cm']) {
    const v = CAMPOS[c].value.trim();
    if (v && !(Number(v) > 0 && Number(v) <= 10000)) errores[c] = 'Debe ser un número mayor que 0.';
  }

  const file = fileInput.files[0];
  if (file) {
    const problema = validateImage(file);
    if (problema) errores.imagen = problema;
  } else if (!editing) {
    errores.imagen = 'La imagen de la obra es requerida.';
  }
  return errores;
}

formObra.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const errores = validateForm();
  const campos = Object.keys(errores);
  if (campos.length) {
    campos.forEach((c) => setFieldError(c, errores[c]));
    CAMPOS[campos[0]].focus();
    return;
  }

  const fd = new FormData();
  ['nombre', 'precio', 'estilo_tecnica', 'ancho_cm', 'alto_cm', 'profundidad_cm', 'descripcion'].forEach((c) =>
    fd.append(c, CAMPOS[c].value.trim()),
  );
  fd.append('vendida', $('f-vendida').checked ? 'true' : 'false');
  if (fileInput.files[0]) fd.append('imagen', fileInput.files[0]);

  const btn = $('btn-guardar');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const wasEditing = Boolean(editing);
    const url = wasEditing ? `/api/artworks/${editing.id}` : '/api/artworks';
    const { data } = await api(url, { method: wasEditing ? 'PUT' : 'POST', body: fd });
    closeForm();
    toast(wasEditing ? `«${data.nombre}» actualizada.` : `«${data.nombre}» creada.`);
    if (!wasEditing) {
      state.page = 1;
      state.q = '';
      $('busqueda').value = '';
    }
    loadArtworks();
  } catch (err) {
    if (err.status === 401) return;
    let generales = [];
    if (err.detalles.length) {
      generales = err.detalles.filter((d) => !setFieldError(d.campo, d.mensaje)).map((d) => d.mensaje);
      const primero = err.detalles.find((d) => CAMPOS[d.campo]);
      if (primero) CAMPOS[primero.campo].focus();
    }
    if (!err.detalles.length || generales.length) {
      errorForm.textContent = err instanceof ApiError ? err.message : 'No se pudo guardar la obra.';
      errorForm.hidden = false;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

/* ------------------------------ Eliminar ------------------------------ */

const dlgBorrar = $('dlg-borrar');
const btnSi = $('btn-borrar-si');
const errorBorrar = $('error-borrar');
let toDelete = null;
let lastFocusDelete = null;

function openDelete(a) {
  lastFocusDelete = document.activeElement;
  toDelete = a;
  errorBorrar.hidden = true;
  $('dlg-borrar-texto').textContent = `¿Seguro que quieres eliminar «${a.nombre}»? También se borrará su imagen y no se puede deshacer.`;
  dlgBorrar.showModal();
  $('btn-borrar-no').focus(); // foco en la opción segura
}

dlgBorrar.addEventListener('close', () => {
  if (lastFocusDelete?.isConnected) lastFocusDelete.focus();
  else $('btn-nueva').focus();
});
$('btn-borrar-no').addEventListener('click', () => dlgBorrar.close());
dlgBorrar.addEventListener('click', (e) => {
  if (e.target === dlgBorrar) dlgBorrar.close(); // clic en el fondo
});

btnSi.addEventListener('click', async () => {
  btnSi.disabled = true;
  btnSi.textContent = 'Eliminando…';
  errorBorrar.hidden = true;
  try {
    await api(`/api/artworks/${toDelete.id}`, { method: 'DELETE' });
    const nombre = toDelete.nombre;
    lastFocusDelete = null;
    dlgBorrar.close();
    toast(`«${nombre}» eliminada.`);
    loadArtworks();
  } catch (err) {
    if (err.status === 401) return;
    errorBorrar.textContent = err.message;
    errorBorrar.hidden = false;
  } finally {
    btnSi.disabled = false;
    btnSi.textContent = 'Eliminar';
  }
});

init();
