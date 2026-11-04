// Cliente HTTP base. Mantiene las mismas claves de sesión y el mismo
// formato de respuesta ({ success, message, data }) que usa el backend.
export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const TOKEN_KEY = "agrored_token";
const USER_KEY = "agrored_user";

// Evento que se emite cuando el backend rechaza el token de una sesión activa.
export const UNAUTHORIZED_EVENT = "agrored:unauthorized";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSavedUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const { skipAuthEvent = false, ...fetchOptions } = options;
  const token = getToken();

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;

    const networkError = new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución."
    );
    networkError.status = 0;
    throw networkError;
  }

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  // Token vencido o inválido en una sesión activa (no aplica a login/registro).
  if (
    response.status === 401 &&
    token &&
    !skipAuthEvent &&
    !endpoint.startsWith("/auth/login") &&
    !endpoint.startsWith("/auth/register")
  ) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok || !result || result.success === false) {
    const error = new Error(
      result?.message || "Error al comunicarse con el servidor."
    );
    error.status = response.status;
    throw error;
  }

  return result;
}
