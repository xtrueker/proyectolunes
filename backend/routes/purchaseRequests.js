import { Router } from "express";
import { prisma } from "../prisma.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.js";

const router = Router();

const requestInclude = {
  buyer: {
    select: { id: true, name: true, email: true },
  },
  product: {
    select: {
      id: true,
      name: true,
      price: true,
      quantity: true,
      unit: true,
      producerId: true,
    },
  },
};

// Consultar solicitudes propias según el rol.
router.get(
  "/",
  authenticateToken,
  authorizeRoles("BUYER", "PRODUCER"),
  async (req, res) => {
    try {
      const where =
        req.user.role === "BUYER"
          ? { buyerId: req.user.id }
          : { product: { producerId: req.user.id } };

      const requests = await prisma.purchaseRequest.findMany({
        where,
        include: requestInclude,
        orderBy: { createdAt: "desc" },
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
  }
);

// Registrar solicitud de compra.
router.post(
  "/",
  authenticateToken,
  authorizeRoles("BUYER"),
  async (req, res) => {
    try {
      const {
        productId,
        quantity,
        origin,
        destination,
        transportType,
        notes,
      } = req.body;

      if (
        !productId ||
        quantity === undefined ||
        typeof origin !== "string" ||
        !origin.trim() ||
        typeof destination !== "string" ||
        !destination.trim() ||
        typeof transportType !== "string" ||
        !transportType.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Faltan campos obligatorios.",
        });
      }

      const requestedQuantity = Number(quantity);

      if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "La cantidad debe ser mayor que cero.",
        });
      }

      const normalizedTransport = transportType.trim().toUpperCase();

      if (!["TERRESTRE", "FLUVIAL"].includes(normalizedTransport)) {
        return res.status(400).json({
          success: false,
          message: "El transporte debe ser TERRESTRE o FLUVIAL.",
        });
      }

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

      const newRequest = await prisma.purchaseRequest.create({
        data: {
          buyerId: req.user.id,
          productId,
          quantity: requestedQuantity,
          unitPriceAtRequest: product.price,
          origin: origin.trim(),
          destination: destination.trim(),
          transportType: normalizedTransport,
          notes: notes ? String(notes).trim() : null,
        },
        include: requestInclude,
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
  }
);

// Cambiar estado de una solicitud.
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("BUYER", "PRODUCER"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const normalizedStatus =
        typeof status === "string" ? status.trim().toUpperCase() : "";

      const allowedStatuses = [
        "ACCEPTED",
        "REJECTED",
        "CANCELLED",
        "COMPLETED",
      ];

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Estado no válido.",
        });
      }

      const request = await prisma.purchaseRequest.findUnique({
        where: { id: req.params.id },
        include: { product: true },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Solicitud no encontrada.",
        });
      }

      const isBuyer = req.user.role === "BUYER";
      const isOwner =
        req.user.role === "PRODUCER" &&
        request.product.producerId === req.user.id;

      if (isBuyer && request.buyerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "No puedes modificar solicitudes de otros compradores.",
        });
      }

      if (req.user.role === "PRODUCER" && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "No puedes modificar solicitudes de otros productores.",
        });
      }

      if (isBuyer && normalizedStatus !== "CANCELLED") {
        return res.status(403).json({
          success: false,
          message: "El comprador solo puede cancelar sus solicitudes.",
        });
      }

      if (
        isOwner &&
        !["ACCEPTED", "REJECTED", "COMPLETED"].includes(normalizedStatus)
      ) {
        return res.status(403).json({
          success: false,
          message: "El productor no puede realizar ese cambio.",
        });
      }

      const validTransition =
        (request.status === "PENDING" &&
          ["ACCEPTED", "REJECTED", "CANCELLED"].includes(normalizedStatus)) ||
        (request.status === "ACCEPTED" &&
          normalizedStatus === "COMPLETED");

      if (!validTransition) {
        return res.status(400).json({
          success: false,
          message: `No se puede cambiar de ${request.status} a ${normalizedStatus}.`,
        });
      }

      // Aceptar: descontar inventario y cambiar estado en una transacción.
      if (normalizedStatus === "ACCEPTED") {
        const updatedRequest = await prisma.$transaction(async (tx) => {
          const stockUpdate = await tx.product.updateMany({
            where: {
              id: request.productId,
              active: true,
              quantity: { gte: request.quantity },
            },
            data: {
              quantity: { decrement: request.quantity },
            },
          });

          if (stockUpdate.count !== 1) {
            throw new Error("INSUFFICIENT_STOCK");
          }

          const updated = await tx.purchaseRequest.updateMany({
            where: {
              id: request.id,
              status: "PENDING",
            },
            data: { status: "ACCEPTED" },
          });

          if (updated.count !== 1) {
            throw new Error("REQUEST_ALREADY_CHANGED");
          }

          return tx.purchaseRequest.findUnique({
            where: { id: request.id },
            include: requestInclude,
          });
        });

        return res.json({
          success: true,
          message: "Solicitud aceptada e inventario actualizado.",
          data: updatedRequest,
        });
      }

      const updated = await prisma.purchaseRequest.updateMany({
        where: {
          id: request.id,
          status: request.status,
        },
        data: { status: normalizedStatus },
      });

      if (updated.count !== 1) {
        return res.status(409).json({
          success: false,
          message: "La solicitud cambió. Actualiza e intenta nuevamente.",
        });
      }

      const updatedRequest = await prisma.purchaseRequest.findUnique({
        where: { id: request.id },
        include: requestInclude,
      });

      return res.json({
        success: true,
        message: "Estado de la solicitud actualizado correctamente.",
        data: updatedRequest,
      });
    } catch (error) {
      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          success: false,
          message: "No hay existencias suficientes para aceptar la solicitud.",
        });
      }

      if (error.message === "REQUEST_ALREADY_CHANGED") {
        return res.status(409).json({
          success: false,
          message: "La solicitud ya fue modificada.",
        });
      }

      console.error("Error al actualizar solicitud:", error);
      return res.status(500).json({
        success: false,
        message: "No se pudo actualizar la solicitud.",
      });
    }
  }
);

export default router;
