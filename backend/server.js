import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import productsRouter from "./routes/products.js";
import purchaseRequestsRouter from "./routes/purchaseRequests.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
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

// Obtener catálogo de productos con búsqueda y filtros.
app.get("/api/products", async (req, res) => {
  try {
    const {
      search,
      categoryId,
      location,
      minPrice,
      maxPrice,
    } = req.query;

    const where = {
      active: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (location) {
      where.location = { contains: location };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};

      if (minPrice !== undefined) {
        const value = Number(minPrice);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: "El precio mínimo no es válido",
          });
        }
        where.price.gte = value;
      }

      if (maxPrice !== undefined) {
        const value = Number(maxPrice);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: "El precio máximo no es válido",
          });
        }
        where.price.lte = value;
      }

      if (
        where.price.gte !== undefined &&
        where.price.lte !== undefined &&
        where.price.gte > where.price.lte
      ) {
        return res.status(400).json({
          success: false,
          message: "El precio mínimo no puede superar el máximo",
        });
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        producer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      total: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error al consultar productos:", error);

    res.status(500).json({
      success: false,
      message: "No se pudo consultar el catálogo",
    });
  }
});

// Obtener los detalles de un producto.
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        category: true,
        producer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!product || !product.active) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error al consultar el producto:", error);

    res.status(500).json({
      success: false,
      message: "No se pudo consultar el producto",
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

// Cerrar las conexiones de forma ordenada al detener el servidor.
function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);