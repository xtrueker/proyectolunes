import { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import RequestCard from "../components/RequestCard";
import StatusFilter from "../components/StatusFilter";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { requestsApi } from "../services/agroApi";
import { formatQty } from "../utils/format";

export default function BuyerRequestsPage() {
  usePageTitle("Mis solicitudes");

  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => requestsApi.list(), []);

  const [filter, setFilter] = useState("ALL");
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const requests = data || [];
  const visible =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  async function confirmCancel() {
    setBusy(true);

    try {
      await requestsApi.updateStatus(target.id, "CANCELLED");
      toast.success("Solicitud cancelada.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setTarget(null);
      reload();
    }
  }

  return (
    <div className="container page">
      <header className="page-head row-between">
        <div>
          <h1>Mis solicitudes</h1>
          <p>
            Historial de las solicitudes de compra de {user.name}. Solo puedes
            cancelar las que siguen pendientes.
          </p>
        </div>
        <Link to="/catalogo" className="btn btn-primary">
          <Icon name="plus" size={18} />
          Nueva solicitud
        </Link>
      </header>

      {loading && !data ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="list"
          title="Aún no has enviado solicitudes"
          action={
            <Link to="/catalogo" className="btn btn-primary">
              Explorar el catálogo
            </Link>
          }
        >
          Cuando solicites un producto, aquí verás su estado y su historial.
        </EmptyState>
      ) : (
        <>
          <StatusFilter requests={requests} value={filter} onChange={setFilter} />

          {visible.length === 0 ? (
            <EmptyState icon="search" title="No hay solicitudes con este estado">
              Elige otro estado para ver el resto de tu historial.
            </EmptyState>
          ) : (
            <div className="stack">
              {visible.map((request) => (
                <RequestCard key={request.id} request={request}>
                  {request.status === "PENDING" && (
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      onClick={() => setTarget(request)}
                    >
                      Cancelar solicitud
                    </button>
                  )}
                </RequestCard>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title="¿Cancelar esta solicitud?"
        confirmLabel="Sí, cancelar solicitud"
        cancelLabel="Mantenerla"
        tone="danger"
        busy={busy}
        onConfirm={confirmCancel}
        onCancel={() => setTarget(null)}
      >
        {target && (
          <p>
            Cancelarás tu solicitud de {formatQty(target.quantity)}{" "}
            {target.product.unit} de {target.product.name}. El productor ya no
            podrá aceptarla.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
