# Agro-Red Magdalena — Frontend renovado

React 19 + Vite 8 + React Router. Consume únicamente los endpoints reales del backend Express/Prisma
(sin cambios en backend, esquema, migraciones, puertos ni autenticación).

## Instalación

Antes de copiar nada, respalda tu versión actual (por ejemplo con `git commit` o copiando `src/App.jsx`).

```bash
cd frontend
npm install react-router-dom      # única dependencia nueva
npm run dev                       # http://localhost:5173
```

Backend (sin cambios): `cd backend && npm run dev` → `http://localhost:4000`.
Si usas otra URL, define `VITE_API_URL` en `frontend/.env` (por defecto `http://localhost:4000/api`).

Cuentas de demostración de tu `seed.js` (tras `npm run seed` en el backend):

| Rol | Correo | Contraseña |
|---|---|---|
| PRODUCER | productor@agrored.local | AgroRed2026! |
| BUYER | comprador@agrored.local | Comprador2026! |

## Archivos

**Reemplazar** (ya existen): `index.html`, `public/favicon.svg`, `src/main.jsx`, `src/App.jsx`,
`src/index.css`, `src/services/api.js` (mismas claves de sesión `agrored_token` / `agrored_user`).

**Crear** (nuevos): todo lo demás bajo `src/`:
`services/agroApi.js`, `context/*` (Auth y Toast), `hooks/*`, `utils/*`, `styles/*`,
`components/*` (incl. `layout/`) y `pages/*`.

**Quedan sin uso** (puedes borrarlos cuando quieras; no se tocaron): `src/App.css`, `src/App.respaldo.jsx`,
`src/assets/*`.

## Rutas, endpoints y permisos

| Ruta | Acceso | Endpoints que usa |
|---|---|---|
| `/` | Público | `GET /categories`, `GET /products` |
| `/catalogo` | Público | `GET /categories`, `GET /products?search&categoryId` |
| `/productos/:id` | Público (formulario solo BUYER) | `GET /products/:id`, `POST /purchase-requests` |
| `/ingresar`, `/registro` | Público | `POST /auth/login`, `POST /auth/register` (rol BUYER o PRODUCER) |
| `/perfil` | Autenticado | `GET/PUT /auth/me` (solo nombre, ubicación, teléfono) |
| `/mis-solicitudes` | BUYER | `GET /purchase-requests`, `PATCH …/status` (solo `CANCELLED` desde `PENDING`) |
| `/panel/productos` | PRODUCER | `GET /products` (filtrado por productor), `PATCH /products/:id/deactivate` |
| `/panel/inventario` | PRODUCER | `PUT /products/:id` (solo `quantity`) |
| `/panel/solicitudes` | PRODUCER | `GET /purchase-requests`, `PATCH …/status` (`ACCEPTED`/`REJECTED` desde `PENDING`; `COMPLETED` desde `ACCEPTED`) |
| `/panel/productos/nuevo`, `/panel/productos/:id/editar` | PRODUCER | `POST /products`, `GET/PUT /products/:id` |

El descuento de inventario lo hace solo el backend al aceptar una solicitud; el frontend nunca descuenta stock.

## Límites reales de la API (la interfaz se adapta, no los simula)

- **Sin imágenes de producto:** se usan ilustraciones por categoría, rotuladas como tales en el detalle.
- **Sin filtros de precio/ubicación activos:** el backend solo filtra por `search` (nombre) y `categoryId`. El orden por precio/nombre se hace en el navegador.
- **Sin "mis productos":** se filtra por productor desde `GET /products`, que solo trae productos activos; los desactivados no se listan y no hay endpoint para reactivarlos.
- **Descripción obligatoria:** el esquema la exige, por eso el formulario de producto la pide.
- Las solicitudes no traen teléfono del comprador ni nombre del productor; solo se muestra lo que la API devuelve.

## Fotografías (opcional)

No pude descargar fotos desde mi entorno, así que el hero usa una ilustración SVG propia. Para usar fotos reales:

1. Elige una imagen en [Unsplash](https://unsplash.com/s/photos/colombia-farm) o [Pexels](https://www.pexels.com/search/colombian%20farm/) (licencias gratuitas para uso comercial; revisa la licencia de cada foto).
2. Guárdala como `frontend/public/images/hero.jpg` (recomendado ≥ 1200×1000 px, < 400 KB).
3. La app la superpone automáticamente; si el archivo no existe, se ve la ilustración (el 404 en la consola de desarrollo es esperado).

No uses fotos genéricas como si fueran de un producto concreto: el backend no guarda imágenes de productos.

## Qué se verificó y qué no

Verificado en un entorno sin acceso a internet: el código compila con esbuild (JSX y CSS, sin advertencias) y un recorrido
automatizado con Chromium sobre un backend **simulado** (respuestas con la misma forma que las reales) pasó el catálogo,
registro/login, solicitud de compra, cancelación, panel del productor (aceptar, completar, inventario, crear/editar/desactivar),
perfil, protección por rol y vista móvil, sin errores de JavaScript.

**No verificado:** `npm run build`/`npm run lint` con tus dependencias reales, ni la integración contra tu backend y base de datos reales.
Prueba tú:

1. Comprador: registrarse → catálogo → buscar/filtrar → detalle → enviar solicitud → `/mis-solicitudes` → cancelar una pendiente.
2. Productor: registrarse con rol Productor → crear producto → ver que sale en el catálogo → editar → ajustar inventario.
3. Con el comprador, solicita 2 productos; con el productor acepta uno (revisa que el stock baje una sola vez), rechaza otro y marca la aceptada como completada.
4. Intenta aceptar una solicitud mayor al stock (botón deshabilitado) y abrir `/panel` con cuenta BUYER (pantalla de acceso restringido).
5. Perfil: cambia nombre/ubicación/teléfono y recarga la página.
6. Revisa 390 px (celular) y 820 px (tablet); navega con Tab y cierra diálogos con Escape.
7. `npm run build` y `npm run lint`.
