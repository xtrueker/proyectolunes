import { Router } from "express";
import { prisma } from "../prisma.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.js";
import {
  VALID_TRACKING_STAGES,
  VALID_TRANSPORT_MODES,
} from "../utils/routeOptimizer.js";

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
      imageUrl: true,
      perishability: true,
      originNodeId: true,
      producerId: true,
    },
  },
  originNode: true,
  destNode: true,
  pool: {
    include: {
      originNode: true,
      destNode: true,
    },
  },
  trackingEvents: {
    orderBy: { createdAt: "asc" },
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

// Registrar solicitud de compra (retrocompatible Fase 1 + nodos/cotización Fase 2).
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
        originNodeId,
        destNodeId,
        freightCostEstimated,
        imageUrl,
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

      if (!VALID_TRANSPORT_MODES.includes(normalizedTransport)) {
        return res.status(400).json({
          success: false,
          message: "El transporte debe ser TERRESTRE, FLUVIAL o HIBRIDO.",
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

      let numericFreight = null;
      if (freightCostEstimated !== undefined && freightCostEstimated !== null && freightCostEstimated !== "") {
        const parsed = Number(freightCostEstimated);
        if (Number.isFinite(parsed) && parsed >= 0) {
          numericFreight = Math.round(parsed);
        }
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
          originNodeId: originNodeId ? String(originNodeId) : product.originNodeId || null,
          destNodeId: destNodeId ? String(destNodeId) : null,
          freightCostEstimated: numericFreight,
          imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
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

// Cambiar estado de una solicitud (conserva intacta la lógica transaccional de Fase 1).
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
        (request.status === "COUNTER_OFFERED" &&
          normalizedStatus === "CANCELLED") ||
        (request.status === "ACCEPTED" &&
          normalizedStatus === "COMPLETED");

      if (!validTransition) {
        return res.status(400).json({
          success: false,
          message: `No se puede cambiar de ${request.status} a ${normalizedStatus}.`,
        });
      }

      // Aceptar: descontar inventario y cambiar estado en una transacción atómica.
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

      const statusUpdateData = { status: normalizedStatus };
      if (
        normalizedStatus === "COMPLETED" &&
        ["FUNDED", "PARTIAL_RELEASED"].includes(request.escrowStatus)
      ) {
        statusUpdateData.escrowStatus = "RELEASED";
        statusUpdateData.escrowReleasedAmount = request.escrowTotalAmount || 0;
        statusUpdateData.escrowUpdatedAt = new Date();
      }

      const updated = await prisma.purchaseRequest.updateMany({
        where: {
          id: request.id,
          status: request.status,
        },
        data: statusUpdateData,
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

// PATCH /:id/counteroffer (rol PRODUCER): propone nuevo precio y/o fecha de despacho.
router.patch(
  "/:id/counteroffer",
  authenticateToken,
  authorizeRoles("PRODUCER"),
  async (req, res) => {
    try {
      const { counterPrice, counterDate, negotiationNotes } = req.body || {};

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

      if (request.product.producerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "No puedes realizar contraofertas sobre productos de otro productor.",
        });
      }

      if (!["PENDING", "COUNTER_OFFERED"].includes(request.status)) {
        return res.status(400).json({
          success: false,
          message: "Solo se pueden contraofertar solicitudes pendientes.",
        });
      }

      let parsedPrice = null;
      if (counterPrice !== undefined && counterPrice !== null && counterPrice !== "") {
        parsedPrice = Number(counterPrice);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: "El precio de contraoferta debe ser mayor que cero.",
          });
        }
      }

      let parsedDate = null;
      if (counterDate !== undefined && counterDate !== null && counterDate !== "") {
        parsedDate = new Date(counterDate);
        if (Number.isNaN(parsedDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "La fecha de despacho propuesta no es válida.",
          });
        }
      }

      if (parsedPrice === null && parsedDate === null) {
        return res.status(400).json({
          success: false,
          message: "Debes proponer un nuevo precio o una fecha de despacho.",
        });
      }

      const updatedRequest = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: {
          status: "COUNTER_OFFERED",
          counterPrice: parsedPrice ?? request.unitPriceAtRequest,
          counterDate: parsedDate,
          negotiationNotes:
            typeof negotiationNotes === "string" && negotiationNotes.trim()
              ? negotiationNotes.trim()
              : null,
        },
        include: requestInclude,
      });

      return res.json({
        success: true,
        message: "Contraoferta enviada al comprador.",
        data: updatedRequest,
      });
    } catch (error) {
      console.error("Error al registrar contraoferta:", error);
      return res.status(500).json({
        success: false,
        message: "No se pudo registrar la contraoferta.",
      });
    }
  }
);

// PATCH /:id/counteroffer/respond (rol BUYER): acepta o rechaza la contraoferta del productor.
async function handleCounterofferResponse(req, res) {
  try {
    const rawDecision = req.body?.decision || req.body?.action || "";
    const decision = String(rawDecision).trim().toUpperCase();

    if (!["ACCEPT", "REJECT", "ACCEPTED", "REJECTED"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Debes indicar si aceptas (ACCEPT) o rechazas (REJECT) la contraoferta.",
      });
    }

    const isAccept = decision === "ACCEPT" || decision === "ACCEPTED";

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

    if (request.buyerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Solo el comprador titular puede responder esta contraoferta.",
      });
    }

    if (request.status !== "COUNTER_OFFERED") {
      return res.status(400).json({
        success: false,
        message: "Esta solicitud no tiene una contraoferta activa.",
      });
    }

    if (!isAccept) {
      const rejected = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED" },
        include: requestInclude,
      });

      return res.json({
        success: true,
        message: "Contraoferta rechazada.",
        data: rejected,
      });
    }

    // Aceptar contraoferta: fija precio acordado y descuenta inventario atómicamente.
    const accepted = await prisma.$transaction(async (tx) => {
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
          status: "COUNTER_OFFERED",
        },
        data: {
          status: "ACCEPTED",
          unitPriceAtRequest: request.counterPrice ?? request.unitPriceAtRequest,
        },
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
      message: "Contraoferta aceptada e inventario reservado.",
      data: accepted,
    });
  } catch (error) {
    if (error.message === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        success: false,
        message: "No hay existencias suficientes para confirmar la contraoferta.",
      });
    }
    if (error.message === "REQUEST_ALREADY_CHANGED") {
      return res.status(409).json({
        success: false,
        message: "La solicitud ya fue modificada.",
      });
    }

    console.error("Error al responder contraoferta:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo procesar la respuesta a la contraoferta.",
    });
  }
}

router.patch(
  "/:id/counteroffer/respond",
  authenticateToken,
  authorizeRoles("BUYER"),
  handleCounterofferResponse
);

router.post(
  "/:id/counteroffer/respond",
  authenticateToken,
  authorizeRoles("BUYER"),
  handleCounterofferResponse
);

// GET /:id/tracking: consulta la línea de tiempo de trazabilidad multimodal.
router.get(
  "/:id/tracking",
  authenticateToken,
  authorizeRoles("BUYER", "PRODUCER"),
  async (req, res) => {
    try {
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

      const isAllowed =
        request.buyerId === req.user.id ||
        request.product.producerId === req.user.id;

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: "No tienes acceso a la trazabilidad de esta solicitud.",
        });
      }

      const events = await prisma.trackingEvent.findMany({
        where: { purchaseRequestId: request.id },
        orderBy: { createdAt: "asc" },
      });

      return res.json({
        success: true,
        total: events.length,
        data: events,
      });
    } catch (error) {
      console.error("Error al consultar trazabilidad:", error);
      return res.status(500).json({
        success: false,
        message: "No se pudo consultar la trazabilidad del envío.",
      });
    }
  }
);

// POST /:id/tracking: registra un hito de ruta y evidencia fotográfica opcional.
router.post(
  "/:id/tracking",
  authenticateToken,
  authorizeRoles("PRODUCER", "BUYER"),
  async (req, res) => {
    try {
      const { stage, notes, evidenceImageUrl } = req.body || {};
      const normalizedStage =
        typeof stage === "string" ? stage.trim().toUpperCase() : "";

      if (!VALID_TRACKING_STAGES.includes(normalizedStage)) {
        return res.status(400).json({
          success: false,
          message:
            "Etapa no válida. Usa ORIGIN_HUB, RIVER_TRANSIT, PORT_TRANSFER, LAND_TRANSIT o DELIVERED.",
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

      const isProducerOwner =
        req.user.role === "PRODUCER" &&
        request.product.producerId === req.user.id;
      const isBuyerConfirmingDelivery =
        req.user.role === "BUYER" &&
        request.buyerId === req.user.id &&
        normalizedStage === "DELIVERED";

      if (!isProducerOwner && !isBuyerConfirmingDelivery) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para registrar este evento de ruta.",
        });
      }

      if (!["ACCEPTED", "COMPLETED"].includes(request.status)) {
        return res.status(400).json({
          success: false,
          message: "Solo se puede registrar trazabilidad en solicitudes aceptadas o en curso.",
        });
      }

      const event = await prisma.trackingEvent.create({
        data: {
          purchaseRequestId: request.id,
          stage: normalizedStage,
          notes:
            typeof notes === "string" && notes.trim() ? notes.trim() : null,
          evidenceImageUrl:
            typeof evidenceImageUrl === "string" && evidenceImageUrl.trim()
              ? evidenceImageUrl.trim()
              : null,
        },
      });

      // Liberación automática de Garantía Escrow según hito de trazabilidad verificado
      let escrowReleaseMessage = "";
      if (
        ["ORIGIN_HUB", "PORT_TRANSFER"].includes(normalizedStage) &&
        request.escrowStatus === "FUNDED" &&
        Number(request.escrowTotalAmount) > 0
      ) {
        const partial = Math.round(Number(request.escrowTotalAmount) * 0.3);
        await prisma.purchaseRequest.update({
          where: { id: request.id },
          data: {
            escrowStatus: "PARTIAL_RELEASED",
            escrowReleasedAmount: partial,
            escrowUpdatedAt: new Date(),
          },
        });
        escrowReleaseMessage =
          " Se desembolsó automáticamente el 30 % de anticipo logístico de la garantía.";
      } else if (
        normalizedStage === "DELIVERED" &&
        ["FUNDED", "PARTIAL_RELEASED"].includes(request.escrowStatus) &&
        Number(request.escrowTotalAmount) > 0
      ) {
        await prisma.purchaseRequest.update({
          where: { id: request.id },
          data: {
            escrowStatus: "RELEASED",
            escrowReleasedAmount: Number(request.escrowTotalAmount),
            escrowUpdatedAt: new Date(),
          },
        });
        escrowReleaseMessage =
          " Se liberó el 100 % del pago en garantía al productor.";
      }

      return res.status(201).json({
        success: true,
        message: `Avance de ruta registrado correctamente.${escrowReleaseMessage}`,
        data: event,
      });
    } catch (error) {
      console.error("Error al registrar trazabilidad:", error);
      return res.status(500).json({
        success: false,
        message: "No se pudo registrar el avance de trazabilidad.",
      });
    }
  }
);

// POST /:id/escrow/fund (rol BUYER): congela el pago protegido en garantía (Escrow Rural)
// para desembolso automático 30 % en embarque/transbordo y 70 % en entrega final.
router.post(
  "/:id/escrow/fund",
  authenticateToken,
  authorizeRoles("BUYER"),
  async (req, res) => {
    try {
      const request = await prisma.purchaseRequest.findUnique({
        where: { id: req.params.id },
        include: {
          trackingEvents: true,
        },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Solicitud no encontrada.",
        });
      }

      if (request.buyerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Solo el comprador titular puede constituir la garantía de este pedido.",
        });
      }

      if (request.status !== "ACCEPTED") {
        return res.status(400).json({
          success: false,
          message: "La garantía protegida solo se activa cuando el pedido está Aceptado.",
        });
      }

      if (
        request.escrowStatus &&
        ["FUNDED", "PARTIAL_RELEASED", "RELEASED"].includes(request.escrowStatus)
      ) {
        return res.status(409).json({
          success: false,
          message: "Este pedido ya cuenta con garantía protegida activa.",
        });
      }

      const freight =
        Number(request.allocatedFreightCost ?? request.freightCostEstimated ?? 0) || 0;
      const totalEscrow = Math.round(
        Number(request.quantity) * Number(request.unitPriceAtRequest) + freight
      );

      const stages = (request.trackingEvents || []).map((e) => e.stage);
      let initialStatus = "FUNDED";
      let initialReleased = 0;

      if (stages.includes("DELIVERED")) {
        initialStatus = "RELEASED";
        initialReleased = totalEscrow;
      } else if (
        stages.includes("ORIGIN_HUB") ||
        stages.includes("PORT_TRANSFER")
      ) {
        initialStatus = "PARTIAL_RELEASED";
        initialReleased = Math.round(totalEscrow * 0.3);
      }

      const updated = await prisma.purchaseRequest.update({
        where: { id: request.id },
        data: {
          escrowStatus: initialStatus,
          escrowTotalAmount: totalEscrow,
          escrowReleasedAmount: initialReleased,
          escrowUpdatedAt: new Date(),
        },
        include: requestInclude,
      });

      return res.json({
        success: true,
        message:
          "Garantía protegida (Escrow Rural) constituida. Se liberará 30 % en puerto/acopio y 70 % contra entrega.",
        data: updated,
      });
    } catch (error) {
      console.error("Error al constituir garantía escrow:", error);
      return res.status(500).json({
        success: false,
        message: "No se pudo constituir la garantía protegida.",
      });
    }
  }
);

export default router;
