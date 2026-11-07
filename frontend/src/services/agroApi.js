// Funciones por recurso. Solo existen aquí los endpoints reales del backend.
import { apiRequest } from "./api";

function toQuery(params) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value).trim());
    }
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });

export const authApi = {
  login: (email, password) =>
    apiRequest("/auth/login", json("POST", { email, password })),
  register: (data) => apiRequest("/auth/register", json("POST", data)),
  me: () => apiRequest("/auth/me", { skipAuthEvent: true }),
  updateProfile: (data) => apiRequest("/auth/me", json("PUT", data)),
};

export const catalogApi = {
  categories: () => apiRequest("/categories"),
  // El backend solo filtra por `search` (nombre) y `categoryId`.
  products: ({ search, categoryId } = {}) =>
    apiRequest(`/products${toQuery({ search, categoryId })}`),
  product: (id) => apiRequest(`/products/${encodeURIComponent(id)}`),
  createProduct: (data) => apiRequest("/products", json("POST", data)),
  updateProduct: (id, data) =>
    apiRequest(`/products/${encodeURIComponent(id)}`, json("PUT", data)),
  deactivateProduct: (id) =>
    apiRequest(`/products/${encodeURIComponent(id)}/deactivate`, {
      method: "PATCH",
    }),
};

export const requestsApi = {
  list: () => apiRequest("/purchase-requests"),
  create: (data) => apiRequest("/purchase-requests", json("POST", data)),
  updateStatus: (id, status) =>
    apiRequest(
      `/purchase-requests/${encodeURIComponent(id)}/status`,
      json("PATCH", { status })
    ),
};
