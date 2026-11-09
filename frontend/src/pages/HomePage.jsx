import { Link } from "react-router-dom";
import CategoryArt from "../components/CategoryArt";
import { EmptyState, ErrorState, ProductGridSkeleton } from "../components/Feedback";
import HeroArt from "../components/HeroArt";
import Icon from "../components/Icon";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/useAuth";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi, logisticsApi, poolsApi } from "../services/agroApi";

const INNOVATION_PILLARS = [
  {
    icon: "route",
    title: "Gemelo Logístico del Río Magdalena",
    text: "Compara rutas fluviales, terrestres e híbridas ajustando caudal (estiaje/creciente), riesgo de merma y ahorro de CO₂.",
  },
  {
    icon: "users",
    title: "Consolidación Colaborativa (Pools)",
    text: "Agrupa cosechas de distintos productores en ventanas de 48 h para prorratear el costo del planchón o camión.",
  },
  {
    icon: "shield",
    title: "Pago Protegido Escrow 30 / 70",
    text: "Custodia el pago y libera 30 % automático al verificar embarque en puerto y 70 % contra entrega en destino.",
  },
  {
    icon: "spark",
    title: "Precio Justo SIPSA y Voz Rural",
    text: "Publica dictando con micrófono y compara tu ganancia directa frente al intermediario tradicional y centrales mayoristas.",
  },
];

export default function HomePage() {
  usePageTitle("");

  const { user } = useAuth();
  const categories = useApi(() => catalogApi.categories(), []);
  const products = useApi(() => catalogApi.products(), []);
  const nodes = useApi(() => logisticsApi.nodes(), []);
  const pools = useApi(() => poolsApi.available(), []);

  const latest = (products.data || []).slice(0, 6);
  const totalNodes = (nodes.data || []).length || 10;
  const openPoolsCount = (pools.data || []).length;
  const activeProductsCount = (products.data || []).length;

  let secondaryCta = (
    <Link to="/logistica" className="btn btn-secondary btn-lg">
      <Icon name="route" size={18} />
      Simular rutas y pools
    </Link>
  );

  if (user?.role === "PRODUCER") {
    secondaryCta = (
      <Link to="/panel" className="btn btn-secondary btn-lg">
        Ir a mi panel
      </Link>
    );
  }

  return (
    <>
      <section className="hero on-dark">
        <div className="container">
          <div className="hero-card">
            <div className="hero-copy">
              <span className="hero-eyebrow">
                <Icon name="anchor" size={15} />
                PLATAFORMA MULTIMODAL B2B · MAGDALENA MEDIO
              </span>

              <h1>Compra directo a quienes cultivan en el Magdalena Medio</h1>
              <p className="hero-lead">
                Conectamos pequeños productores agrícolas, ganaderos y pesqueros
                con compradores mayoristas optimizando rutas fluviales, terrestres
                y despachos consolidados sin intermediarios.
              </p>

              <div className="button-row">
                <Link to="/catalogo" className="btn btn-primary btn-lg">
                  Explorar el catálogo
                </Link>
                {secondaryCta}
              </div>

              <ul className="hero-points">
                <li>
                  <Icon name="check" size={18} />
                  Ruteo vivo Río Magdalena + Carretera con ahorro de CO₂
                </li>
                <li>
                  <Icon name="check" size={18} />
                  Negociación directa, contraofertas y referencia SIPSA-DANE
                </li>
                <li>
                  <Icon name="check" size={18} />
                  Garantía Escrow liberada por hitos verificados con fotografía
                </li>
              </ul>
            </div>

            <div className="hero-visual">
              <HeroArt />
            </div>
          </div>

          <dl className="hero-metrics" aria-label="Indicadores en vivo de la red">
            <div>
              <dt>Puertos y nodos activos</dt>
              <dd>{totalNodes}</dd>
            </div>
            <div>
              <dt>Lotes publicados</dt>
              <dd>{products.loading ? "–" : activeProductsCount}</dd>
            </div>
            <div>
              <dt>Pools abiertos hoy</dt>
              <dd>{pools.loading ? "–" : openPoolsCount}</dd>
            </div>
            <div>
              <dt>Garantía por hitos</dt>
              <dd>30% / 70%</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section container">
        <div className="section-head row-between">
          <div>
            <h2>Innovación aplicada al campo regional</h2>
            <p>
              Tecnología diseñada para resolver costos de transporte, asimetría de
              precios y confianza comercial.
            </p>
          </div>
          <Link to="/logistica" className="btn btn-secondary">
            Abrir Gemelo Logístico
          </Link>
        </div>

        <div className="pillars-grid">
          {INNOVATION_PILLARS.map((pillar) => (
            <article key={pillar.title} className="pillar-card">
              <span className="pillar-icon">
                <Icon name={pillar.icon} size={22} />
              </span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="section-head row-between">
            <div>
              <h2>Publicados recientemente</h2>
              <p>Oferta directa desde puertos ribereños y centros de acopio.</p>
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
          <h2>Explora por categoría agropecuaria</h2>
          <p>Selecciona un sector productivo para filtrar el catálogo regional.</p>
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

      {user?.role !== "BUYER" && (
        <section className="container">
          <div className="cta-band on-dark">
            <div>
              <h2>¿Produces en el Magdalena Medio?</h2>
              <p>
                Publica dictando por voz, consulta precios de referencia SIPSA y
                despacha consolidando carga fluvial o terrestre.
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
