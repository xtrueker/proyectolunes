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
  COUNTER_OFFERED: {
    label: "Contraoferta",
    tone: "counter",
    icon: "swap",
    hint: "El productor propuso nuevo precio o fecha de despacho.",
  },
  ACCEPTED: {
    label: "Aceptada",
    tone: "accepted",
    icon: "check",
    hint: "Acuerdo confirmado e inventario reservado.",
  },
  COMPLETED: {
    label: "Completada",
    tone: "completed",
    icon: "box",
    hint: "Entrega registrada como completada.",
  },
  REJECTED: {
    label: "Rechazada",
    tone: "rejected",
    icon: "ban",
    hint: "La solicitud o contraoferta fue rechazada.",
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
  "COUNTER_OFFERED",
  "ACCEPTED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

export const TRANSPORT_LABELS = {
  TERRESTRE: "Terrestre",
  FLUVIAL: "Fluvial",
  HIBRIDO: "Multimodal (Río + Tierra)",
};

export const NODE_TYPE_LABELS = {
  FLUVIAL_PORT: "Puerto fluvial",
  MIXED_PORT: "Puerto multimodal",
  LAND_HUB: "Centro terrestre",
};

export const POOL_STATUS_LABELS = {
  OPEN: "Abierto a consolidación",
  LOCKED: "Cupo completo",
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregado",
};

export const RIVER_CONDITION_OPTIONS = [
  {
    value: "NORMAL",
    label: "Caudal óptimo (Normal)",
    badge: "Navegable 100 %",
  },
  {
    value: "SEQUIA",
    label: "Alerta Estiaje / Sequía (IDEAM)",
    badge: "Bajo calado (+38 % t. río)",
  },
  {
    value: "CRECIENTE",
    label: "Alerta Creciente Alta",
    badge: "Corriente fuerte (+24 % t. río)",
  },
];

export const PERISHABILITY_OPTIONS = [
  { value: "LOW", label: "Baja (Granos, café, cacao seco)" },
  { value: "MEDIUM", label: "Media (Plátano, yuca, cítricos)" },
  { value: "HIGH", label: "Alta (Pescado, lácteos, hortalizas)" },
];

export const ESCROW_STATUS_META = {
  FUNDED: {
    label: "100 % Custodiado en Garantía",
    pct: 15,
    hint: "Fondos protegidos. Se liberará 30 % al registrar embarque/transbordo y 70 % al entregar.",
  },
  PARTIAL_RELEASED: {
    label: "30 % Anticipo Logístico Liberado",
    pct: 55,
    hint: "El productor recibió 30 % para cubrir flete fluvial/cargue tras verificar acopio o puerto.",
  },
  RELEASED: {
    label: "100 % Liquidado al Productor",
    pct: 100,
    hint: "Entrega verificada y pago total desembolsado sin intermediarios.",
  },
};

export const TRACKING_STAGES = [
  {
    value: "ORIGIN_HUB",
    label: "Centro de acopio origen",
    icon: "store",
    description: "Lote recibido y verificado en finca o puerto de salida.",
  },
  {
    value: "RIVER_TRANSIT",
    label: "Tránsito fluvial (Río Magdalena)",
    icon: "boat",
    description: "Carga navegando en chalupa o planchón por el río.",
  },
  {
    value: "PORT_TRANSFER",
    label: "Transbordo en puerto",
    icon: "anchor",
    description: "Descargue fluvial e inspección para paso a camión.",
  },
  {
    value: "LAND_TRANSIT",
    label: "Tránsito terrestre",
    icon: "truck",
    description: "Despacho en carretera rumbo a la ciudad de destino.",
  },
  {
    value: "DELIVERED",
    label: "Entregado en destino",
    icon: "check",
    description: "Carga recibida por el comprador mayorista.",
  },
];

export const TRACKING_STAGE_MAP = Object.fromEntries(
  TRACKING_STAGES.map((item) => [item.value, item])
);

export const UNIT_SUGGESTIONS = [
  "kg",
  "lb",
  "tonelada",
  "bulto",
  "arroba",
  "unidad",
  "docena",
  "litro",
  "caja",
];
