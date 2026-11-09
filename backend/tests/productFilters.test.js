
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProductFilters } from "../utils/productFilters.js";

describe("Filtros del catálogo de productos", () => {
  it("consulta únicamente productos activos por defecto", () => {
    const result = buildProductFilters({});

    assert.deepEqual(result.where, { active: true });
  });

  it("permite buscar por nombre y descripción", () => {
    const result = buildProductFilters({ search: "arroz" });

    assert.deepEqual(result.where.OR, [
      { name: { contains: "arroz", mode: "insensitive" } },
      { description: { contains: "arroz", mode: "insensitive" } },
    ]);
  });

  it("aplica categoría y ubicación", () => {
    const result = buildProductFilters({
      categoryId: "cat-1",
      location: "Barrancabermeja",
    });

    assert.equal(result.where.categoryId, "cat-1");
    assert.deepEqual(result.where.location, {
      contains: "Barrancabermeja",
      mode: "insensitive",
    });
  });

  it("acepta un rango de precios válido", () => {
    const result = buildProductFilters({
      minPrice: "1000",
      maxPrice: "5000",
    });

    assert.deepEqual(result.where.price, {
      gte: 1000,
      lte: 5000,
    });
  });

  it("rechaza precios negativos", () => {
    const result = buildProductFilters({ minPrice: "-100" });

    assert.equal(result.error, "El precio mínimo no es válido.");
  });

  it("rechaza un precio mínimo superior al máximo", () => {
    const result = buildProductFilters({
      minPrice: "5000",
      maxPrice: "1000",
    });

    assert.equal(
      result.error,
      "El precio mínimo no puede superar el máximo."
    );
  });
});
