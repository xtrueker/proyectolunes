
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/products
// Consultar catálogo de productos.
router.get("/", async (req, res) => {
  try {
    const { search, categoryId } = req.query;

    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              name: {
                contains: String(search),
              },
            }
          : {}),
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

// GET /api/products/:id
// Consultar un producto específico.
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
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
    console.error("Error al consultar producto:", error);

    res.status(500).json({
      success: false,
      message: "No se pudo consultar el producto",
    });
  }
});

export default router;
