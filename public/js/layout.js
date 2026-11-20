// Comportamiento común del encabezado y pie de página
const toggle = document.getElementById('menu-toggle');
const menu = document.getElementById('menu-principal');

if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const abierto = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!abierto));
    menu.classList.toggle('hidden', abierto);
    menu.classList.toggle('flex', !abierto);
  });
}

const anio = document.getElementById('anio');
if (anio) anio.textContent = new Date().getFullYear();
