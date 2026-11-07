import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, ProductGridSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi } from "../services/agroApi";

const SORTS = {
  recientes: "Más recientes",
  "precio-asc": "Precio: de menor a mayor",
  "precio-desc": "Precio: de mayor a menor",
  nombre: "Nombre (A a Z)",
};

export default function CatalogPage() {
  usePageTitle("Catálogo");

  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const categoryId = params.get("categoryId") || "";
  const sort = SORTS[params.get("orden")] ? params.get("orden") : "recientes";

  const [text, setText] = useState(q);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const categories = useApi(() => catalogApi.categories(), []);
  const products = useApi(
    () => catalogApi.products({ search: q, categoryId }),
    [q, categoryId]
  );

  // Se parte de la URL actual (no de un render anterior) para que el retardo
  // de la búsqueda nunca pise un filtro elegido mientras tanto.
  function setParam(key, value) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function handleSearchChange(event) {
    const value = event.target.value;
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", value.trim()), 350);
  }

  function clearFilters() {
    clearTimeout(timer.current);
    setText("");
    setParams({}, { replace: true });
  }

  // El orden se aplica en el navegador: la API no ofrece parámetro de orden.
  const sorted = useMemo(() => {
    const list = [...(products.data || [])];

    if (sort === "precio-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "precio-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "nombre") list.sort((a, b) => a.name.localeCompare(b.name, "es"));

    return list;
  }, [products.data, sort]);

  const hasFilters = Boolean(q || categoryId);
  const activeCategory = (categories.data || []).find((c) => c.id === categoryId);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Catálogo de productos</h1>
        <p>
          Productos agrícolas y pecuarios publicados directamente por los
          productores.
        </p>
      </header>

      <div className="catalog-toolbar">
        <div className="search-box">
          <Icon name="search" size={20} />
          <label htmlFor="busqueda" className="sr-only">
            Buscar productos por nombre
          </label>
          <input
            id="busqueda"
            type="search"
            className="control"
            placeholder="Buscar por nombre, por ejemplo: plátano"
            value={text}
            onChange={handleSearchChange}
          />
        </div>

        <div className="sort-box">
          <label htmlFor="orden">Ordenar por</label>
          <select
            id="orden"
            className="control"
            value={sort}
            onChange={(event) =>
              setParam("orden", event.target.value === "recientes" ? "" : event.target.value)
            }
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chip-row" role="group" aria-label="Categorías">
        <button
          type="button"
          className="chip"
          aria-pressed={!categoryId}
          onClick={() => setParam("categoryId", "")}
        >
          Todas
        </button>
        {(categories.data || []).map((category) => (
          <button
            key={category.id}
            type="button"
            className="chip"
            aria-pressed={categoryId === category.id}
            onClick={() => setParam("categoryId", category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <p className="result-count" aria-live="polite">
        {products.loading && !products.data
          ? "Buscando productos…"
          : `${sorted.length} ${sorted.length === 1 ? "producto" : "productos"}${
              activeCategory ? ` en ${activeCategory.name}` : ""
            }${q ? ` para “${q}”` : ""}`}
      </p>

      {products.loading && !products.data ? (
        <ProductGridSkeleton />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.reload} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="search"
          title={hasFilters ? "No encontramos productos con esos filtros" : "Todavía no hay productos publicados"}
          action={
            hasFilters ? (
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                Limpiar filtros
              </button>
            ) : null
          }
        >
          {hasFilters
            ? "Prueba con otro nombre o elige otra categoría."
            : "Cuando los productores publiquen sus productos aparecerán aquí."}
        </EmptyState>
      ) : (
        <div
          className={`product-grid ${products.loading ? "is-refreshing" : ""}`}
          aria-busy={products.loading}
        >
          {sorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
