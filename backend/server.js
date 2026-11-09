import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import productsRouter from "./routes/products.js";
import purchaseRequestsRouter from "./routes/purchaseRequests.js";
import authRouter from "./routes/auth.js";
import logisticsRouter from "./routes/logistics.js";
import poolsRouter from "./routes/pools.js";
import {
  ensurePhase2Schema,
  seedLogisticsNetwork,
} from "./utils/ensurePhase2Schema.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Rutas Fase 1 (100% retrocompatibles) + Rutas Fase 2 (Logística, Pools, Contraofertas y Trazabilidad)
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/purchase-requests", purchaseRequestsRouter);
app.use("/api/requests", purchaseRequestsRouter);
app.use("/api/logistics", logisticsRouter);
app.use("/api/pools", poolsRouter);

// Comprobar que la API esté activa.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Agro-Red Magdalena API funcionando",
  });
});

// Comprobar una consulta real a Supabase PostgreSQL mediante Prisma.
app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Conexión con Supabase PostgreSQL correcta",
    });
  } catch (error) {
    console.error("Error de conexión con Supabase PostgreSQL:", error);

    res.status(500).json({
      success: false,
      message: "No se pudo consultar la base de datos en Supabase",
    });
  }
});

// Consultar las categorías guardadas en la base de datos.
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error al consultar categorías:", error);

    res.status(500).json({
      success: false,
      message: "No se pudieron consultar las categorías",
    });
  }
});

// Ruta no encontrada en /api/* con respuesta JSON uniforme.
app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "El recurso solicitado no existe en la API.",
  });
});

// Manejador global de errores de parseo JSON y tamaño de carga (sin exponer trazas internas).
app.use((err, _req, res, next) => {
  if (!err) return next();

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "La imagen o el cuerpo enviado supera el límite permitido (5 MB).",
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "El formato JSON enviado no es válido.",
    });
  }

  console.error("Error no controlado en API:", err);
  return res.status(500).json({
    success: false,
    message: "Error interno del servidor.",
  });
});

let server;

async function startServer() {
  try {
    await ensurePhase2Schema(prisma);
    await seedLogisticsNetwork(prisma);
  } catch (error) {
    console.error("Advertencia al inicializar red logística Fase 2:", error);
  }

  server = app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();

function shutdown() {
  if (!server) {
    prisma.$disconnect().finally(() => process.exit(0));
    return;
  }

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
