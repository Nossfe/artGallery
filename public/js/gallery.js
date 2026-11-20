import { api } from './api.js';
import { el } from './ui.js';
import { formatCOP, formatDimensions } from './format.js';
import { openLightbox } from './lightbox.js';

const PAGE_SIZE = 12;

const $ = (id) => document.getElementById(id);
const grid = $('galeria');
const estado = $('galeria-estado');
const masWrap = $('mas-wrap');
const btnMas = $('btn-mas');
const selEstilo = $('filtro-estilo');
const selDisp = $('filtro-disponibilidad');
const btnLimpiar = $('btn-limpiar');
const resumen = $('galeria-resumen');

const state = { page: 1, estilo: '', disp: '', loadId: 0, total: 0, totalPages: 1, loading: false };

/* ------------------------------- Carga ------------------------------- */

function hayFiltros() {
  return Boolean(state.estilo || state.disp);
}

function mostrarEstado(...nodos) {
  estado.replaceChildren(...nodos);
  estado.hidden = nodos.length === 0;
}

function esqueletos() {
  grid.replaceChildren(
    ...Array.from({ length: 6 }, () =>
      el('li', { class: 'tarjeta-obra animate-pulse', 'aria-hidden': 'true' }, el('div', { class: 'aspect-[4/5] bg-marfil' }), el('div', { class: 'space-y-3 p-5' }, el('div', { class: 'h-5 w-2/3 bg-marfil' }), el('div', { class: 'h-4 w-1/3 bg-marfil' }))),
    ),
  );
}

async function load({ append = false } = {}) {
  const id = ++state.loadId;
  state.loading = true;
  masWrap.hidden = true;
  if (!append) {
    esqueletos();
    mostrarEstado();
    resumen.textContent = 'Cargando obras…';
  } else {
    btnMas.disabled = true;
    btnMas.textContent = 'Cargando…';
  }

  const params = new URLSearchParams({ page: state.page, limit: PAGE_SIZE });
  if (state.estilo) params.set('estilo', state.estilo);
  if (state.disp) params.set('vendida', state.disp === 'vendidas' ? 'true' : 'false');

  try {
    const res = await api(`/api/artworks?${params}`, { redirectOn401: false });
    if (id !== state.loadId) return;
    state.total = res.pagination.total;
    state.totalPages = res.pagination.totalPages;
    if (!append) grid.replaceChildren();
    grid.append(...res.data.map(renderCard));
    render();
  } catch (err) {
    if (id !== state.loadId) return;
    if (!append) grid.replaceChildren();
    resumen.textContent = '';
    if (append) state.page -= 1;
    mostrarEstado(
      el('p', { text: err.message || 'No se pudieron cargar las obras.' }),
      el('button', { type: 'button', class: 'boton-secundario mt-4', text: 'Reintentar', onClick: () => load({ append }) }),
    );
    if (append) {
      btnMas.disabled = false;
      btnMas.textContent = 'Ver más obras';
      masWrap.hidden = false;
    }
  } finally {
    if (id === state.loadId) state.loading = false;
  }
}

function render() {
  const mostradas = grid.children.length;
  btnLimpiar.hidden = !hayFiltros();

  if (state.total === 0) {
    resumen.textContent = '';
    mostrarEstado(
      el('p', { class: 'font-serif text-2xl text-tinta', text: hayFiltros() ? 'Ninguna obra coincide con los filtros.' : 'Pronto habrá nuevas obras.' }),
      el('p', { class: 'mt-2', text: hayFiltros() ? 'Prueba con otra combinación.' : 'Vuelve en unos días para descubrir la colección.' }),
      hayFiltros() && el('button', { type: 'button', class: 'boton-secundario mt-6', text: 'Quitar filtros', onClick: limpiarFiltros }),
    );
    masWrap.hidden = true;
    return;
  }

  mostrarEstado();
  resumen.textContent = `Mostrando ${mostradas} de ${state.total} ${state.total === 1 ? 'obra' : 'obras'}`;
  const quedan = state.page < state.totalPages;
  masWrap.hidden = !quedan;
  btnMas.disabled = false;
  btnMas.textContent = 'Ver más obras';
}

/* ------------------------------- Tarjeta ------------------------------- */

function renderCard(a) {
  const dims = formatDimensions(a);
  const imagen = el('img', {
    src: a.imagen_thumb_url || a.imagen_url || '',
    alt: a.nombre,
    loading: 'lazy',
    decoding: 'async',
    class: 'h-full w-full object-contain p-4',
  });

  const abrir = el(
    'button',
    {
      type: 'button',
      class: 'block aspect-[4/5] w-full cursor-zoom-in bg-marfil',
      'aria-label': `Ampliar imagen de «${a.nombre}»`,
      onClick: (e) => openLightbox({ src: a.imagen_url, alt: a.nombre, trigger: e.currentTarget }),
    },
    imagen,
  );

  const compra = a.vendida
    ? el('button', { type: 'button', class: 'boton w-full', disabled: true, text: 'Vendida' })
    : a.whatsapp_url
      ? el('a', {
          href: a.whatsapp_url,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'boton w-full',
          'aria-label': `Comprar «${a.nombre}» por WhatsApp`,
          text: 'Comprar',
        })
      : el('button', { type: 'button', class: 'boton w-full', disabled: true, text: 'No disponible por ahora' });

  return el(
    'li',
    { class: 'tarjeta-obra flex flex-col' },
    el('div', { class: 'relative' }, abrir, a.vendida && el('span', { class: 'insignia-vendida absolute left-4 top-4', text: 'Vendida' })),
    el(
      'div',
      { class: 'flex flex-1 flex-col p-5' },
      el('h2', { class: 'text-2xl leading-snug', text: a.nombre }),
      el('p', { class: 'mt-1 text-lg', text: formatCOP(a.precio) }),
      el(
        'dl',
        { class: 'mt-3 space-y-1 text-sm text-piedra' },
        dims && el('div', {}, el('dt', { class: 'sr-only', text: 'Dimensiones' }), el('dd', { text: dims })),
        a.estilo_tecnica && el('div', {}, el('dt', { class: 'sr-only', text: 'Estilo o técnica' }), el('dd', { text: a.estilo_tecnica })),
      ),
      el('div', { class: 'mt-5 flex-1' }),
      compra,
    ),
  );
}

/* ------------------------------- Filtros ------------------------------- */

function aplicarFiltros() {
  state.estilo = selEstilo.value;
  state.disp = selDisp.value;
  state.page = 1;
  load();
}

function limpiarFiltros() {
  selEstilo.value = '';
  selDisp.value = '';
  aplicarFiltros();
}

selEstilo.addEventListener('change', aplicarFiltros);
selDisp.addEventListener('change', aplicarFiltros);
btnLimpiar.addEventListener('click', limpiarFiltros);
btnMas.addEventListener('click', () => {
  if (state.loading) return;
  state.page += 1;
  load({ append: true });
});

async function loadEstilos() {
  try {
    const { data } = await api('/api/artworks/estilos', { redirectOn401: false });
    selEstilo.append(...data.map((e) => el('option', { value: e, text: e })));
  } catch {
    /* el filtro por estilo simplemente queda sin opciones */
  }
}

loadEstilos();
load();
