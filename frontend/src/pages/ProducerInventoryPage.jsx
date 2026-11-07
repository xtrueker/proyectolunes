import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import Field from "../components/Field";
import { Alert, EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import { useToast } from "../context/useToast";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi } from "../services/agroApi";
import { formatCOP, formatQty } from "../utils/format";

export default function ProducerInventoryPage() {
  usePageTitle("Inventario");

  const toast = useToast();
  const { products, requests, productsLoading, productsError, reloadAll } =
    useOutletContext();

  const [target, setTarget] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);

  // Cantidad comprometida en solicitudes pendientes, por producto.
  const pendingByProduct = useMemo(() => {
    const totals = {};

    requests
      .filter((r) => r.status === "PENDING")
      .forEach((r) => {
        totals[r.product.id] = (totals[r.product.id] || 0) + Number(r.quantity);
      });

    return totals;
  }, [requests]);

  const inventoryValue = products.reduce(
    (sum, p) => sum + Number(p.quantity) * Number(p.price),
    0
  );

  const numericQuantity = Number(quantity);
  const quantityValid = Number.isFinite(numericQuantity) && numericQuantity > 0;

  function openAdjust(product) {
    setTarget(product);
    setQuantity(String(product.quantity));
  }

  async function confirmAdjust() {
    setBusy(true);

    try {
      await catalogApi.updateProduct(target.id, { quantity: numericQuantity });
      toast.success(`Existencias de “${target.name}” actualizadas.`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setTarget(null);
      reloadAll();
    }
  }

  return (
    <section aria-labelledby="titulo-inventario">
      <div className="row-between section-bar">
        <h2 id="titulo-inventario">Inventario</h2>
        {products.length > 0 && (
          <p className="inventory-total">
            Valor del inventario a precio de venta: <strong>{formatCOP(inventoryValue)}</strong>
          </p>
        )}
      </div>

      <Alert tone="info">
        Al aceptar una solicitud, el sistema descuenta las existencias
        automáticamente. Ajusta aquí solo cuando cambie tu disponibilidad real,
        por ejemplo con una nueva cosecha.
      </Alert>

      {productsLoading ? (
        <ListSkeleton count={2} />
      ) : productsError ? (
        <ErrorState message={productsError} onRetry={reloadAll} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="box"
          title="Tu inventario está vacío"
          action={
            <Link to="/panel/productos/nuevo" className="btn btn-primary">
              Publicar un producto
            </Link>
          }
        >
          Cuando publiques productos verás aquí sus existencias.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Existencias de tus productos</caption>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Disponible</th>
                <th scope="col">En solicitudes pendientes</th>
                <th scope="col">Precio</th>
                <th scope="col">Valor en inventario</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const pending = pendingByProduct[product.id] || 0;
                const soldOut = Number(product.quantity) <= 0;
                const exceeds = pending > Number(product.quantity);

                return (
                  <tr key={product.id}>
                    <th scope="row">
                      <Link to={`/productos/${product.id}`}>{product.name}</Link>
                      <small>{product.category?.name}</small>
                    </th>
                    <td>
                      {soldOut ? (
                        <span className="badge badge-rejected">Agotado</span>
                      ) : (
                        `${formatQty(product.quantity)} ${product.unit}`
                      )}
                    </td>
                    <td>
                      {pending > 0 ? (
                        <>
                          {formatQty(pending)} {product.unit}
                          {exceeds && (
                            <small className="text-warning">
                              Supera lo disponible
                            </small>
                          )}
                        </>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td>
                      {formatCOP(product.price)} / {product.unit}
                    </td>
                    <td>{formatCOP(Number(product.quantity) * Number(product.price))}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openAdjust(product)}
                      >
                        <Icon name="edit" size={16} />
                        Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title="Ajustar existencias"
        confirmLabel="Guardar existencias"
        cancelLabel="Cancelar"
        busy={busy}
        confirmDisabled={!quantityValid}
        onConfirm={confirmAdjust}
        onCancel={() => setTarget(null)}
      >
        {target && (
          <div className="stack-sm">
            <p>
              Define la cantidad total que tienes disponible ahora de{" "}
              <strong>{target.name}</strong>. Las solicitudes pendientes no se
              descuentan hasta que las aceptes.
            </p>
            <Field
              label={`Cantidad disponible (${target.unit})`}
              id="stock"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              error={quantityValid ? undefined : "Ingresa una cantidad mayor que cero."}
              hint="Para dejar de vender el producto, desactívalo en la pestaña Productos."
              required
            />
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
