// Utilidades de interfaz. Todo el contenido dinámico se inserta con textContent (nunca innerHTML).

/** Crea un elemento: props admite class, text, on<Evento> y cualquier atributo. */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

/** Mensaje temporal accesible (región aria-live #avisos). tipo: 'exito' | 'error' */
export function toast(mensaje, tipo = 'exito') {
  const cont = document.getElementById('avisos');
  if (!cont) return;
  const color = tipo === 'error' ? 'border-vendida text-vendida' : 'border-acento text-tinta';
  const aviso = el('p', { class: `border-l-4 bg-white px-4 py-3 text-sm shadow-tarjeta ${color}`, text: mensaje });
  cont.append(aviso);
  setTimeout(() => aviso.remove(), tipo === 'error' ? 7000 : 4000);
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
