import { Router } from "express";
import { prisma } from "../prisma.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import {
  VALID_TRANSPORT_MODES,
  calculatePoolAllocations,
  computeMultimodalQuotes,
  estimateWeightKg,
} from "../utils/routeOptimizer.js";

const router = Router();

const poolInclude = {
  originNode: true,
  destNode: true,
  requests: {
    select: {
      id: true,
      quantity: true,
      status: true,
      allocatedFreightCost: true,
      buyer: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, unit: true, producerId: true } },
    },
  },
};

function enrichPool(pool) {
  const availableKg = Math.max(
    0,
    Number((pool.maxCapacityKg - pool.currentWeightKg).toFixed(2))
  );
  const occupancyPct =
    pool.maxCapacityKg > 0
      ? Math.min(
          100,
          Number(((pool.currentWeightKg / pool.maxCapacityKg) * 100).toFixed(1))
        )
      : 0;

  return {
    ...pool,
    availableKg,
    occupancyPct,
    participantsCount: pool.requests?.length || 0,
  };
}

// GET /api/pools/available: despachos grupales abiertos con cupo disponible.
router.get("/available", async (req, res) => {
  try {
    const { originNodeId, destNodeId, date, mode, minAvailableKg } = req.query;
    const where = { status: "OPEN" };

    if (originNodeId) where.originNodeId = String(originNodeId).trim();
    if (destNodeId) where.destNodeId = String(destNodeId).trim();
    if (mode) where.mode = String(mode).trim().toUpperCase();

    if (date) {
      const refDate = new Date(String(date));
      if (Number.isNaN(refDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "La fecha de filtro no es válida.",
        });
      }
      const windowMs = 48 * 60 * 60 * 1000;
      where.departureDate = {
        gte: new Date(refDate.getTime() - windowMs),
        lte: new Date(refDate.getTime() + windowMs),
      };
    }

    const pools = await prisma.shipmentPool.findMany({
      where,
      include: poolInclude,
      orderBy: { departureDate: "asc" },
    });

    const minKg = minAvailableKg !== undefined ? Number(minAvailableKg) : 0;

    const available = pools
      .map(enrichPool)
      .filter((p) => p.availableKg > 0 && p.availableKg >= (Number.isFinite(minKg) ? minKg : 0));

    return res.json({
      success: true,
      total: available.length,
      data: available,
    });
  } catch (error) {
    console.error("Error al consultar pools disponibles:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudieron consultar los pools de carga disponibles.",
    });
  }
});

// GET /api/pools: listado general de pools (filtrable por estado).
router.get("/", async (req, res) => {
  try {
    const { status, originNodeId, destNodeId } = req.query;
    const where = {};

    if (status) where.status = String(status).trim().toUpperCase();
    if (originNodeId) where.originNodeId = String(originNodeId).trim();
    if (destNodeId) where.destNodeId = String(destNodeId).trim();

    const pools = await prisma.shipmentPool.findMany({
      where,
      include: poolInclude,
      orderBy: { departureDate: "asc" },
    });

    return res.json({
      success: true,
      total: pools.length,
      data: pools.map(enrichPool),
    });
  } catch (error) {
    console.error("Error al listar pools:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudieron listar los pools de carga.",
    });
  }
});

// POST /api/pools/join: une una solicitud a un pool abierto (o crea uno en ventana 48h)
// recalculando transaccionalmente el peso total y el flete prorrateado de cada participante.
router.post(
  "/join",
  authenticateToken,
  authorizeRoles("BUYER", "PRODUCER"),
  async (req, res) => {
    try {
      const {
        purchaseRequestId,
        poolId,
        originNodeId: bodyOriginId,
        destNodeId: bodyDestId,
        mode: bodyMode,
        departureDate: bodyDepartureDate,
      } = req.body || {};

      if (!purchaseRequestId) {
        return res.status(400).json({
          success: false,
          message: "Debes indicar el identificador de la solicitud (purchaseRequestId).",
        });
      }

      const requestRecord = await prisma.purchaseRequest.findUnique({
        where: { id: String(purchaseRequestId) },
        include: { product: true },
      });

      if (!requestRecord) {
        return res.status(404).json({
          success: false,
          message: "Solicitud de compra no encontrada.",
        });
      }

      const isBuyerOwner =
        req.user.role === "BUYER" && requestRecord.buyerId === req.user.id;
      const isProducerOwner =
        req.user.role === "PRODUCER" &&
        requestRecord.product.producerId === req.user.id;

      if (!isBuyerOwner && !isProducerOwner) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para consolidar esta solicitud.",
        });
      }

      if (["REJECTED", "CANCELLED"].includes(requestRecord.status)) {
        return res.status(400).json({
          success: false,
          message: "No se puede unir al pool una solicitud rechazada o cancelada.",
        });
      }

      const requestWeightKg = estimateWeightKg(
        requestRecord.quantity,
        requestRecord.product.unit
      );

      if (requestWeightKg <= 0) {
        return res.status(400).json({
          success: false,
          message: "El peso calculado del pedido no es válido.",
        });
      }

      const resolvedOriginId =
        bodyOriginId ||
        requestRecord.originNodeId ||
        requestRecord.product.originNodeId ||
        null;
      const resolvedDestId = bodyDestId || requestRecord.destNodeId || null;

      if (!poolId && (!resolvedOriginId || !resolvedDestId)) {
        return res.status(400).json({
          success: false,
          message:
            "Indica un poolId abierto o los nodos originNodeId y destNodeId de la ruta.",
        });
      }

      if (!poolId && resolvedOriginId === resolvedDestId) {
        return res.status(400).json({
          success: false,
          message: "El nodo de origen y destino del pool deben ser distintos.",
        });
      }

      const targetDate = bodyDepartureDate
        ? new Date(bodyDepartureDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      if (Number.isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "La fecha de salida indicada no es válida.",
        });
      }

      // Si toca auto-crear un pool, precalculamos la tarifa vehicular completa en la ruta.
      let nodesCache = null;
      let segmentsCache = null;
      if (!poolId) {
        [nodesCache, segmentsCache] = await Promise.all([
          prisma.logisticsNode.findMany(),
          prisma.routeSegment.findMany(),
        ]);
      }

      const result = await prisma.$transaction(async (tx) => {
        let pool = null;

        if (poolId) {
          pool = await tx.shipmentPool.findUnique({
            where: { id: String(poolId) },
            include: {
              requests: { include: { product: true } },
            },
          });

          if (!pool) {
            throw new Error("POOL_NOT_FOUND");
          }
          if (pool.status !== "OPEN") {
            throw new Error("POOL_NOT_OPEN");
          }
          if (requestRecord.poolId === pool.id) {
            throw new Error("ALREADY_IN_POOL");
          }
          if (pool.currentWeightKg + requestWeightKg > pool.maxCapacityKg) {
            throw new Error("POOL_CAPACITY_EXCEEDED");
          }
        } else {
          const windowMs = 48 * 60 * 60 * 1000;
          const candidates = await tx.shipmentPool.findMany({
            where: {
              status: "OPEN",
              originNodeId: String(resolvedOriginId),
              destNodeId: String(resolvedDestId),
              departureDate: {
                gte: new Date(targetDate.getTime() - windowMs),
                lte: new Date(targetDate.getTime() + windowMs),
              },
            },
            include: {
              requests: { include: { product: true } },
            },
            orderBy: { departureDate: "asc" },
          });

          pool =
            candidates.find(
              (c) =>
                c.id !== requestRecord.poolId &&
                c.currentWeightKg + requestWeightKg <= c.maxCapacityKg
            ) || null;

          if (!pool) {
            // Auto-crear pool consolidado para esa ruta y ventana de 48h.
            const maxCapacityKg = Math.max(
              3000,
              Math.ceil(requestWeightKg / 1000) * 2000
            );

            const normalizedMode =
              bodyMode &&
              VALID_TRANSPORT_MODES.includes(String(bodyMode).toUpperCase())
                ? String(bodyMode).toUpperCase()
                : requestRecord.transportType &&
                    VALID_TRANSPORT_MODES.includes(
                      requestRecord.transportType.toUpperCase()
                    )
                  ? requestRecord.transportType.toUpperCase()
                  : null;

            const quoteResult = computeMultimodalQuotes({
              nodes: nodesCache,
              segments: segmentsCache,
              originNodeId: String(resolvedOriginId),
              destNodeId: String(resolvedDestId),
              weightKg: maxCapacityKg,
            });

            if (quoteResult.error) {
              throw new Error(`ROUTE_ERROR:${quoteResult.error}`);
            }

            const chosenRoute =
              (normalizedMode &&
                quoteResult.data.comparisons.find(
                  (c) => c.mode === normalizedMode
                )) ||
              quoteResult.data.optimalByCost;

            pool = await tx.shipmentPool.create({
              data: {
                originNodeId: String(resolvedOriginId),
                destNodeId: String(resolvedDestId),
                mode: chosenRoute.mode,
                departureDate: targetDate,
                maxCapacityKg,
                currentWeightKg: 0,
                totalFreightCost: chosenRoute.totalCost,
                status: "OPEN",
              },
              include: {
                requests: { include: { product: true } },
              },
            });
          }
        }

        // Si la solicitud venía de otro pool abierto previo, desvincularla y recalcular ese pool anterior.
        if (requestRecord.poolId && requestRecord.poolId !== pool.id) {
          const oldPool = await tx.shipmentPool.findUnique({
            where: { id: requestRecord.poolId },
            include: { requests: { include: { product: true } } },
          });

          if (oldPool && oldPool.status === "OPEN") {
            const oldRemaining = oldPool.requests.filter(
              (r) => r.id !== requestRecord.id
            );
            const oldLinkedSumBefore = oldPool.requests.reduce(
              (s, r) => s + estimateWeightKg(r.quantity, r.product.unit),
              0
            );
            const oldPreloadedKg = Math.max(
              0,
              oldPool.currentWeightKg - oldLinkedSumBefore
            );
            const oldParticipants = [
              ...(oldPreloadedKg > 0
                ? [{ id: "__PRELOADED__", weightKg: oldPreloadedKg }]
                : []),
              ...oldRemaining.map((r) => ({
                id: r.id,
                weightKg: estimateWeightKg(r.quantity, r.product.unit),
              })),
            ];
            const oldCalc = calculatePoolAllocations(
              oldPool.totalFreightCost,
              oldParticipants
            );

            await tx.shipmentPool.update({
              where: { id: oldPool.id },
              data: { currentWeightKg: oldCalc.totalWeightKg },
            });

            for (const alloc of oldCalc.allocations) {
              if (alloc.id === "__PRELOADED__") continue;
              await tx.purchaseRequest.update({
                where: { id: alloc.id },
                data: { allocatedFreightCost: alloc.allocatedFreightCost },
              });
            }
          }
        }

        // Conservar carga pre-consolidada base si existía en un pool regional semilla.
        const existingLinkedWeight = pool.requests.reduce(
          (sum, r) => sum + estimateWeightKg(r.quantity, r.product.unit),
          0
        );
        const preloadedBaseKg = Math.max(
          0,
          pool.currentWeightKg - existingLinkedWeight
        );

        const participants = [
          ...(preloadedBaseKg > 0
            ? [{ id: "__PRELOADED__", weightKg: preloadedBaseKg }]
            : []),
          ...pool.requests.map((r) => ({
            id: r.id,
            weightKg: estimateWeightKg(r.quantity, r.product.unit),
          })),
          { id: requestRecord.id, weightKg: requestWeightKg },
        ];

        const { totalWeightKg, allocations } = calculatePoolAllocations(
          pool.totalFreightCost,
          participants
        );

        const nextStatus =
          totalWeightKg >= pool.maxCapacityKg ? "LOCKED" : "OPEN";

        await tx.purchaseRequest.update({
          where: { id: requestRecord.id },
          data: {
            poolId: pool.id,
            originNodeId: pool.originNodeId,
            destNodeId: pool.destNodeId,
          },
        });

        for (const alloc of allocations) {
          if (alloc.id === "__PRELOADED__") continue;
          await tx.purchaseRequest.update({
            where: { id: alloc.id },
            data: { allocatedFreightCost: alloc.allocatedFreightCost },
          });
        }

        const updatedPool = await tx.shipmentPool.update({
          where: { id: pool.id },
          data: {
            currentWeightKg: Number(totalWeightKg.toFixed(2)),
            status: nextStatus,
          },
          include: poolInclude,
        });

        const myAllocation = allocations.find((a) => a.id === requestRecord.id);

        return {
          pool: enrichPool(updatedPool),
          allocation: myAllocation,
        };
      });

      return res.status(200).json({
        success: true,
        message: "Solicitud integrada al pool de carga consolidada.",
        data: result,
      });
    } catch (error) {
      if (error.message === "POOL_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "El pool seleccionado no existe.",
        });
      }
      if (error.message === "POOL_NOT_OPEN") {
        return res.status(409).json({
          success: false,
          message: "El pool ya no está abierto para nuevos pedidos.",
        });
      }
      if (error.message === "ALREADY_IN_POOL") {
        return res.status(409).json({
          success: false,
          message: "Esta solicitud ya pertenece a ese pool.",
        });
      }
      if (error.message === "POOL_CAPACITY_EXCEEDED") {
        return res.status(409).json({
          success: false,
          message: "El peso del pedido supera el cupo disponible en este pool.",
        });
      }
      if (error.message?.startsWith("ROUTE_ERROR:")) {
        return res.status(400).json({
          success: false,
          message: error.message.replace("ROUTE_ERROR:", ""),
        });
      }

      console.error("Error al unir solicitud al pool:", error);
      return res.status(500).json({
        success: false,
        message: "No se pudo unir la solicitud al pool de carga.",
      });
    }
  }
);

export default router;

