import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import productsRouter from "./routes/products.js";
import purchaseRequestsRouter from "./routes/purchaseRequests.js";
import authRouter from "./routes/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/purchase-requests", purchaseRequestsRouter);

// Comprobar que la API esté activa.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Agro-Red Magdalena API funcionando",
  });
});

// Comprobar una consulta real a SQLite mediante Prisma.
app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "Conexión con SQLite correcta",
    });
  } catch (error) {
    console.error("Error de conexión con SQLite:", error);

    res.status(500).json({
      success: false,
      message: "No se pudo consultar la base de datos",
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


const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
