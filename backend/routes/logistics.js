import { Router } from "express";
import { prisma } from "../prisma.js";
import {
  RIVER_CONDITION_META,
  VALID_NODE_TYPES,
  computeMultimodalQuotes,
  estimateWeightKg,
} from "../utils/routeOptimizer.js";
import { calculateFairPrice } from "../utils/fairPriceEngine.js";

const router = Router();

// GET /api/logistics/nodes: lista puertos fluviales, mixtos y centros terrestres.
router.get("/nodes", async (req, res) => {
  try {
    const { type } = req.query;
    const where = {};

    if (type) {
      const normalized = String(type).trim().toUpperCase();
      if (!VALID_NODE_TYPES.includes(normalized)) {
        return res.status(400).json({
          success: false,
          message: "Tipo de nodo logístico no válido.",
        });
      }
      where.type = normalized;
    }

    const nodes = await prisma.logisticsNode.findMany({
      where,
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    return res.json({
      success: true,
      total: nodes.length,
      data: nodes,
    });
  } catch (error) {
    console.error("Error al consultar nodos logísticos:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudieron consultar los nodos logísticos.",
    });
  }
});

// GET /api/logistics/segments: lista tramos terrestres y fluviales conectados.
router.get("/segments", async (_req, res) => {
  try {
    const segments = await prisma.routeSegment.findMany({
      include: {
        origin: true,
        destination: true,
      },
      orderBy: { distanceKm: "asc" },
    });

    return res.json({
      success: true,
      total: segments.length,
      data: segments,
    });
  } catch (error) {
    console.error("Error al consultar tramos logísticos:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudieron consultar los tramos de ruta.",
    });
  }
});

// GET /api/logistics/river-status: boletín hidrológico del corredor Río Magdalena.
router.get("/river-status", (_req, res) => {
  return res.json({
    success: true,
    data: {
      defaultCondition: "NORMAL",
      conditions: Object.values(RIVER_CONDITION_META),
      sectors: [
        {
          sector: "Puerto Berrío – Barrancabermeja",
          depthMeters: 3.4,
          status: "Óptimo",
        },
        {
          sector: "Barrancabermeja – Puerto Wilches – Cantagallo",
          depthMeters: 2.9,
          status: "Navegable (monitoreo bancos de arena)",
        },
        {
          sector: "San Pablo – Simití – Gamarra",
          depthMeters: 3.8,
          status: "Óptimo",
        },
      ],
    },
  });
});

// POST /api/logistics/quote: comparativa Terrestre vs. Fluvial vs. Híbrida/Multimodal
// incluyendo caudal del río, riesgo de merma y huella de CO2.
router.post("/quote", async (req, res) => {
  try {
    const {
      originNodeId,
      destNodeId,
      weightKg,
      riverCondition,
      perishability,
    } = req.body || {};

    const [nodes, segments] = await Promise.all([
      prisma.logisticsNode.findMany(),
      prisma.routeSegment.findMany(),
    ]);

    const result = computeMultimodalQuotes({
      nodes,
      segments,
      originNodeId: originNodeId ? String(originNodeId).trim() : "",
      destNodeId: destNodeId ? String(destNodeId).trim() : "",
      weightKg,
      riverCondition,
      perishability,
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error al calcular cotización logística:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo calcular la cotización multimodal.",
    });
  }
});

// POST /api/logistics/fair-price: calcula banda de Precio Justo SIPSA-DANE vs. intermediario.
router.post("/fair-price", async (req, res) => {
  try {
    const {
      productName,
      categoryId,
      categoryName: rawCategoryName,
      unit = "kg",
      producerPrice = 0,
      quantity = 100,
      originNodeId,
      destNodeId,
    } = req.body || {};

    let categoryName = rawCategoryName || "";
    if (!categoryName && categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: String(categoryId) },
      });
      if (cat) categoryName = cat.name;
    }

    let logisticsCostTotal = 0;

    if (originNodeId) {
      const [nodes, segments] = await Promise.all([
        prisma.logisticsNode.findMany(),
        prisma.routeSegment.findMany(),
      ]);

      const hubDest =
        (destNodeId && nodes.find((n) => n.id === String(destNodeId))) ||
        nodes.find((n) => n.name === "Bucaramanga" && n.id !== String(originNodeId)) ||
        nodes.find((n) => n.id !== String(originNodeId));

      if (hubDest) {
        const weightKg = estimateWeightKg(quantity || 100, unit);
        const quote = computeMultimodalQuotes({
          nodes,
          segments,
          originNodeId: String(originNodeId),
          destNodeId: hubDest.id,
          weightKg: Math.max(50, weightKg),
        });

        if (!quote.error && quote.data.optimalByCost) {
          logisticsCostTotal = quote.data.optimalByCost.totalCost;
        }
      }
    }

    const analysis = calculateFairPrice({
      productName,
      categoryName,
      unit,
      producerPrice,
      logisticsCostTotal,
      quantity,
    });

    return res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("Error al calcular precio justo:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo calcular la referencia de precio justo.",
    });
  }
});

export default router;
