export const ROLES = { BUYER: "BUYER", PRODUCER: "PRODUCER" };

export const ROLE_LABELS = { BUYER: "Comprador", PRODUCER: "Productor" };

// Estados reales de PurchaseRequest.status en el backend.
export const STATUS_META = {
  PENDING: {
    label: "Pendiente",
    tone: "pending",
    icon: "clock",
    hint: "Esperando la respuesta del productor.",
  },
  ACCEPTED: {
    label: "Aceptada",
    tone: "accepted",
    icon: "check",
    hint: "El productor aceptó la solicitud. Falta confirmar la entrega.",
  },
  COMPLETED: {
    label: "Completada",
    tone: "completed",
    icon: "box",
    hint: "El productor registró la entrega como completada.",
  },
  REJECTED: {
    label: "Rechazada",
    tone: "rejected",
    icon: "ban",
    hint: "El productor rechazó esta solicitud.",
  },
  CANCELLED: {
    label: "Cancelada",
    tone: "cancelled",
    icon: "close",
    hint: "El comprador canceló esta solicitud.",
  },
};

export const STATUS_ORDER = [
  "PENDING",
  "ACCEPTED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

export const TRANSPORT_LABELS = { TERRESTRE: "Terrestre", FLUVIAL: "Fluvial" };

// Sugerencias para el campo libre "unidad" (el backend acepta cualquier texto).
export const UNIT_SUGGESTIONS = [
  "kg",
  "lb",
  "tonelada",
  "bulto",
  "unidad",
  "docena",
  "litro",
  "caja",
];
