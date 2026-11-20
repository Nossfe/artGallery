import { api } from './api.js';
import { el } from './ui.js';

const $ = (id) => document.getElementById(id);
const estado = $('acerca-estado');
const contenido = $('acerca-contenido');

function mostrarEstado(...nodos) {
  estado.replaceChildren(...nodos);
  estado.hidden = nodos.length === 0;
}

function esUrlSegura(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function renderAbout(a) {
  const hayAlgo = Boolean(
    a.nombre || a.biografia || a.foto_url || a.whatsapp || a.email || a.ubicacion || a.instagram || a.facebook || a.tiktok,
  );

  if (!hayAlgo) {
    contenido.hidden = true;
    mostrarEstado(
      el('p', { class: 'font-serif text-3xl text-tinta', text: 'Próximamente' }),
      el('p', { class: 'mt-3', text: 'Aún no se ha publicado la biografía ni los datos de contacto.' }),
      el('a', { href: '/', class: 'boton-secundario mt-6', text: 'Volver a la galería' }),
    );
    return;
  }

  mostrarEstado();
  contenido.hidden = false;

  const fotoWrap = $('foto-wrap');
  const bioCol = $('bio-col');
  if (a.foto_url) {
    const img = $('artista-foto');
    img.src = a.foto_url;
    img.alt = a.nombre ? `Retrato de ${a.nombre}` : 'Retrato de la artista';
    fotoWrap.hidden = false;
    bioCol.className = 'md:col-span-7';
  } else {
    fotoWrap.hidden = true;
    bioCol.className = 'md:col-span-12 max-w-2xl';
  }

  $('artista-nombre').textContent = a.nombre || 'Acerca de mí';

  const bioCont = $('artista-bio');
  const parrafos = (a.biografia || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parrafos.length) {
    bioCont.replaceChildren(...parrafos.map((texto) => el('p', { class: 'whitespace-pre-line', text: texto })));
  } else {
    bioCont.replaceChildren();
  }

  let hayContacto = false;

  const bloqueWa = $('bloque-whatsapp');
  if (a.whatsapp_url) {
    hayContacto = true;
    $('texto-whatsapp').textContent = `+${a.whatsapp}`;
    const enlaceWa = $('enlace-whatsapp');
    enlaceWa.href = a.whatsapp_url;
    bloqueWa.hidden = false;
  } else {
    bloqueWa.hidden = true;
  }

  const bloqueEmail = $('bloque-email');
  if (a.email) {
    hayContacto = true;
    const enlaceEmail = $('enlace-email');
    enlaceEmail.href = `mailto:${a.email}`;
    enlaceEmail.textContent = a.email;
    bloqueEmail.hidden = false;
  } else {
    bloqueEmail.hidden = true;
  }

  const bloqueUbic = $('bloque-ubicacion');
  if (a.ubicacion) {
    hayContacto = true;
    $('texto-ubicacion').textContent = a.ubicacion;
    bloqueUbic.hidden = false;
  } else {
    bloqueUbic.hidden = true;
  }

  const redes = [
    ['Instagram', a.instagram],
    ['Facebook', a.facebook],
    ['TikTok', a.tiktok],
  ].filter(([, url]) => esUrlSegura(url));

  const bloqueRedes = $('bloque-redes');
  if (redes.length) {
    hayContacto = true;
    $('lista-redes').replaceChildren(
      ...redes.map(([label, url]) =>
        el(
          'li',
          {},
          el('a', {
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            class: 'boton-secundario',
            text: label,
          }),
        ),
      ),
    );
    bloqueRedes.hidden = false;
  } else {
    bloqueRedes.hidden = true;
  }

  $('seccion-contacto').hidden = !hayContacto;
}

async function load() {
  contenido.hidden = true;
  mostrarEstado(el('p', { text: 'Cargando información…' }));
  try {
    const { data } = await api('/api/about', { redirectOn401: false });
    renderAbout(data);
  } catch (err) {
    mostrarEstado(
      el('p', { text: err.message || 'No se pudo cargar la información.' }),
      el('button', { type: 'button', class: 'boton-secundario mt-4', text: 'Reintentar', onClick: load }),
    );
  }
}

load();
