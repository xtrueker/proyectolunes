import { useState } from "react";
import { Link } from "react-router-dom";
import CategoryArt from "../components/CategoryArt";
import { EmptyState, ErrorState, ProductGridSkeleton } from "../components/Feedback";
import HeroArt from "../components/HeroArt";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/useAuth";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi } from "../services/agroApi";

const STEPS = [
  {
    title: "Encuentra tu producto",
    text: "Busca por nombre o por categoría y revisa precio, existencias y ubicación.",
  },
  {
    title: "Envía tu solicitud",
    text: "Indica cantidad, origen, destino y si el transporte será terrestre o fluvial.",
  },
  {
    title: "El productor responde",
    text: "Acepta o rechaza tu solicitud. Al aceptar, el inventario se actualiza solo.",
  },
];

export default function HomePage() {
  usePageTitle("");

  const { user } = useAuth();
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const categories = useApi(() => catalogApi.categories(), []);
  const products = useApi(() => catalogApi.products(), []);

  const latest = (products.data || []).slice(0, 6);

  let sellLink = (
    <Link to="/registro?rol=PRODUCER" className="btn btn-secondary btn-lg">
      Vender mis productos
    </Link>
  );

  if (user?.role === "PRODUCER") {
    sellLink = (
      <Link to="/panel" className="btn btn-secondary btn-lg">
        Ir a mi panel
      </Link>
    );
  } else if (user) {
    sellLink = null;
  }

  return (
    <>
      <section className="hero on-dark">
        <div className="container">
          <div className="hero-card">
            <div className="hero-copy">
              <h1>Compra directo a quienes cultivan en el Magdalena Medio</h1>
              <p className="hero-lead">
                Explora el catálogo, envía una solicitud con tu destino y tipo
                de transporte, y recibe la respuesta del productor.
              </p>

              <div className="button-row">
                <Link to="/catalogo" className="btn btn-primary btn-lg">
                  Explorar el catálogo
                </Link>
                {sellLink}
              </div>

              <ul className="hero-points">
                <li>
                  <Icon name="check" size={18} />
                  Transporte terrestre o fluvial
                </li>
                <li>
                  <Icon name="check" size={18} />
                  El productor confirma el precio final
                </li>
                <li>
                  <Icon name="check" size={18} />
                  Inventario que se actualiza al aceptar
                </li>
              </ul>
            </div>

            <div className="hero-visual">
              <HeroArt />
              {/* Foto opcional: copia tu imagen a public/images/hero.jpg */}
              <img
                className={`hero-photo ${photoLoaded ? "is-loaded" : ""}`}
                src="/images/hero.jpg"
                alt="Paisaje agrícola del Magdalena Medio"
                onLoad={() => setPhotoLoaded(true)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Explora por categoría</h2>
          <p>Cada categoría reúne los productos publicados por los productores.</p>
        </div>

        {categories.loading ? (
          <div className="category-grid" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div className="skeleton skeleton-tile" key={i} />
            ))}
          </div>
        ) : categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.reload} />
        ) : (
          <div className="category-grid">
            {(categories.data || []).map((category) => (
              <Link
                key={category.id}
                to={`/catalogo?categoryId=${category.id}`}
                className="category-tile"
              >
                <CategoryArt name={category.name} />
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head row-between">
            <div>
              <h2>Publicados recientemente</h2>
              <p>Los productos más nuevos del catálogo.</p>
            </div>
            <Link to="/catalogo" className="btn btn-secondary">
              Ver todo el catálogo
            </Link>
          </div>

          {products.loading ? (
            <ProductGridSkeleton count={3} />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={products.reload} />
          ) : latest.length === 0 ? (
            <EmptyState icon="leaf" title="Aún no hay productos publicados">
              Cuando los productores publiquen sus productos aparecerán aquí.
            </EmptyState>
          ) : (
            <div className="product-grid">
              {latest.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>Cómo funciona una compra</h2>
        </div>

        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {user?.role !== "BUYER" && (
        <section className="container">
          <div className="cta-band on-dark">
            <div>
              <h2>¿Produces en el Magdalena Medio?</h2>
              <p>
                Publica tus productos, controla tu inventario y responde las
                solicitudes de compra desde un solo panel.
              </p>
            </div>
            <Link
              to={user ? "/panel" : "/registro?rol=PRODUCER"}
              className="btn btn-accent btn-lg"
            >
              {user ? "Ir a mi panel" : "Crear cuenta de productor"}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
