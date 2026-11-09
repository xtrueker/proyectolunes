import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePoolAllocations,
  computeMultimodalQuotes,
  estimateWeightKg,
} from "../utils/routeOptimizer.js";
import {
  calculateFairPrice,
  parseRuralDraft,
} from "../utils/fairPriceEngine.js";

const SAMPLE_NODES = [
  { id: "cantagallo", name: "Cantagallo", type: "FLUVIAL_PORT", department: "Bolívar" },
  { id: "wilches", name: "Puerto Wilches", type: "MIXED_PORT", department: "Santander" },
  { id: "barranca", name: "Barrancabermeja", type: "MIXED_PORT", department: "Santander" },
  { id: "bucara", name: "Bucaramanga", type: "LAND_HUB", department: "Santander" },
];

const SAMPLE_SEGMENTS = [
  {
    id: "s1",
    originId: "cantagallo",
    destinationId: "wilches",
    mode: "FLUVIAL",
    distanceKm: 8,
    costPerTon: 40000,
    estimatedHours: 0.5,
    transferFee: 30000,
  },
  {
    id: "s2",
    originId: "wilches",
    destinationId: "barranca",
    mode: "FLUVIAL",
    distanceKm: 42,
    costPerTon: 65000,
    estimatedHours: 1.9,
    transferFee: 40000,
  },
  {
    id: "s3",
    originId: "wilches",
    destinationId: "barranca",
    mode: "TERRESTRE",
    distanceKm: 54,
    costPerTon: 130000,
    estimatedHours: 1.2,
    transferFee: 40000,
  },
  {
    id: "s4",
    originId: "barranca",
    destinationId: "bucara",
    mode: "TERRESTRE",
    distanceKm: 116,
    costPerTon: 180000,
    estimatedHours: 2.5,
    transferFee: 45000,
  },
  {
    id: "s5",
    originId: "wilches",
    destinationId: "bucara",
    mode: "TERRESTRE",
    distanceKm: 142,
    costPerTon: 210000,
    estimatedHours: 3.1,
    transferFee: 42000,
  },
];

describe("Optimizador logístico multimodal, hidrología, CO2 y Precio Justo", () => {
  it("convierte distintas unidades comerciales a kilogramos", () => {
    assert.equal(estimateWeightKg(2, "tonelada"), 2000);
    assert.equal(estimateWeightKg(4, "bulto"), 200);
    assert.equal(estimateWeightKg(150, "kg"), 150);
  });

  it("compara rutas terrestre vs. fluvial y mide ahorro de CO2", () => {
    const res = computeMultimodalQuotes({
      nodes: SAMPLE_NODES,
      segments: SAMPLE_SEGMENTS,
      originNodeId: "wilches",
      destNodeId: "barranca",
      weightKg: 1000,
    });

    assert.ok(!res.error);
    assert.ok(res.data.options.fluvial);
    assert.ok(res.data.options.terrestre);
    assert.equal(res.data.optimalByCost.mode, "FLUVIAL");
    assert.equal(res.data.optimalByTime.mode, "TERRESTRE");
    assert.ok(res.data.options.fluvial.co2Kg < res.data.options.terrestre.co2Kg);
    assert.ok(res.data.options.fluvial.co2SavedKg > 0);
  });

  it("ajusta tiempos, costos y riesgo de merma en alerta de sequía (estiaje)", () => {
    const normal = computeMultimodalQuotes({
      nodes: SAMPLE_NODES,
      segments: SAMPLE_SEGMENTS,
      originNodeId: "wilches",
      destNodeId: "barranca",
      weightKg: 1000,
      riverCondition: "NORMAL",
      perishability: "HIGH",
    });

    const drought = computeMultimodalQuotes({
      nodes: SAMPLE_NODES,
      segments: SAMPLE_SEGMENTS,
      originNodeId: "wilches",
      destNodeId: "barranca",
      weightKg: 1000,
      riverCondition: "SEQUIA",
      perishability: "HIGH",
    });

    assert.ok(
      drought.data.options.fluvial.totalCost >
        normal.data.options.fluvial.totalCost
    );
    assert.ok(
      drought.data.options.fluvial.estimatedHours >
        normal.data.options.fluvial.estimatedHours
    );
    assert.ok(
      drought.data.options.fluvial.spoilageRiskPct >
        normal.data.options.fluvial.spoilageRiskPct
    );
  });

  it("calcula ruta híbrida río-camión sumando tarifa de transbordo", () => {
    const res = computeMultimodalQuotes({
      nodes: SAMPLE_NODES,
      segments: SAMPLE_SEGMENTS,
      originNodeId: "cantagallo",
      destNodeId: "bucara",
      weightKg: 1000,
    });

    assert.ok(!res.error);
    assert.ok(res.data.options.hibrida);
    assert.equal(res.data.options.hibrida.transfersCount, 1);
    assert.ok(res.data.options.hibrida.transferCost > 0);
  });

  it("prorratea el costo de flete según porcentaje exacto de carga en el pool", () => {
    const { totalWeightKg, allocations } = calculatePoolAllocations(1000000, [
      { id: "req-1", weightKg: 250 },
      { id: "req-2", weightKg: 750 },
    ]);

    assert.equal(totalWeightKg, 1000);
    assert.equal(allocations[0].allocatedFreightCost, 250000);
    assert.equal(allocations[1].allocatedFreightCost, 750000);
  });

  it("calcula banda de Precio Justo SIPSA vs. intermediario", () => {
    const fair = calculateFairPrice({
      productName: "Plátano hartón",
      categoryName: "Frutas",
      unit: "kg",
      producerPrice: 2450,
      logisticsCostTotal: 20000,
      quantity: 100,
    });

    assert.ok(fair.wholesaleRefPerUnit > fair.intermediaryTypicalPerUnit);
    assert.ok(fair.producerGainVsIntermediaryPct > 0);
    assert.ok(fair.buyerSavingsVsWholesalePct > 0);
  });

  it("interpreta frase rural en lenguaje natural para autocompletar producto", () => {
    const parsed = parseRuralDraft(
      "Tengo 40 bultos de plátano hartón fresco en Puerto Wilches a 125 mil",
      {
        categories: [{ id: "cat-frutas", name: "Frutas" }],
        nodes: SAMPLE_NODES,
      }
    );

    assert.ok(!parsed.error);
    assert.equal(parsed.data.quantity, 40);
    assert.equal(parsed.data.unit, "bulto");
    assert.equal(parsed.data.price, 125000);
    assert.equal(parsed.data.originNodeId, "wilches");
    assert.equal(parsed.data.categoryId, "cat-frutas");
  });
});
