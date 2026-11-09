import { Link, useLocation, useParams } from "react-router-dom";
import { Alert, ErrorState, PageLoader } from "../components/Feedback";
import Icon from "../components/Icon";
import ProductVisual from "../components/ProductVisual";
import PurchaseForm from "../components/PurchaseForm";
import { useAuth } from "../context/useAuth";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi, logisticsApi } from "../services/agroApi";
import { NODE_TYPE_LABELS } from "../utils/constants";
import { formatCOP, formatDate, formatQty } from "../utils/format";

function FairTradeInsights({ product }) {
  const { data: fair } = useApi(
    () =>
      logisticsApi.fairPrice({
        productName: product.name,
        categoryName: product.category?.name,
        unit: product.unit,
        producerPrice: product.price,
        quantity: Math.min(200, Math.max(50, product.quantity)),
        originNodeId: product.originNodeId || undefined,
      }),
    [product.id, product.price]
  );

  if (!fair) return null;

  return (
    <section className="fair-detail-banner" aria-label="Transparencia de precio directo">
      <div className="fair-detail-head">
        <Icon name="spark" size={18} />
        <strong>Transparencia de Comercio Directo (Ref. SIPSA-DANE)</strong>
      </div>

      <div className="fair-detail-grid">
        <div>
          <span>Intermediario típico en puerto</span>
          <strong>
            {formatCOP(fair.intermediaryTypicalPerUnit)} / {product.unit}
          </strong>
        </div>
        <div>
          <span>Precio directo aquí</span>
          <strong className="is-highlight-price">
            {formatCOP(product.price)} / {product.unit}
          </strong>
        </div>
        <div>
          <span>Central mayorista (ref.)</span>
          <strong>
            {formatCOP(fair.wholesaleRefPerUnit)} / {product.unit}
          </strong>
        </div>
      </div>

      <p className="fair-detail-foot">
        {fair.producerGainVsIntermediaryPct > 0 && (
          <span>
            El productor recibe{" "}
            <strong>+{fair.producerGainVsIntermediaryPct}%</strong> frente a la
            intermediación tradicional.{" "}
          </span>
        )}
        {fair.buyerSavingsVsWholesalePct > 0 && (
          <span>
            El comprador ahorra aprox.{" "}
            <strong>{fair.buyerSavingsVsWholesalePct}%</strong> puesto en destino
            frente a central mayorista.
          </span>
        )}
      </p>
    </section>
  );
}

function PurchasePanel({ product }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="skeleton skeleton-block tall" />;

  if (!user) {
    return (
      <div className="purchase-form">
        <h2>Cotizar y solicitar</h2>
        <p className="form-lead">
          Inicia sesión como comprador para cotizar rutas multimodales, unirte a
          un pool de carga consolidada y enviar tu solicitud.
        </p>
        <div className="stack-sm">
          <Link
            to="/ingresar"
            state={{ from: location.pathname }}
            className="btn btn-primary btn-block btn-lg"
          >
            Iniciar sesión
          </Link>
          <Link to="/registro" className="btn btn-secondary btn-block">
            Crear cuenta de comprador
          </Link>
          <Link to="/logistica" className="btn btn-ghost btn-block">
            <Icon name="route" size={18} />
            Probar simulador de rutas
          </Link>
        </div>
      </div>
    );
  }

  if (user.role === "PRODUCER") {
    const isOwner = product.producer?.id === user.id;

    return (
      <div className="purchase-form">
        <h2>Cuenta de productor</h2>
        <Alert tone="info">
          Las solicitudes de compra solo las envían las cuentas de comprador.
        </Alert>
        {isOwner && (
          <Link
            to={`/panel/productos/${product.id}/editar`}
            className="btn btn-primary btn-block"
          >
            <Icon name="edit" size={18} />
            Editar producto / foto / nodo
          </Link>
        )}
      </div>
    );
  }

  return <PurchaseForm key={product.id} product={product} user={user} />;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { data: product, loading, error, reload } = useApi(
    () => catalogApi.product(id),
    [id]
  );

  usePageTitle(product?.name || "Producto");

  if (loading) return <PageLoader label="Cargando producto…" />;

  if (error || !product) {
    return (
      <div className="container narrow-page">
        <ErrorState message={error || "Producto no encontrado."} onRetry={reload} />
        <p className="center-text">
          <Link to="/catalogo" className="btn btn-secondary">
            Volver al catálogo
          </Link>
        </p>
      </div>
    );
  }

  const soldOut = Number(product.quantity) <= 0;
  const place = product.location || product.producer?.location;

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link>
        <Link to="/catalogo">Catálogo</Link>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-art">
            <ProductVisual
              imageUrl={product.imageUrl}
              categoryName={product.category?.name}
              alt={product.name}
            />
          </div>
          <p className="art-note">
            {product.imageUrl
              ? "Fotografía real del lote publicada por el productor."
              : "Ilustración de referencia por categoría (el productor aún no adjuntó foto del lote)."}
          </p>

          <p className="product-card-cat">{product.category?.name}</p>
          <h1>{product.name}</h1>

          <p className="detail-price">
            <strong>{formatCOP(product.price)}</strong>
            <span> por {product.unit}</span>
          </p>

          <h2 className="h-sm">Descripción</h2>
          <p className="detail-desc">{product.description}</p>

          <dl className="detail-facts">
            <div>
              <dt>
                <Icon name="box" size={18} />
                Disponibilidad
              </dt>
              <dd>
                {soldOut
                  ? "Agotado"
                  : `${formatQty(product.quantity)} ${product.unit}`}
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="anchor" size={18} />
                Nodo logístico origen
              </dt>
              <dd>
                {product.originNode
                  ? `${product.originNode.name} (${NODE_TYPE_LABELS[product.originNode.type] || product.originNode.type})`
                  : place || "No indicado"}
              </dd>
            </div>
            <div>
              <dt>
                <Icon name="user" size={18} />
                Productor
              </dt>
              <dd>{product.producer?.name}</dd>
            </div>
            <div>
              <dt>
                <Icon name="clock" size={18} />
                Publicado
              </dt>
              <dd>{formatDate(product.createdAt)}</dd>
            </div>
          </dl>

          <FairTradeInsights product={product} />
        </article>

        <aside className="detail-side" aria-label="Solicitud de compra y logística">
          <PurchasePanel product={product} />
        </aside>
      </div>
    </div>
  );
}
