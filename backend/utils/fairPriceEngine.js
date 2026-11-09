import { estimateWeightKg } from "./routeOptimizer.js";

// Precios mayoristas de referencia inspirados en boletines SIPSA-DANE (COP por kg equivalente en central mayorista regional)
const CROP_BENCHMARKS_PER_KG = [
  { keywords: ["cacao"], wholesalePerKg: 11800, intermediaryRatio: 0.62, category: "Café y cacao", perishability: "LOW" },
  { keywords: ["cafe", "café", "pergamino"], wholesalePerKg: 14500, intermediaryRatio: 0.64, category: "Café y cacao", perishability: "LOW" },
  { keywords: ["arroz"], wholesalePerKg: 3950, intermediaryRatio: 0.63, category: "Granos y cereales", perishability: "LOW" },
  { keywords: ["maiz", "maíz", "frijol", "fríjol"], wholesalePerKg: 3400, intermediaryRatio: 0.61, category: "Granos y cereales", perishability: "LOW" },
  { keywords: ["platano", "plátano", "harton", "hartón", "banano"], wholesalePerKg: 3150, intermediaryRatio: 0.58, category: "Frutas", perishability: "MEDIUM" },
  { keywords: ["limon", "limón", "naranja", "mango", "papaya", "aguacate", "guayaba", "piña"], wholesalePerKg: 3600, intermediaryRatio: 0.57, category: "Frutas", perishability: "MEDIUM" },
  { keywords: ["yuca", "ñame", "name", "papa"], wholesalePerKg: 2350, intermediaryRatio: 0.56, category: "Tubérculos y raíces", perishability: "MEDIUM" },
  { keywords: ["bocachico", "bagre", "tilapia", "mojarra", "cachama", "pescado"], wholesalePerKg: 12900, intermediaryRatio: 0.59, category: "Pescados y acuicultura", perishability: "HIGH" },
  { keywords: ["queso", "suero", "cuajada"], wholesalePerKg: 16200, intermediaryRatio: 0.63, category: "Lácteos y derivados", perishability: "HIGH" },
  { keywords: ["leche"], wholesalePerKg: 2650, intermediaryRatio: 0.62, category: "Lácteos y derivados", perishability: "HIGH" },
  { keywords: ["ganado", "novillo", "res", "cerdo", "pollo", "huevo"], wholesalePerKg: 9400, intermediaryRatio: 0.65, category: "Productos pecuarios", perishability: "HIGH" },
  { keywords: ["tomate", "cebolla", "aji", "ají", "cilantro", "habichuela", "pimenton", "pimentón"], wholesalePerKg: 3800, intermediaryRatio: 0.55, category: "Hortalizas y verduras", perishability: "HIGH" },
];

const CATEGORY_FALLBACK_PER_KG = {
  "Frutas": { wholesalePerKg: 3300, intermediaryRatio: 0.58, perishability: "MEDIUM" },
  "Hortalizas y verduras": { wholesalePerKg: 3600, intermediaryRatio: 0.56, perishability: "HIGH" },
  "Tubérculos y raíces": { wholesalePerKg: 2350, intermediaryRatio: 0.57, perishability: "MEDIUM" },
  "Granos y cereales": { wholesalePerKg: 3800, intermediaryRatio: 0.63, perishability: "LOW" },
  "Café y cacao": { wholesalePerKg: 12500, intermediaryRatio: 0.63, perishability: "LOW" },
  "Productos pecuarios": { wholesalePerKg: 9200, intermediaryRatio: 0.65, perishability: "HIGH" },
  "Lácteos y derivados": { wholesalePerKg: 11000, intermediaryRatio: 0.62, perishability: "HIGH" },
  "Pescados y acuicultura": { wholesalePerKg: 12800, intermediaryRatio: 0.59, perishability: "HIGH" },
};

function stripAccents(text = "") {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function inferPerishability({ productName = "", categoryName = "" } = {}) {
  const normalizedName = stripAccents(productName);
  const matched = CROP_BENCHMARKS_PER_KG.find((item) =>
    item.keywords.some((kw) => normalizedName.includes(stripAccents(kw)))
  );
  if (matched) return matched.perishability;

  return CATEGORY_FALLBACK_PER_KG[categoryName]?.perishability || "MEDIUM";
}

// Calcula la banda de Precio Justo directo al productor vs. intermediario tradicional y central mayorista.
export function calculateFairPrice({
  productName = "",
  categoryName = "",
  unit = "kg",
  producerPrice = 0,
  logisticsCostTotal = 0,
  quantity = 100,
}) {
  const normalizedName = stripAccents(productName);
  const matched = CROP_BENCHMARKS_PER_KG.find((item) =>
    item.keywords.some((kw) => normalizedName.includes(stripAccents(kw)))
  );

  const benchmark =
    matched ||
    CATEGORY_FALLBACK_PER_KG[categoryName] || {
      wholesalePerKg: 3500,
      intermediaryRatio: 0.6,
      perishability: "MEDIUM",
    };

  const kgPerUnit = Math.max(0.1, estimateWeightKg(1, unit));
  const wholesaleRefPerUnit = Math.round(benchmark.wholesalePerKg * kgPerUnit);
  const intermediaryTypicalPerUnit = Math.round(
    wholesaleRefPerUnit * benchmark.intermediaryRatio
  );

  const qty = Math.max(1, Number(quantity) || 100);
  const estimatedLogisticsPerUnit =
    Number(logisticsCostTotal) > 0
      ? Math.round(Number(logisticsCostTotal) / qty)
      : Math.round(145 * kgPerUnit);

  // El techo competitivo en finca es el precio mayorista menos el flete directo y un margen mayorista razonable (~6%)
  const fairMax = Math.max(
    intermediaryTypicalPerUnit + 1,
    Math.round(wholesaleRefPerUnit * 0.94 - estimatedLogisticsPerUnit)
  );
  const fairMin = Math.round(
    intermediaryTypicalPerUnit + (fairMax - intermediaryTypicalPerUnit) * 0.35
  );
  const fairSuggested = Math.round((fairMin + fairMax) / 2);

  const offered = Number(producerPrice) > 0 ? Number(producerPrice) : fairSuggested;

  const producerGainVsIntermediaryPct =
    intermediaryTypicalPerUnit > 0
      ? Number(
          (
            ((offered - intermediaryTypicalPerUnit) / intermediaryTypicalPerUnit) *
            100
          ).toFixed(1)
        )
      : 0;

  const landedBuyerCostPerUnit = offered + estimatedLogisticsPerUnit;
  const buyerSavingsVsWholesalePct =
    wholesaleRefPerUnit > 0
      ? Number(
          (
            ((wholesaleRefPerUnit - landedBuyerCostPerUnit) /
              wholesaleRefPerUnit) *
            100
          ).toFixed(1)
        )
      : 0;

  let positioning = "COMPETITIVO_DIRECTO";
  let recommendation =
    "Precio en zona justa B2B: mejora el ingreso del productor frente al intermediario y sigue siendo rentable para el comprador mayorista.";

  if (offered < fairMin) {
    positioning = "POR_DEBAJO_BANDA";
    recommendation =
      "Estás publicando por debajo del rango directo sugerido; tienes margen para subir tu precio sin perder competitividad.";
  } else if (landedBuyerCostPerUnit > wholesaleRefPerUnit) {
    positioning = "SOBRE_MAYORISTA";
    recommendation =
      "Sumando el flete, el costo supera la referencia mayorista. Considera consolidar carga en un Pool o ajustar el precio para cerrar más rápido.";
  }

  return {
    unit,
    perishability: benchmark.perishability,
    wholesaleRefPerUnit,
    intermediaryTypicalPerUnit,
    estimatedLogisticsPerUnit,
    fairBand: {
      min: fairMin,
      suggested: fairSuggested,
      max: fairMax,
    },
    evaluatedPrice: offered,
    landedBuyerCostPerUnit,
    producerGainVsIntermediaryPct,
    buyerSavingsVsWholesalePct,
    positioning,
    recommendation,
  };
}

// Intérprete rural en lenguaje natural (voz o mensaje corto) para autocompletar publicaciones.
// Ejemplo: "Tengo 40 bultos de plátano hartón fresco en Puerto Wilches a 65000"
export function parseRuralDraft(rawText = "", { categories = [], nodes = [] } = {}) {
  const text = String(rawText || "").trim();
  if (!text) {
    return { error: "Escribe o dicta una frase con tu producto, cantidad y precio." };
  }

  const normalized = stripAccents(text);

  // 1. Detectar nodo logístico mencionado
  const matchedNode =
    nodes.find((n) => normalized.includes(stripAccents(n.name))) || null;

  // 2. Detectar cantidad + unidad
  const unitAliases = [
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:toneladas?|tons?|t\b)/i, unit: "tonelada" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:bultos?)/i, unit: "bulto" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:arrobas?)/i, unit: "arroba" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:kilos?|kilogramos?|kg\b)/i, unit: "kg" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:libras?|lbs?\b)/i, unit: "lb" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:litros?|lts?\b)/i, unit: "litro" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:cajas?|canastillas?)/i, unit: "caja" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:docenas?)/i, unit: "docena" },
    { regex: /(\d+(?:[.,]\d+)?)\s*(?:unidades?)/i, unit: "unidad" },
  ];

  let quantity = null;
  let unit = "kg";

  for (const candidate of unitAliases) {
    const match = normalized.match(candidate.regex);
    if (match) {
      quantity = Number(match[1].replace(",", "."));
      unit = candidate.unit;
      break;
    }
  }

  // 3. Detectar precio (ej. "a 65000", "a $3.200", "a 65 mil", "por 2500")
  let price = null;
  const milMatch = normalized.match(
    /(?:a|por|precio)\s*\$?\s*(\d+(?:[.,]\d+)?)\s*mil\b/i
  );
  if (milMatch) {
    price = Math.round(Number(milMatch[1].replace(",", ".")) * 1000);
  } else {
    const priceMatch = text.match(
      /(?:a|por|precio|vale)\s*\$?\s*([\d.]{3,}(?:,\d+)?)/i
    );
    if (priceMatch) {
      const cleaned = priceMatch[1].replace(/\./g, "").replace(",", ".");
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed) && parsed > 0) price = parsed;
    }
  }

  // 4. Detectar cultivo y categoría
  const matchedCrop = CROP_BENCHMARKS_PER_KG.find((item) =>
    item.keywords.some((kw) => normalized.includes(stripAccents(kw)))
  );

  const matchedCategory = matchedCrop
    ? categories.find(
        (c) => stripAccents(c.name) === stripAccents(matchedCrop.category)
      )
    : categories[0] || null;

  // Extraer nombre comercial limpio después de "de "
  let extractedName = "";
  const deMatch = text.match(
    /(?:bultos?|kilos?|kilogramos?|kg|toneladas?|arrobas?|cajas?|canastillas?|litros?|libras?)\s+de\s+([^,.]+?)(?:\s+en\s+|\s+a\s+|\s+por\s+|$)/i
  );
  if (deMatch) {
    extractedName = deMatch[1].trim();
  } else if (matchedCrop) {
    const kw = matchedCrop.keywords.find((k) =>
      normalized.includes(stripAccents(k))
    );
    extractedName = kw || matchedCrop.keywords[0];
  }

  if (extractedName) {
    extractedName =
      extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
  }

  // Si no indicó precio explícito, sugerir el precio justo directo
  const fair = calculateFairPrice({
    productName: extractedName,
    categoryName: matchedCategory?.name || "",
    unit,
    producerPrice: price || 0,
    quantity: quantity || 50,
  });

  const finalPrice = price || fair.fairBand.suggested;

  return {
    data: {
      name: extractedName || "Lote agrícola regional",
      quantity: quantity || 50,
      unit,
      price: finalPrice,
      categoryId: matchedCategory?.id || "",
      categoryName: matchedCategory?.name || "",
      originNodeId: matchedNode?.id || "",
      originNodeName: matchedNode?.name || "",
      location: matchedNode
        ? `${matchedNode.name}, ${matchedNode.department}`
        : "",
      perishability: fair.perishability,
      description: `${extractedName || "Producto fresco"} cosechado en ${
        matchedNode
          ? `${matchedNode.name} (${matchedNode.department})`
          : "el Magdalena Medio"
      }. Disponible para despacho directo sin intermediarios.`,
      fairPricePreview: fair,
    },
  };
}

