import { Link, useLocation, useParams } from "react-router-dom";
import CategoryArt from "../components/CategoryArt";
import { Alert, ErrorState, PageLoader } from "../components/Feedback";
import Icon from "../components/Icon";
import PurchaseForm from "../components/PurchaseForm";
import { useAuth } from "../context/useAuth";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi } from "../services/agroApi";
import { formatCOP, formatDate, formatQty } from "../utils/format";

function PurchasePanel({ product }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="skeleton skeleton-block tall" />;

  if (!user) {
    return (
      <div className="purchase-form">
        <h2>Solicitar este producto</h2>
        <p className="form-lead">
          Necesitas una cuenta de comprador para enviar una solicitud al
          productor.
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
            Editar este producto
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
            <CategoryArt name={product.category?.name} />
          </div>
          <p className="art-note">
            Ilustración de la categoría. La plataforma aún no guarda fotos de
            los productos.
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
                <Icon name="pin" size={18} />
                Ubicación
              </dt>
              <dd>{place || "No indicada"}</dd>
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
        </article>

        <aside className="detail-side" aria-label="Solicitud de compra">
          <PurchasePanel product={product} />
        </aside>
      </div>
    </div>
  );
}
