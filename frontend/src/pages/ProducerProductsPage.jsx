import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { Alert, EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import ProductVisual from "../components/ProductVisual";
import { useToast } from "../context/useToast";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi } from "../services/agroApi";
import { NODE_TYPE_LABELS } from "../utils/constants";
import { formatCOP, formatQty } from "../utils/format";

export default function ProducerProductsPage() {
  usePageTitle("Mis productos");

  const toast = useToast();
  const { products, requests, productsLoading, productsError, reloadAll } =
    useOutletContext();

  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const pendingForTarget = target
    ? requests.filter(
      (r) =>
        ["PENDING", "COUNTER_OFFERED"].includes(r.status) &&
        r.product.id === target.id
    ).length
    : 0;

  async function confirmDeactivate() {
    setBusy(true);

    try {
      await catalogApi.deactivateProduct(target.id);
      toast.success(`“${target.name}” se desactivó y salió del catálogo.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setTarget(null);
      reloadAll();
    }
  }

  return (
    <section aria-labelledby="titulo-productos">
      <div className="row-between section-bar">
        <h2 id="titulo-productos">Mis productos</h2>
        <Link to="/panel/productos/nuevo" className="btn btn-primary">
          <Icon name="plus" size={18} />
          Nuevo producto
        </Link>
      </div>

      {productsLoading ? (
        <ListSkeleton />
      ) : productsError ? (
        <ErrorState message={productsError} onRetry={reloadAll} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="leaf"
          title="Aún no has publicado productos"
          action={
            <Link to="/panel/productos/nuevo" className="btn btn-primary">
              Publicar mi primer producto
            </Link>
          }
        >
          Publica un producto para que los compradores lo vean en el catálogo.
        </EmptyState>
      ) : (
        <>
          <ul className="producer-list">
            {products.map((product) => (
              <li className="producer-item" key={product.id}>
                <div className="producer-item-art" aria-hidden="true">
                  <ProductVisual
                    imageUrl={product.imageUrl}
                    categoryName={product.category?.name}
                    alt={product.name}
                  />
                </div>

                <div className="producer-item-info">
                  <p className="product-card-cat">{product.category?.name}</p>
                  <h3>
                    <Link to={`/productos/${product.id}`}>{product.name}</Link>
                  </h3>
                  <p className="producer-item-meta">
                    {formatCOP(product.price)} por {product.unit} ·{" "}
                    {Number(product.quantity) <= 0
                      ? "Agotado"
                      : `${formatQty(product.quantity)} ${product.unit} disponibles`}
                    {product.originNode && (
                      <>
                        {" · "}
                        <span>
                          Nodo: {product.originNode.name} (
                          {NODE_TYPE_LABELS[product.originNode.type] ||
                            product.originNode.type}
                          )
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="producer-item-actions">
                  <Link
                    to={`/panel/productos/${product.id}/editar`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Icon name="edit" size={16} />
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => setTarget(product)}
                  >
                    <Icon name="power" size={16} />
                    Desactivar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="footnote">
            Aquí aparecen tus productos activos. Puedes asociarles foto real del
            lote y puerto/centro de acopio en Editar.
          </p>
        </>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title="¿Desactivar este producto?"
        confirmLabel="Sí, desactivar"
        cancelLabel="Mantenerlo activo"
        tone="danger"
        busy={busy}
        onConfirm={confirmDeactivate}
        onCancel={() => setTarget(null)}
      >
        {target && (
          <div className="stack-sm">
            <p>
              “{target.name}” dejará de mostrarse en el catálogo. Las solicitudes
              ya registradas se conservan.
            </p>
            {pendingForTarget > 0 && (
              <Alert tone="warning">
                Tiene {pendingForTarget}{" "}
                {pendingForTarget === 1 ? "solicitud activa" : "solicitudes activas"}.
                Un producto desactivado no permite aceptarlas.
              </Alert>
            )}
            <p>Esta plataforma no incluye una acción para reactivarlo.</p>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
