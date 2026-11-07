import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { Alert, EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import RequestCard from "../components/RequestCard";
import StatusFilter from "../components/StatusFilter";
import { useToast } from "../context/useToast";
import usePageTitle from "../hooks/usePageTitle";
import { requestsApi } from "../services/agroApi";
import { formatQty } from "../utils/format";

const ACTIONS = {
  ACCEPTED: {
    title: "¿Aceptar esta solicitud?",
    confirm: "Sí, aceptar",
    success: "Solicitud aceptada. El inventario se actualizó.",
    tone: "primary",
  },
  REJECTED: {
    title: "¿Rechazar esta solicitud?",
    confirm: "Sí, rechazar",
    success: "Solicitud rechazada.",
    tone: "danger",
  },
  COMPLETED: {
    title: "¿Marcar como completada?",
    confirm: "Sí, marcar completada",
    success: "Solicitud marcada como completada.",
    tone: "primary",
  },
};

function dialogText(action, request) {
  const amount = `${formatQty(request.quantity)} ${request.product.unit} de ${request.product.name}`;

  if (action === "ACCEPTED") {
    return `Aceptarás ${amount}. El sistema descontará esa cantidad del inventario y la acción no se puede deshacer.`;
  }
  if (action === "REJECTED") {
    return `El comprador verá su solicitud de ${amount} como rechazada. El inventario no cambia.`;
  }
  return `Confirma que la entrega de ${amount} ya se realizó.`;
}

export default function ProducerRequestsPage() {
  usePageTitle("Solicitudes recibidas");

  const toast = useToast();
  const { requests, requestsLoading, requestsError, reloadAll } = useOutletContext();

  const [filter, setFilter] = useState("ALL");
  const [pending, setPending] = useState(null); // { request, action }
  const [busy, setBusy] = useState(false);

  const visible =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  async function confirmAction() {
    setBusy(true);

    try {
      await requestsApi.updateStatus(pending.request.id, pending.action);
      toast.success(ACTIONS[pending.action].success);
    } catch (err) {
      // Incluye los 409 del backend (stock insuficiente o solicitud ya modificada).
      toast.error(err.message);
    } finally {
      setBusy(false);
      setPending(null);
      reloadAll();
    }
  }

  return (
    <section aria-labelledby="titulo-solicitudes">
      <div className="section-bar">
        <h2 id="titulo-solicitudes">Solicitudes recibidas</h2>
      </div>

      {requestsLoading ? (
        <ListSkeleton />
      ) : requestsError ? (
        <ErrorState message={requestsError} onRetry={reloadAll} />
      ) : requests.length === 0 ? (
        <EmptyState icon="list" title="Todavía no has recibido solicitudes">
          Cuando un comprador solicite alguno de tus productos aparecerá aquí.
        </EmptyState>
      ) : (
        <>
          <StatusFilter requests={requests} value={filter} onChange={setFilter} />

          {visible.length === 0 ? (
            <EmptyState icon="search" title="No hay solicitudes con este estado">
              Elige otro estado para ver el resto.
            </EmptyState>
          ) : (
            <div className="stack">
              {visible.map((request) => {
                const insufficient =
                  Number(request.quantity) > Number(request.product.quantity);

                return (
                  <RequestCard
                    key={request.id}
                    request={request}
                    party={{
                      label: "Comprador",
                      name: request.buyer?.name,
                      email: request.buyer?.email,
                    }}
                  >
                    {request.status === "PENDING" && (
                      <>
                        {insufficient && (
                          <Alert tone="warning">
                            Las existencias actuales (
                            {formatQty(request.product.quantity)}{" "}
                            {request.product.unit}) no alcanzan para aceptar esta
                            solicitud. Ajusta el inventario o recházala.
                          </Alert>
                        )}
                        <div className="button-row">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={insufficient}
                            onClick={() => setPending({ request, action: "ACCEPTED" })}
                          >
                            Aceptar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger-outline"
                            onClick={() => setPending({ request, action: "REJECTED" })}
                          >
                            Rechazar
                          </button>
                        </div>
                      </>
                    )}

                    {request.status === "ACCEPTED" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setPending({ request, action: "COMPLETED" })}
                      >
                        Marcar como completada
                      </button>
                    )}
                  </RequestCard>
                );
              })}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? ACTIONS[pending.action].title : ""}
        confirmLabel={pending ? ACTIONS[pending.action].confirm : "Confirmar"}
        cancelLabel="Volver"
        tone={pending ? ACTIONS[pending.action].tone : "primary"}
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      >
        {pending && <p>{dialogText(pending.action, pending.request)}</p>}
      </ConfirmDialog>
    </section>
  );
}
