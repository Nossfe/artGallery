// Lightbox accesible: <dialog> modal a pantalla completa con zoom.
// Cierra con Esc (nativo), clic fuera de la imagen y botón. Devuelve el foco al elemento que lo abrió.
import { el } from './ui.js';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

let dialog;
let scroller;
let img;
let estado;
let btnMas;
let btnMenos;
let btnReset;
let zoom = 1;
let trigger = null;

function build() {
  const cerrar = el('button', {
    type: 'button',
    class: 'lb-btn',
    'aria-label': 'Cerrar',
    text: '✕',
    autofocus: true,
    onClick: () => dialog.close(),
  });
  btnMenos = el('button', { type: 'button', class: 'lb-btn', 'aria-label': 'Alejar', text: '−', onClick: () => setZoom(zoom - ZOOM_STEP) });
  btnReset = el('button', { type: 'button', class: 'lb-btn text-xs', 'aria-label': 'Restablecer zoom', text: '100%', onClick: () => setZoom(1) });
  btnMas = el('button', { type: 'button', class: 'lb-btn', 'aria-label': 'Acercar', text: '+', onClick: () => setZoom(zoom + ZOOM_STEP) });

  estado = el('p', { class: 'absolute inset-0 grid place-items-center text-lienzo', text: 'Cargando imagen…' });
  img = el('img', { class: 'm-auto block max-w-none cursor-zoom-in select-none', alt: '', draggable: 'false' });
  scroller = el('div', { class: 'relative flex h-full w-full overflow-auto p-4 pb-20 pt-16' }, estado, img);

  dialog = el(
    'dialog',
    {
      class: 'm-0 h-full max-h-none w-full max-w-none bg-tinta/95 p-0 text-lienzo backdrop:bg-tinta',
      'aria-modal': 'true',
      'aria-label': 'Imagen ampliada',
    },
    el('div', { class: 'fixed right-4 top-4 z-10 flex gap-2' }, cerrar),
    el('div', { class: 'fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2' }, btnMenos, btnReset, btnMas),
    scroller,
  );
  document.body.append(dialog);

  // Clic fuera de la imagen (en el fondo) cierra; clic sobre la imagen alterna el zoom.
  scroller.addEventListener('click', (e) => {
    if (e.target === img) setZoom(zoom > 1 ? 1 : 2);
    else if (e.target === scroller || e.target === dialog) dialog.close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') setZoom(zoom + ZOOM_STEP);
    else if (e.key === '-' || e.key === '_') setZoom(zoom - ZOOM_STEP);
    else if (e.key === '0') setZoom(1);
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('overflow-hidden');
    img.removeAttribute('src');
    window.removeEventListener('resize', applyZoom);
    if (trigger && trigger.isConnected) trigger.focus();
    trigger = null;
  });
  img.addEventListener('load', () => {
    estado.hidden = true;
    applyZoom();
  });
  img.addEventListener('error', () => {
    estado.textContent = 'No se pudo cargar la imagen.';
    estado.hidden = false;
  });
}

// Ancho base: la imagen completa dentro del área visible (sin ampliar más allá del contenedor).
function fitWidth() {
  const style = getComputedStyle(scroller);
  const w = scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const h = scroller.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  return Math.max(50, Math.min(w, h * ratio));
}

function applyZoom() {
  if (!img.naturalWidth) return;
  img.style.width = `${fitWidth() * zoom}px`;
  img.classList.toggle('cursor-zoom-in', zoom <= 1);
  img.classList.toggle('cursor-zoom-out', zoom > 1);
  btnReset.textContent = `${Math.round(zoom * 100)}%`;
  btnMenos.disabled = zoom <= ZOOM_MIN;
  btnMas.disabled = zoom >= ZOOM_MAX;
}

function setZoom(value) {
  zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
  applyZoom();
}

export function openLightbox({ src, alt, trigger: opener }) {
  if (!dialog) build();
  trigger = opener || document.activeElement;
  zoom = 1;
  estado.textContent = 'Cargando imagen…';
  estado.hidden = false;
  img.alt = alt;
  img.style.width = '';
  dialog.setAttribute('aria-label', `Imagen ampliada: ${alt}`);
  document.documentElement.classList.add('overflow-hidden');
  window.addEventListener('resize', applyZoom);
  dialog.showModal();
  img.src = src;
}
