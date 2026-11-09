
export function buildProductFilters({
  search,
  categoryId,
  location,
  minPrice,
  maxPrice,
  originNodeId,
}) {
  const where = { active: true };

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: "insensitive" } },
      { description: { contains: String(search), mode: "insensitive" } },
    ];
  }

  if (categoryId) where.categoryId = String(categoryId);
  if (originNodeId) where.originNodeId = String(originNodeId);
  if (location) where.location = { contains: String(location), mode: "insensitive" };

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};

    if (minPrice !== undefined) {
      const value = Number(minPrice);

      if (!Number.isFinite(value) || value < 0) {
        return { error: "El precio mínimo no es válido." };
      }

      where.price.gte = value;
    }

    if (maxPrice !== undefined) {
      const value = Number(maxPrice);

      if (!Number.isFinite(value) || value < 0) {
        return { error: "El precio máximo no es válido." };
      }

      where.price.lte = value;
    }

    if (
      where.price.gte !== undefined &&
      where.price.lte !== undefined &&
      where.price.gte > where.price.lte
    ) {
      return {
        error: "El precio mínimo no puede superar el máximo.",
      };
    }
  }

  return { where };
}
