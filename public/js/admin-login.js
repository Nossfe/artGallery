import { api, ApiError } from './api.js';

const form = document.getElementById('form-login');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const errorBox = document.getElementById('error-login');
const boton = document.getElementById('btn-login');

function mostrarError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
}

if (new URLSearchParams(location.search).has('expirada')) {
  mostrarError('Tu sesión expiró. Inicia sesión de nuevo.');
}

// Si ya hay una sesión activa, ir directo al panel.
api('/api/auth/me', { redirectOn401: false })
  .then(() => location.replace('/admin/dashboard.html'))
  .catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarError('');
  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    mostrarError('Escribe un correo válido.');
    emailInput.focus();
    return;
  }
  if (!password) {
    mostrarError('Escribe tu contraseña.');
    passInput.focus();
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Entrando…';
  try {
    await api('/api/auth/login', { method: 'POST', body: { email, password }, redirectOn401: false });
    location.replace('/admin/dashboard.html');
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.';
    mostrarError(msg);
    passInput.value = '';
    passInput.focus();
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});
