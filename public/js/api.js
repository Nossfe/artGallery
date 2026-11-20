// Cliente de la API compartido por las pantallas del panel.
export class ApiError extends Error {
  constructor(status, message, detalles) {
    super(message);
    this.status = status;
    this.detalles = detalles || [];
  }
}

export const LOGIN_URL = '/admin/login.html';

/**
 * Llama a la API. Si responde 401 (sesión caducada) redirige al login,
 * salvo que se indique redirectOn401: false (p. ej. en el propio login).
 */
export async function api(path, { method = 'GET', body, redirectOn401 = true } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }

  if (res.status === 401 && redirectOn401) {
    location.replace(`${LOGIN_URL}?expirada=1`);
    throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin JSON */
  }
  if (!res.ok) throw new ApiError(res.status, (data && data.error) || 'Ocurrió un error inesperado.', data && data.detalles);
  return data;
}
