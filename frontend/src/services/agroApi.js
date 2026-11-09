// Funciones por recurso. Conserva intactas las firmas Fase 1 y añade los módulos Fase 2 e Innovación.
import { apiRequest } from "./api";

function toQuery(params = {}) {
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
  products: ({
    search,
    categoryId,
    location,
    minPrice,
    maxPrice,
    originNodeId,
  } = {}) =>
    apiRequest(
      `/products${toQuery({
        search,
        categoryId,
        location,
        minPrice,
        maxPrice,
        originNodeId,
      })}`
    ),
  product: (id) => apiRequest(`/products/${encodeURIComponent(id)}`),
  createProduct: (data) => apiRequest("/products", json("POST", data)),
  updateProduct: (id, data) =>
    apiRequest(`/products/${encodeURIComponent(id)}`, json("PUT", data)),
  deactivateProduct: (id) =>
    apiRequest(`/products/${encodeURIComponent(id)}/deactivate`, {
      method: "PATCH",
    }),
  parseDraft: (text) =>
    apiRequest("/products/parse-draft", json("POST", { text })),
};

export const logisticsApi = {
  nodes: (params = {}) => apiRequest(`/logistics/nodes${toQuery(params)}`),
  segments: () => apiRequest("/logistics/segments"),
  riverStatus: () => apiRequest("/logistics/river-status"),
  quote: (data) => apiRequest("/logistics/quote", json("POST", data)),
  fairPrice: (data) => apiRequest("/logistics/fair-price", json("POST", data)),
};

export const poolsApi = {
  available: (params = {}) => apiRequest(`/pools/available${toQuery(params)}`),
  list: (params = {}) => apiRequest(`/pools${toQuery(params)}`),
  join: (data) => apiRequest("/pools/join", json("POST", data)),
};

export const requestsApi = {
  list: () => apiRequest("/purchase-requests"),
  create: (data) => apiRequest("/purchase-requests", json("POST", data)),
  updateStatus: (id, status) =>
    apiRequest(
      `/purchase-requests/${encodeURIComponent(id)}/status`,
      json("PATCH", { status })
    ),
  counteroffer: (id, data) =>
    apiRequest(
      `/requests/${encodeURIComponent(id)}/counteroffer`,
      json("PATCH", data)
    ),
  respondCounteroffer: (id, decision) =>
    apiRequest(
      `/requests/${encodeURIComponent(id)}/counteroffer/respond`,
      json("PATCH", { decision })
    ),
  tracking: (id) =>
    apiRequest(`/requests/${encodeURIComponent(id)}/tracking`),
  addTracking: (id, data) =>
    apiRequest(
      `/requests/${encodeURIComponent(id)}/tracking`,
      json("POST", data)
    ),
  fundEscrow: (id) =>
    apiRequest(`/requests/${encodeURIComponent(id)}/escrow/fund`, {
      method: "POST",
    }),
};
