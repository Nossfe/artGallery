import { api, ApiError, LOGIN_URL } from './api.js';
import { el, toast } from './ui.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const $ = (id) => document.getElementById(id);
const main = $('contenido');
const estado = $('acerca-estado');
const form = $('form-acerca');
const errorForm = $('error-form');
const fileInput = $('f-foto');
const previewWrap = $('preview-wrap');
const preview = $('preview');
const checkEliminar = $('f-eliminar-foto');

const CAMPOS = {
  nombre: $('f-nombre'),
  biografia: $('f-biografia'),
  whatsapp: $('f-whatsapp'),
  email: $('f-email'),
  ubicacion: $('f-ubicacion'),
  instagram: $('f-instagram'),
  facebook: $('f-facebook'),
  tiktok: $('f-tiktok'),
  foto: fileInput,
};

let currentFotoUrl = null;
let objectUrl = null;

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

function setPreview(src, showDeleteOption = false) {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  if (src && src.startsWith('blob:')) objectUrl = src;
  preview.src = src || '';
  previewWrap.hidden = !src;
  checkEliminar.closest('div').hidden = !showDeleteOption;
  if (!showDeleteOption) checkEliminar.checked = false;
}

function fillForm(data) {
  CAMPOS.nombre.value = data.nombre || '';
  CAMPOS.biografia.value = data.biografia || '';
  CAMPOS.whatsapp.value = data.whatsapp || '';
  CAMPOS.email.value = data.email || '';
  CAMPOS.ubicacion.value = data.ubicacion || '';
  CAMPOS.instagram.value = data.instagram || '';
  CAMPOS.facebook.value = data.facebook || '';
  CAMPOS.tiktok.value = data.tiktok || '';
  fileInput.value = '';
  checkEliminar.checked = false;
  currentFotoUrl = data.foto_thumb_url || data.foto_url || null;
  setPreview(currentFotoUrl, Boolean(currentFotoUrl));
}

function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen supera el máximo de 8 MB.';
  return '';
}

function validateUrl(val) {
  if (!val) return '';
  try {
    const parsed = new URL(val);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return 'La URL debe empezar por https:// o http://.';
    }
    return '';
  } catch {
    return 'Escribe una URL válida (ej. https://instagram.com/tuusuario).';
  }
}

function validateForm() {
  const errores = {};
  const wa = CAMPOS.whatsapp.value.replace(/[\s\-()+]/g, '');
  if (wa && !/^\d{7,15}$/.test(wa)) {
    errores.whatsapp = 'Usa solo dígitos con código de país (entre 7 y 15 dígitos).';
  }
  const email = CAMPOS.email.value.trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errores.email = 'Escribe un correo electrónico válido.';
  }
  for (const red of ['instagram', 'facebook', 'tiktok']) {
    const msg = validateUrl(CAMPOS[red].value.trim());
    if (msg) errores[red] = msg;
  }
  const file = fileInput.files[0];
  if (file) {
    const msg = validateImage(file);
    if (msg) errores.foto = msg;
  }
  return errores;
}

fileInput.addEventListener('change', () => {
  setFieldError('foto', '');
  const file = fileInput.files[0];
  if (!file) {
    setPreview(currentFotoUrl, Boolean(currentFotoUrl));
    return;
  }
  const msg = validateImage(file);
  if (msg) {
    setFieldError('foto', msg);
    fileInput.value = '';
    setPreview(currentFotoUrl, Boolean(currentFotoUrl));
    return;
  }
  setPreview(URL.createObjectURL(file), false);
});

form.addEventListener('submit', async (e) => {
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
  ['nombre', 'biografia', 'whatsapp', 'email', 'ubicacion', 'instagram', 'facebook', 'tiktok'].forEach((c) =>
    fd.append(c, CAMPOS[c].value.trim()),
  );
  if (checkEliminar.checked && !fileInput.files[0]) {
    fd.append('eliminar_foto', 'true');
  }
  if (fileInput.files[0]) {
    fd.append('foto', fileInput.files[0]);
  }

  const btn = $('btn-guardar');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const { data } = await api('/api/about', { method: 'PUT', body: fd });
    fillForm(data);
    toast('Información actualizada correctamente.');
  } catch (err) {
    if (err.status === 401) return;
    let generales = [];
    if (err.detalles.length) {
      generales = err.detalles.filter((d) => !setFieldError(d.campo, d.mensaje)).map((d) => d.mensaje);
      const primero = err.detalles.find((d) => CAMPOS[d.campo]);
      if (primero) CAMPOS[primero.campo].focus();
    }
    if (!err.detalles.length || generales.length) {
      errorForm.textContent = err instanceof ApiError ? err.message : 'No se pudieron guardar los cambios.';
      errorForm.hidden = false;
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
});

$('btn-logout').addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST', redirectOn401: false });
  } finally {
    location.replace(LOGIN_URL);
  }
});

async function loadData() {
  estado.replaceChildren(el('p', { text: 'Cargando datos actuales…' }));
  estado.hidden = false;
  form.hidden = true;
  try {
    const { data } = await api('/api/about');
    fillForm(data);
    estado.hidden = true;
    form.hidden = false;
  } catch (err) {
    if (err.status === 401) return;
    estado.replaceChildren(
      el('p', { text: err.message || 'No se pudo cargar la información.' }),
      el('button', { type: 'button', class: 'boton-secundario mt-4', text: 'Reintentar', onClick: loadData }),
    );
  }
}

async function init() {
  try {
    const { admin } = await api('/api/auth/me');
    $('admin-email').textContent = admin.email;
    main.hidden = false;
    loadData();
  } catch (err) {
    if (err.status !== 401) {
      main.hidden = false;
      estado.replaceChildren(el('p', { text: 'No se pudo verificar la sesión. Recarga la página.' }));
    }
  }
}

init();
