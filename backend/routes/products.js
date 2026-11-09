import { Router } from "express";
import { prisma } from "../prisma.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.js";
import { buildProductFilters } from "../utils/productFilters.js";
import { VALID_PERISHABILITY } from "../utils/routeOptimizer.js";
import {
  inferPerishability,
  parseRuralDraft,
} from "../utils/fairPriceEngine.js";

const router = Router();

// POST /api/products/parse-draft: asistente rural en lenguaje natural (texto o dictado por voz).
router.post("/parse-draft", async (req, res) => {
  try {
    const { text } = req.body || {};
    const [categories, nodes] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.logisticsNode.findMany({ orderBy: { name: "asc" } }),
    ]);

    const parsed = parseRuralDraft(text, { categories, nodes });

    if (parsed.error) {
      return res.status(400).json({
        success: false,
        message: parsed.error,
      });
    }

    return res.json({
      success: true,
      data: parsed.data,
    });
  } catch (error) {
    console.error("Error al interpretar publicación rural:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo interpretar el texto de publicación.",
    });
  }
});

const productInclude = {
  category: true,
  originNode: true,
  producer: {
    select: {
      id: true,
      name: true,
      location: true,
    },
  },
};

// GET: catálogo público con búsqueda y filtros.
router.get("/", async (req, res) => {
  try {
    const { where, error } = buildProductFilters(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const products = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      total: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error al consultar productos:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo consultar el catálogo.",
    });
  }
});

// GET: detalle público de un producto.
router.get("/:id", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: productInclude,
    });

    if (!product || !product.active) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado.",
      });
    }

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error("Error al consultar producto:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo consultar el producto.",
    });
  }
});

// POST: crear producto (solo productores).
router.post(
  "/",
  authenticateToken,
  authorizeRoles("PRODUCER"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        quantity,
        unit,
        categoryId,
        location,
        imageUrl,
        originNodeId,
        perishability,
      } = req.body;

      if (
        typeof name !== "string" ||
        !name.trim() ||
        price === undefined ||
        quantity === undefined ||
        typeof unit !== "string" ||
        !unit.trim() ||
        !categoryId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Nombre, precio, cantidad, unidad y categoría son obligatorios.",
        });
      }

      const numericPrice = Number(price);
      const numericQuantity = Number(quantity);

      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "El precio debe ser mayor que cero.",
        });
      }

      if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "La cantidad debe ser mayor que cero.",
        });
      }

      const category = await prisma.category.findUnique({
        where: { id: String(categoryId) },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "La categoría seleccionada no existe.",
        });
      }

      let resolvedOriginNode = null;
      if (originNodeId) {
        resolvedOriginNode = await prisma.logisticsNode.findUnique({
          where: { id: String(originNodeId) },
        });
        if (!resolvedOriginNode) {
          return res.status(404).json({
            success: false,
            message: "El nodo logístico de origen no existe.",
          });
        }
      }

      const trimmedImageUrl =
        typeof imageUrl === "string" && imageUrl.trim()
          ? imageUrl.trim()
          : null;

      const trimmedLocation =
        typeof location === "string" && location.trim()
          ? location.trim()
          : resolvedOriginNode
            ? `${resolvedOriginNode.name}, ${resolvedOriginNode.department}`
            : req.user.location || null;

      const resolvedPerishability =
        perishability &&
        VALID_PERISHABILITY.includes(String(perishability).toUpperCase())
          ? String(perishability).toUpperCase()
          : inferPerishability({
              productName: name,
              categoryName: category.name,
            });

      const product = await prisma.product.create({
        data: {
          name: name.trim(),
          description: typeof description === "string" ? description.trim() : "",
          price: numericPrice,
          quantity: numericQuantity,
          unit: unit.trim(),
          location: trimmedLocation,
          imageUrl: trimmedImageUrl,
          perishability: resolvedPerishability,
          originNodeId: resolvedOriginNode ? resolvedOriginNode.id : null,
          categoryId: String(categoryId),
          producerId: req.user.id,
        },
        include: productInclude,
      });

      return res.status(201).json({
        success: true,
        message: "Producto creado correctamente.",
        data: product,
      });
    } catch (error) {
      console.error("Error al crear producto:", error);

      return res.status(500).json({
        success: false,
        message: "No se pudo crear el producto.",
      });
    }
  }
);

// PUT: editar un producto propio.
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("PRODUCER"),
  async (req, res) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado.",
        });
      }

      if (product.producerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "No puedes modificar productos de otro productor.",
        });
      }

      const {
        name,
        description,
        price,
        quantity,
        unit,
        categoryId,
        location,
        imageUrl,
        originNodeId,
        perishability,
      } = req.body;

      const data = {};

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: "El nombre no es válido.",
          });
        }

        data.name = name.trim();
      }

      if (description !== undefined) {
        if (typeof description !== "string") {
          return res.status(400).json({
            success: false,
            message: "La descripción no es válida.",
          });
        }

        data.description = description.trim();
      }

      if (price !== undefined) {
        const value = Number(price);

        if (!Number.isFinite(value) || value <= 0) {
          return res.status(400).json({
            success: false,
            message: "El precio debe ser mayor que cero.",
          });
        }

        data.price = value;
      }

      if (quantity !== undefined) {
        const value = Number(quantity);

        if (!Number.isFinite(value) || value <= 0) {
          return res.status(400).json({
            success: false,
            message: "La cantidad debe ser mayor que cero.",
          });
        }

        data.quantity = value;
      }

      if (unit !== undefined) {
        if (typeof unit !== "string" || !unit.trim()) {
          return res.status(400).json({
            success: false,
            message: "La unidad no es válida.",
          });
        }

        data.unit = unit.trim();
      }

      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: String(categoryId) },
        });

        if (!category) {
          return res.status(404).json({
            success: false,
            message: "La categoría seleccionada no existe.",
          });
        }

        data.categoryId = String(categoryId);
      }

      if (location !== undefined) {
        if (location !== null && typeof location !== "string") {
          return res.status(400).json({
            success: false,
            message: "La ubicación no es válida.",
          });
        }

        data.location = location ? location.trim() || null : null;
      }

      if (imageUrl !== undefined) {
        if (imageUrl !== null && typeof imageUrl !== "string") {
          return res.status(400).json({
            success: false,
            message: "La URL de imagen no es válida.",
          });
        }

        data.imageUrl = imageUrl ? imageUrl.trim() || null : null;
      }

      if (originNodeId !== undefined) {
        if (!originNodeId) {
          data.originNodeId = null;
        } else {
          const node = await prisma.logisticsNode.findUnique({
            where: { id: String(originNodeId) },
          });
          if (!node) {
            return res.status(404).json({
              success: false,
              message: "El nodo logístico de origen no existe.",
            });
          }
          data.originNodeId = node.id;
        }
      }

      if (perishability !== undefined) {
        if (!perishability) {
          data.perishability = null;
        } else {
          const norm = String(perishability).toUpperCase();
          if (!VALID_PERISHABILITY.includes(norm)) {
            return res.status(400).json({
              success: false,
              message: "Nivel de perecibilidad no válido (LOW, MEDIUM o HIGH).",
            });
          }
          data.perishability = norm;
        }
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No se enviaron campos para actualizar.",
        });
      }

      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data,
        include: productInclude,
      });

      return res.json({
        success: true,
        message: "Producto actualizado correctamente.",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error al actualizar producto:", error);

      return res.status(500).json({
        success: false,
        message: "No se pudo actualizar el producto.",
      });
    }
  }
);

// PATCH: desactivar un producto propio.
router.patch(
  "/:id/deactivate",
  authenticateToken,
  authorizeRoles("PRODUCER"),
  async (req, res) => {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado.",
        });
      }

      if (product.producerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "No puedes desactivar productos de otro productor.",
        });
      }

      if (!product.active) {
        return res.status(400).json({
          success: false,
          message: "El producto ya está desactivado.",
        });
      }

      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: { active: false },
      });

      return res.json({
        success: true,
        message: "Producto desactivado correctamente.",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Error al desactivar producto:", error);

      return res.status(500).json({
        success: false,
        message: "No se pudo desactivar el producto.",
      });
    }
  }
);

export default router;
