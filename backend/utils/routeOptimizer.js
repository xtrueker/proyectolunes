export const VALID_NODE_TYPES = ["FLUVIAL_PORT", "LAND_HUB", "MIXED_PORT"];
export const VALID_TRANSPORT_MODES = ["TERRESTRE", "FLUVIAL", "HIBRIDO"];
export const VALID_RIVER_CONDITIONS = ["NORMAL", "SEQUIA", "CRECIENTE"];
export const VALID_PERISHABILITY = ["LOW", "MEDIUM", "HIGH"];
export const VALID_TRACKING_STAGES = [
  "ORIGIN_HUB",
  "RIVER_TRANSIT",
  "PORT_TRANSFER",
  "LAND_TRANSIT",
  "DELIVERED",
];

export const RIVER_CONDITION_META = {
  NORMAL: {
    code: "NORMAL",
    label: "Caudal óptimo",
    timeMultiplier: 1.0,
    costMultiplier: 1.0,
    summary: "Navegación continua sin restricciones de calado en el Río Magdalena.",
  },
  SEQUIA: {
    code: "SEQUIA",
    label: "Estiaje / Bajo calado (Alerta IDEAM)",
    timeMultiplier: 1.38,
    costMultiplier: 1.18,
    summary:
      "Bancos de arena reducen capacidad por planchón (+18 % tarifa fluvial y +38 % tiempo en río).",
  },
  CRECIENTE: {
    code: "CRECIENTE",
    label: "Creciente / Caudal alto",
    timeMultiplier: 1.24,
    costMultiplier: 1.12,
    summary:
      "Corriente fuerte exige navegación cautelosa y maniobra portuaria reforzada (+12 % tarifa fluvial, +24 % tiempo).",
  },
};

// Factores kg CO2e por tonelada-kilómetro
const CO2_PER_TON_KM = {
  FLUVIAL: 0.032,
  TERRESTRE: 0.105,
  UNCONSOLIDATED_PICKUP: 0.195,
};

// Convierte cantidad comercial a kilogramos aproximados para cálculo logístico.
export function estimateWeightKg(quantity, unit = "kg") {
  const numeric = Number(quantity);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  const normalized = String(unit || "kg").trim().toLowerCase();

  if (normalized === "tonelada" || normalized === "ton" || normalized === "t") {
    return numeric * 1000;
  }
  if (normalized === "bulto") return numeric * 50;
  if (normalized === "arroba") return numeric * 12.5;
  if (normalized === "lb" || normalized === "libra") return numeric * 0.5;
  if (normalized === "caja" || normalized === "canastilla") return numeric * 20;

  return numeric;
}

export function estimateSpoilageRisk(estimatedHours, perishability = "MEDIUM") {
  const level = VALID_PERISHABILITY.includes(String(perishability).toUpperCase())
    ? String(perishability).toUpperCase()
    : "MEDIUM";

  let rawPct = 0;
  if (level === "HIGH") {
    rawPct = Math.max(0, (estimatedHours - 1.8) * 3.2);
  } else if (level === "MEDIUM") {
    rawPct = Math.max(0, (estimatedHours - 3.2) * 0.95);
  } else {
    rawPct = Math.max(0, (estimatedHours - 8.0) * 0.2);
  }

  const spoilageRiskPct = Number(Math.min(35, rawPct).toFixed(1));
  const spoilageRiskLevel =
    spoilageRiskPct >= 8 ? "ALTO" : spoilageRiskPct >= 3 ? "MEDIO" : "BAJO";

  return { spoilageRiskPct, spoilageRiskLevel };
}

function summarizePath(
  pathSegments,
  nodesById,
  weightKg,
  riverCondition = "NORMAL",
  perishability = "MEDIUM"
) {
  const tons = weightKg / 1000;
  const riverFactor =
    RIVER_CONDITION_META[riverCondition] || RIVER_CONDITION_META.NORMAL;

  let freightBaseCost = 0;
  let transferCost = 0;
  let totalDistanceKm = 0;
  let travelHours = 0;
  let transfersCount = 0;
  let co2KgRaw = 0;

  const modesUsed = new Set();
  const steps = [];

  for (let i = 0; i < pathSegments.length; i += 1) {
    const seg = pathSegments[i];
    const prev = i > 0 ? pathSegments[i - 1] : null;
    modesUsed.add(seg.mode);

    const isFluvial = seg.mode === "FLUVIAL";
    const effectiveCostPerTon =
      Number(seg.costPerTon) * (isFluvial ? riverFactor.costMultiplier : 1);
    const effectiveSegHours =
      Number(seg.estimatedHours) * (isFluvial ? riverFactor.timeMultiplier : 1);

    const legCost = tons * effectiveCostPerTon;
    let transferFeeApplied = 0;

    if (prev && prev.mode !== seg.mode) {
      transfersCount += 1;
      transferFeeApplied = Math.max(
        Number(prev.transferFee) || 0,
        Number(seg.transferFee) || 0
      );
    }

    const segDist = Number(seg.distanceKm);
    co2KgRaw +=
      tons *
      segDist *
      (isFluvial ? CO2_PER_TON_KM.FLUVIAL : CO2_PER_TON_KM.TERRESTRE);

    freightBaseCost += legCost;
    transferCost += transferFeeApplied;
    totalDistanceKm += segDist;
    travelHours += effectiveSegHours;

    const fromNode = nodesById.get(seg.originId);
    const toNode = nodesById.get(seg.destinationId);

    steps.push({
      segmentId: seg.id,
      fromNodeId: seg.originId,
      fromNodeName: fromNode?.name || seg.originId,
      fromLat: fromNode?.latitude ?? null,
      fromLng: fromNode?.longitude ?? null,
      toNodeId: seg.destinationId,
      toNodeName: toNode?.name || seg.destinationId,
      toLat: toNode?.latitude ?? null,
      toLng: toNode?.longitude ?? null,
      mode: seg.mode,
      distanceKm: segDist,
      estimatedHours: Number(effectiveSegHours.toFixed(2)),
      legCost: Math.round(legCost),
      transferFeeApplied: Math.round(transferFeeApplied),
    });
  }

  // Cada transbordo fluvial-terrestre añade ~1.25 h operativas en puerto.
  const handlingHours = transfersCount * 1.25;
  const totalHours = Number((travelHours + handlingHours).toFixed(2));
  const totalCost = Math.max(1, Math.round(freightBaseCost + transferCost));

  let category = "HIBRIDO";
  if (modesUsed.size === 1) {
    category = modesUsed.has("FLUVIAL") ? "FLUVIAL" : "TERRESTRE";
  }

  // Comparación contra despacho individual no consolidado en camioneta/camión pequeño.
  const baselineCo2Kg =
    tons * totalDistanceKm * CO2_PER_TON_KM.UNCONSOLIDATED_PICKUP;
  const co2Kg = Number(co2KgRaw.toFixed(2));
  const co2SavedKg = Number(Math.max(0, baselineCo2Kg - co2KgRaw).toFixed(2));
  const co2SavedPct =
    baselineCo2Kg > 0
      ? Math.round(Math.max(0, ((baselineCo2Kg - co2KgRaw) / baselineCo2Kg) * 100))
      : 0;

  const { spoilageRiskPct, spoilageRiskLevel } = estimateSpoilageRisk(
    totalHours,
    perishability
  );

  // Puntaje compuesto inteligente: pondera sobrecosto equivalente por riesgo de merma en perecederos.
  const perishabilityPenaltyFactor =
    String(perishability).toUpperCase() === "HIGH"
      ? 18000 * tons
      : String(perishability).toUpperCase() === "MEDIUM"
        ? 6000 * tons
        : 1000 * tons;
  const smartScore = Math.round(
    totalCost + spoilageRiskPct * perishabilityPenaltyFactor
  );

  return {
    mode: category,
    totalCost,
    freightBaseCost: Math.round(freightBaseCost),
    transferCost: Math.round(transferCost),
    transfersCount,
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    estimatedHours: totalHours,
    co2Kg,
    co2SavedKg,
    co2SavedPct,
    spoilageRiskPct,
    spoilageRiskLevel,
    smartScore,
    steps,
  };
}

// Calcula y compara rutas Terrestre vs. Fluvial vs. Híbrida/Multimodal considerando caudal y perecibilidad.
export function computeMultimodalQuotes({
  nodes,
  segments,
  originNodeId,
  destNodeId,
  weightKg,
  riverCondition = "NORMAL",
  perishability = "MEDIUM",
}) {
  const numericWeight = Number(weightKg);
  const normalizedRiver = VALID_RIVER_CONDITIONS.includes(
    String(riverCondition || "NORMAL").toUpperCase()
  )
    ? String(riverCondition || "NORMAL").toUpperCase()
    : "NORMAL";

  const normalizedPerishability = VALID_PERISHABILITY.includes(
    String(perishability || "MEDIUM").toUpperCase()
  )
    ? String(perishability || "MEDIUM").toUpperCase()
    : "MEDIUM";

  if (!originNodeId || !destNodeId) {
    return { error: "Debes seleccionar nodo de origen y de destino." };
  }

  if (originNodeId === destNodeId) {
    return { error: "El nodo de origen y el de destino deben ser distintos." };
  }

  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    return { error: "El peso de la carga debe ser mayor que cero." };
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const originNode = nodesById.get(originNodeId);
  const destNode = nodesById.get(destNodeId);

  if (!originNode || !destNode) {
    return { error: "Uno de los nodos logísticos seleccionados no existe." };
  }

  const adjacency = new Map();
  for (const seg of segments) {
    if (!adjacency.has(seg.originId)) adjacency.set(seg.originId, []);
    adjacency.get(seg.originId).push(seg);
  }

  const evaluatedPaths = [];
  const MAX_HOPS = 6;

  function dfs(currentId, visitedNodes, currentSegments) {
    if (currentSegments.length > MAX_HOPS) return;

    if (currentId === destNodeId && currentSegments.length > 0) {
      evaluatedPaths.push(
        summarizePath(
          currentSegments,
          nodesById,
          numericWeight,
          normalizedRiver,
          normalizedPerishability
        )
      );
      return;
    }

    const outgoing = adjacency.get(currentId) || [];
    for (const seg of outgoing) {
      if (visitedNodes.has(seg.destinationId)) continue;
      visitedNodes.add(seg.destinationId);
      currentSegments.push(seg);
      dfs(seg.destinationId, visitedNodes, currentSegments);
      currentSegments.pop();
      visitedNodes.delete(seg.destinationId);
    }
  }

  dfs(originNodeId, new Set([originNodeId]), []);

  if (evaluatedPaths.length === 0) {
    return {
      error: "No existen rutas conectadas entre los nodos seleccionados.",
    };
  }

  function pickBestForMode(mode) {
    const candidates = evaluatedPaths.filter((p) => p.mode === mode);
    if (candidates.length === 0) return null;

    candidates.sort((a, b) =>
      a.totalCost !== b.totalCost
        ? a.totalCost - b.totalCost
        : a.estimatedHours - b.estimatedHours
    );

    return candidates[0];
  }

  const terrestre = pickBestForMode("TERRESTRE");
  const fluvial = pickBestForMode("FLUVIAL");
  const hibrida = pickBestForMode("HIBRIDO");

  const comparisons = [terrestre, fluvial, hibrida].filter(Boolean);

  const optimalByCost = [...comparisons].sort((a, b) =>
    a.totalCost !== b.totalCost
      ? a.totalCost - b.totalCost
      : a.estimatedHours - b.estimatedHours
  )[0];

  const optimalByTime = [...comparisons].sort((a, b) =>
    a.estimatedHours !== b.estimatedHours
      ? a.estimatedHours - b.estimatedHours
      : a.totalCost - b.totalCost
  )[0];

  const optimalSmart = [...comparisons].sort((a, b) =>
    a.smartScore !== b.smartScore
      ? a.smartScore - b.smartScore
      : a.totalCost - b.totalCost
  )[0];

  const highestCost = Math.max(...comparisons.map((c) => c.totalCost));

  const enrichedComparisons = comparisons.map((option) => ({
    ...option,
    isCheapest: option.mode === optimalByCost.mode,
    isFastest: option.mode === optimalByTime.mode,
    isSmartRecommended: option.mode === optimalSmart.mode,
    savingsVsMax: Math.max(0, highestCost - option.totalCost),
  }));

  return {
    data: {
      originNode,
      destNode,
      weightKg: numericWeight,
      riverCondition: normalizedRiver,
      riverConditionMeta: RIVER_CONDITION_META[normalizedRiver],
      perishability: normalizedPerishability,
      options: {
        terrestre:
          enrichedComparisons.find((c) => c.mode === "TERRESTRE") || null,
        fluvial:
          enrichedComparisons.find((c) => c.mode === "FLUVIAL") || null,
        hibrida:
          enrichedComparisons.find((c) => c.mode === "HIBRIDO") || null,
      },
      comparisons: enrichedComparisons,
      optimalByCost:
        enrichedComparisons.find((c) => c.mode === optimalByCost.mode) || null,
      optimalByTime:
        enrichedComparisons.find((c) => c.mode === optimalByTime.mode) || null,
      optimalSmart:
        enrichedComparisons.find((c) => c.mode === optimalSmart.mode) || null,
    },
  };
}

// Prorrateo exacto: CostoIndividual = CostoTotalFlete * (PesoPedido / PesoTotalPool)
export function calculatePoolAllocations(totalFreightCost, participants) {
  const totalCost = Number(totalFreightCost) || 0;
  const totalWeightKg = participants.reduce(
    (sum, item) => sum + (Number(item.weightKg) || 0),
    0
  );

  if (totalWeightKg <= 0) {
    return { totalWeightKg: 0, allocations: [] };
  }

  const allocations = participants.map((item) => {
    const weightKg = Number(item.weightKg) || 0;
    const share = weightKg / totalWeightKg;
    const allocatedFreightCost = Math.round(totalCost * share);

    return {
      id: item.id,
      weightKg,
      sharePct: Number((share * 100).toFixed(2)),
      allocatedFreightCost,
    };
  });

  return { totalWeightKg, allocations };
}
