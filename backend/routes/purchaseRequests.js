
import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET: consultar todas las solicitudes.
router.get("/", async (req, res) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            unit: true,
            producer: {
              select: {
                name: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      total: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Error al consultar solicitudes:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudieron consultar las solicitudes.",
    });
  }
});

// POST: registrar una solicitud de compra.
router.post("/", async (req, res) => {
  try {
    const {
      buyerId,
      productId,
      quantity,
      origin,
      destination,
      transportType,
      notes,
    } = req.body;

    // Validar campos obligatorios.
    if (
      !buyerId ||
      !productId ||
      quantity === undefined ||
      !origin?.trim?.() ||
      !destination?.trim?.() ||
      !transportType?.trim?.()
    ) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios.",
      });
    }

    const requestedQuantity = Number(quantity);

    if (
      !Number.isFinite(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "La cantidad debe ser mayor que cero.",
      });
    }

    const allowedTransportTypes = ["TERRESTRE", "FLUVIAL"];

    const normalizedTransport = String(transportType)
      .trim()
      .toUpperCase();

    if (!allowedTransportTypes.includes(normalizedTransport)) {
      return res.status(400).json({
        success: false,
        message: "El transporte debe ser TERRESTRE o FLUVIAL.",
      });
    }

    // Comprobar comprador.
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
    });

    if (!buyer || buyer.role !== "BUYER") {
      return res.status(404).json({
        success: false,
        message: "No se encontró un comprador válido.",
      });
    }

    // Comprobar producto.
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return res.status(404).json({
        success: false,
        message: "El producto no está disponible.",
      });
    }

    if (requestedQuantity > product.quantity) {
      return res.status(400).json({
        success: false,
        message: `Existencias insuficientes. Disponibles: ${product.quantity} ${product.unit}.`,
      });
    }

    // Crear solicitud.
    const newRequest = await prisma.purchaseRequest.create({
      data: {
        buyerId,
        productId,
        quantity: requestedQuantity,
        unitPriceAtRequest: product.price,
        origin: String(origin).trim(),
        destination: String(destination).trim(),
        transportType: normalizedTransport,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        buyer: {
          select: {
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            name: true,
            price: true,
            unit: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Solicitud de compra registrada correctamente.",
      data: newRequest,
    });
  } catch (error) {
    console.error("Error al registrar solicitud:", error);

    return res.status(500).json({
      success: false,
      message: "Ocurrió un error al registrar la solicitud.",
    });
  }
});

export default router;
