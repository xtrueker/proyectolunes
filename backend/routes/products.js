
import { Router } from "express";
import { prisma } from "../prisma.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.js";

const router = Router();

const productInclude = {
  category: true,
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
    const { search, categoryId, location, minPrice, maxPrice } = req.query;
    const where = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    if (categoryId) where.categoryId = String(categoryId);
    if (location) where.location = { contains: String(location) };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};

      if (minPrice !== undefined) {
        const value = Number(minPrice);

        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: "El precio mínimo no es válido.",
          });
        }

        where.price.gte = value;
      }

      if (maxPrice !== undefined) {
        const value = Number(maxPrice);

        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: "El precio máximo no es válido.",
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
          message: "El precio mínimo no puede superar el máximo.",
        });
      }
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

      const product = await prisma.product.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          price: numericPrice,
          quantity: numericQuantity,
          unit: unit.trim(),
          location: location?.trim() || req.user.location || null,
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

        data.description = description.trim() || null;
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
        if (typeof location !== "string") {
          return res.status(400).json({
            success: false,
            message: "La ubicación no es válida.",
          });
        }

        data.location = location.trim() || null;
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
