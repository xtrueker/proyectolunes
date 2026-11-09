import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import Field from "../components/Field";
import { EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import RequestCard from "../components/RequestCard";
import StatusFilter from "../components/StatusFilter";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { logisticsApi, poolsApi, requestsApi } from "../services/agroApi";
import { NODE_TYPE_LABELS } from "../utils/constants";
import { formatCOP, formatDate, formatQty } from "../utils/format";

export default function BuyerRequestsPage() {
  usePageTitle("Mis solicitudes");

  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => requestsApi.list(), []);
  const nodesQuery = useApi(() => logisticsApi.nodes(), []);
  const nodes = useMemo(() => nodesQuery.data || [], [nodesQuery.data]);

  const [filter, setFilter] = useState("ALL");
  const [target, setTarget] = useState(null);
  const [counterDecision, setCounterDecision] = useState(null); // { request, decision }
  const [poolTarget, setPoolTarget] = useState(null);
  const [poolForm, setPoolForm] = useState({ originNodeId: "", destNodeId: "" });
  const [escrowTarget, setEscrowTarget] = useState(null);
  const [deliveryTarget, setDeliveryTarget] = useState(null);
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

  async function confirmCounterResponse() {
    setBusy(true);

    try {
      await requestsApi.respondCounteroffer(
        counterDecision.request.id,
        counterDecision.decision
      );
      toast.success(
        counterDecision.decision === "ACCEPT"
          ? "Contraoferta aceptada e inventario reservado."
          : "Contraoferta rechazada."
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setCounterDecision(null);
      reload();
    }
  }

  function openPoolDialog(request) {
    setPoolTarget(request);
    setPoolForm({
      originNodeId:
        request.originNodeId || request.product.originNodeId || nodes[0]?.id || "",
      destNodeId:
        request.destNodeId ||
        nodes.find((n) => n.name === "Bucaramanga")?.id ||
        "",
    });
  }

  async function confirmJoinPool() {
    setBusy(true);

    try {
      const res = await poolsApi.join({
        purchaseRequestId: poolTarget.id,
        originNodeId: poolForm.originNodeId,
        destNodeId: poolForm.destNodeId,
        mode: poolTarget.transportType,
      });
      toast.success(
        `Unida al Pool Consolidado. Tu flete prorrateado es ${formatCOP(
          res.data.allocation?.allocatedFreightCost
        )}.`
      );
      setPoolTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmFundEscrow() {
    setBusy(true);
    try {
      await requestsApi.fundEscrow(escrowTarget.id);
      toast.success(
        "Garantía protegida (Escrow Rural) activada. Se liberará por hitos de ruta."
      );
      setEscrowTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeliveryReceived() {
    setBusy(true);
    try {
      const res = await requestsApi.addTracking(deliveryTarget.id, {
        stage: "DELIVERED",
        notes: "Recepción conforme confirmada por el comprador en destino.",
      });
      toast.success(res.message || "Recepción registrada y garantía liquidada.");
      setDeliveryTarget(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const poolFormValid =
    Boolean(poolForm.originNodeId) &&
    Boolean(poolForm.destNodeId) &&
    poolForm.originNodeId !== poolForm.destNodeId;

  return (
    <div className="container page">
      <header className="page-head row-between">
        <div>
          <h1>Mis solicitudes</h1>
          <p>
            Historial comercial y seguimiento multimodal de {user.name}. Responde
            contraofertas, consolida fletes en pools y revisa cada hito de entrega.
          </p>
        </div>
        <div className="button-row">
          <Link to="/logistica" className="btn btn-secondary">
            <Icon name="route" size={18} />
            Ver Pools y Rutas
          </Link>
          <Link to="/catalogo" className="btn btn-primary">
            <Icon name="plus" size={18} />
            Nueva solicitud
          </Link>
        </div>
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
          Cuando solicites un producto, aquí verás contraofertas, pools de carga
          y trazabilidad en tiempo real.
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
                  <div className="button-row">
                    {request.status === "COUNTER_OFFERED" && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() =>
                            setCounterDecision({ request, decision: "ACCEPT" })
                          }
                        >
                          <Icon name="check" size={16} />
                          Aceptar contraoferta
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline"
                          onClick={() =>
                            setCounterDecision({ request, decision: "REJECT" })
                          }
                        >
                          Rechazar contraoferta
                        </button>
                      </>
                    )}

                    {!request.poolId &&
                      ["PENDING", "COUNTER_OFFERED", "ACCEPTED"].includes(
                        request.status
                      ) && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openPoolDialog(request)}
                        >
                          <Icon name="users" size={16} />
                          Unirse a Pool Consolidado
                        </button>
                      )}

                    {request.status === "ACCEPTED" && !request.escrowStatus && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setEscrowTarget(request)}
                      >
                        <Icon name="shield" size={16} />
                        Activar Pago Protegido (Escrow)
                      </button>
                    )}

                    {request.status === "ACCEPTED" &&
                      !(request.trackingEvents || []).some(
                        (e) => e.stage === "DELIVERED"
                      ) && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setDeliveryTarget(request)}
                        >
                          <Icon name="check" size={16} />
                          Confirmar recepción en destino
                        </button>
                      )}

                    {["PENDING", "COUNTER_OFFERED"].includes(request.status) && (
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        onClick={() => setTarget(request)}
                      >
                        Cancelar solicitud
                      </button>
                    )}
                  </div>
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

      <ConfirmDialog
        open={Boolean(counterDecision)}
        title={
          counterDecision?.decision === "ACCEPT"
            ? "¿Aceptar la contraoferta del productor?"
            : "¿Rechazar la contraoferta?"
        }
        confirmLabel={
          counterDecision?.decision === "ACCEPT"
            ? "Sí, confirmar acuerdo"
            : "Sí, rechazar"
        }
        cancelLabel="Volver"
        tone={counterDecision?.decision === "ACCEPT" ? "primary" : "danger"}
        busy={busy}
        onConfirm={confirmCounterResponse}
        onCancel={() => setCounterDecision(null)}
      >
        {counterDecision && (
          <p>
            {counterDecision.decision === "ACCEPT" ? (
              <>
                Confirmarás{" "}
                <strong>
                  {formatQty(counterDecision.request.quantity)}{" "}
                  {counterDecision.request.product.unit}
                </strong>{" "}
                a{" "}
                <strong>
                  {formatCOP(counterDecision.request.counterPrice)} /{" "}
                  {counterDecision.request.product.unit}
                </strong>
                {counterDecision.request.counterDate
                  ? ` con despacho el ${formatDate(
                      counterDecision.request.counterDate
                    )}`
                  : ""}
                . El inventario del productor quedará reservado de inmediato.
              </>
            ) : (
              "La solicitud pasará a estado Rechazada sin descontar inventario."
            )}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(poolTarget)}
        title="Unirse a Pool de Carga Consolidada"
        confirmLabel="Unirme al Pool"
        cancelLabel="Cancelar"
        busy={busy}
        confirmDisabled={!poolFormValid}
        onConfirm={confirmJoinPool}
        onCancel={() => setPoolTarget(null)}
      >
        {poolTarget && (
          <div className="stack-sm">
            <p>
              Comparte barcaza o camión con otros pedidos en la misma ruta (ventana
              de 48 h). Pagarás únicamente la fracción proporcional a tu peso:
            </p>
            <Field
              label="Nodo logístico de origen"
              id="buyerPoolOrigin"
              as="select"
              value={poolForm.originNodeId}
              onChange={(e) =>
                setPoolForm((c) => ({ ...c, originNodeId: e.target.value }))
              }
              required
            >
              <option value="">Selecciona origen</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({NODE_TYPE_LABELS[node.type]})
                </option>
              ))}
            </Field>
            <Field
              label="Nodo logístico de destino"
              id="buyerPoolDest"
              as="select"
              value={poolForm.destNodeId}
              onChange={(e) =>
                setPoolForm((c) => ({ ...c, destNodeId: e.target.value }))
              }
              required
            >
              <option value="">Selecciona destino</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({NODE_TYPE_LABELS[node.type]})
                </option>
              ))}
            </Field>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(escrowTarget)}
        title="Constituir Garantía Protegida (Escrow Rural)"
        confirmLabel="Custodiar pago en garantía"
        cancelLabel="Cancelar"
        busy={busy}
        onConfirm={confirmFundEscrow}
        onCancel={() => setEscrowTarget(null)}
      >
        {escrowTarget && (
          <div className="stack-sm">
            <p>
              Se custodiará el valor total del pedido + flete acordado (
              <strong>
                {formatCOP(
                  Number(escrowTarget.quantity) *
                    Number(escrowTarget.unitPriceAtRequest) +
                    Number(
                      escrowTarget.allocatedFreightCost ??
                        escrowTarget.freightCostEstimated ??
                        0
                    )
                )}
              </strong>
              ) bajo reglas automáticas sin intermediarios:
            </p>
            <ul className="meta-list">
              <li>
                <Icon name="anchor" size={16} />
                <strong>30 % de anticipo logístico</strong> al verificar acopio
                o transbordo en puerto.
              </li>
              <li>
                <Icon name="check" size={16} />
                <strong>70 % restante</strong> únicamente al registrarse la
                entrega final en destino.
              </li>
            </ul>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deliveryTarget)}
        title="¿Confirmar recepción conforme del lote?"
        confirmLabel="Sí, recibí la carga"
        cancelLabel="Volver"
        busy={busy}
        onConfirm={confirmDeliveryReceived}
        onCancel={() => setDeliveryTarget(null)}
      >
        {deliveryTarget && (
          <p>
            Quedará registrado el hito <strong>Entregado en destino</strong> en
            la trazabilidad{deliveryTarget.escrowStatus ? " y se liberará automáticamente el saldo restante en garantía al productor" : ""}.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
