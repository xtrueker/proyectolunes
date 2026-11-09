# Agro-Red Magdalena — Especificación Técnica de la API (Fases 1, 2 e Innovación)

## Base URL
`http://localhost:4000/api`

Formato estándar de respuesta:
- `success`: `boolean`
- `message`: `string` (en mutaciones y errores)
- `data`: objeto o arreglo del recurso
- `total`: conteo en listados

---

## 1. Salud y Catálogo Público

### `GET /health` y `GET /health/db`
Verifica disponibilidad del servicio Express y conectividad activa con SQLite / Prisma 7.

### `GET /categories`
Lista las 8 categorías agropecuarias y acuícolas del Magdalena Medio.

### `GET /products`
Parámetros opcionales:
- `search`: coincidencia en nombre o descripción.
- `categoryId`: identificador de categoría.
- `originNodeId`: nodo logístico de origen (`LogisticsNode`).
- `location`: texto de municipio/vereda.
- `minPrice` / `maxPrice`: rango de precio unitario en COP.

### `GET /products/:id`
Detalle público del lote incluyendo `category`, `producer` y `originNode`.

---

## 2. Autenticación y Perfiles (`/auth`)

- `POST /auth/register`: `{ name, email, password, role ("BUYER"|"PRODUCER"), location?, phone? }`
- `POST /auth/login`: `{ email, password }` → devuelve `{ token, user }`
- `GET /auth/me`: requiere `Authorization: Bearer <token>`
- `PUT /auth/me`: actualiza `{ name, location, phone }`

---

## 3. Gestión de Oferta para Productores (`/products`)

- `POST /products` (`PRODUCER`): crea lote con soporte opcional para `imageUrl`, `originNodeId` y `perishability` (`LOW` | `MEDIUM` | `HIGH`).
- `PUT /products/:id` (`PRODUCER`): actualiza precio, inventario, nodo, foto o perecibilidad.
- `PATCH /products/:id/deactivate` (`PRODUCER`): retira un producto activo del catálogo.
- `POST /products/parse-draft`: asistente rural en lenguaje natural; recibe `{ text }` y extrae producto, cantidad, unidad, precio, categoría y puerto.

---

## 4. Red Logística Multimodal y Precio Justo (`/logistics`)

- `GET /logistics/nodes`: lista puertos fluviales (`FLUVIAL_PORT`), puertos multimodales (`MIXED_PORT`) y centros terrestres (`LAND_HUB`).
- `GET /logistics/segments`: lista tramos conectados terrestres y fluviales con costos por tonelada, horas y tarifas de transbordo.
- `GET /logistics/river-status`: boletín hidrológico del Río Magdalena (`NORMAL`, `SEQUIA`, `CRECIENTE`).
- `POST /logistics/quote`: recibe `{ originNodeId, destNodeId, weightKg, riverCondition?, perishability? }` y compara rutas `TERRESTRE`, `FLUVIAL` e `HIBRIDO` calculando costo, horas, transbordos, riesgo de merma (%) y ahorro de $\text{CO}_2\text{e}$.
- `POST /logistics/fair-price`: calcula banda de Precio Justo directo (referencia SIPSA-DANE) frente a intermediación local y flete multimodal.

---

## 5. Consolidación Colaborativa de Carga (`/pools`)

- `GET /pools/available`: despachos abiertos filtrables por `originNodeId`, `destNodeId`, `date` (±48 h), `mode` y `minAvailableKg`.
- `GET /pools`: consulta general de pools (`OPEN`, `LOCKED`, `IN_TRANSIT`, `DELIVERED`).
- `POST /pools/join` (`BUYER` | `PRODUCER`): une una solicitud a un pool abierto (o crea uno automáticamente en ventana de 48 h) recalculando en transacción el flete individual prorrateado:
  $$\text{CostoIndividual} = \text{CostoTotalFlete} \times \frac{\text{PesoPedido}}{\text{PesoTotalPool}}$$

---

## 6. Solicitudes, Negociación, Trazabilidad y Escrow (`/purchase-requests` y `/requests`)

- `GET /purchase-requests`: lista solicitudes propias según rol incluyendo contraofertas, pool asignado, garantía Escrow y eventos de trazabilidad.
- `POST /purchase-requests` (`BUYER`): crea solicitud indicando ruta, nodos y modalidad (`TERRESTRE`, `FLUVIAL`, `HIBRIDO`).
- `PATCH /purchase-requests/:id/status`: transiciones `PENDING` → `ACCEPTED` (descuento atómico de stock) / `REJECTED` / `CANCELLED` y `ACCEPTED` → `COMPLETED`.
- `PATCH /requests/:id/counteroffer` (`PRODUCER`): propone `{ counterPrice, counterDate, negotiationNotes }` (`COUNTER_OFFERED`).
- `PATCH /requests/:id/counteroffer/respond` (`BUYER`): `{ decision: "ACCEPT" | "REJECT" }` con reserva atómica de inventario al aceptar.
- `POST /requests/:id/escrow/fund` (`BUYER`): constituye Garantía Protegida (*Escrow Rural*) con liberación automática 30 % en embarque/transbordo (`ORIGIN_HUB` / `PORT_TRANSFER`) y 70 % en entrega (`DELIVERED`).
- `GET /requests/:id/tracking` y `POST /requests/:id/tracking`: consulta y registro de hitos multimodales con evidencia fotográfica opcional (`evidenceImageUrl`).
