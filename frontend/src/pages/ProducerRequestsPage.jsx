import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import Field from "../components/Field";
import { Alert, EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import RequestCard from "../components/RequestCard";
import StatusFilter from "../components/StatusFilter";
import { useToast } from "../context/useToast";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { logisticsApi, poolsApi, requestsApi } from "../services/agroApi";
import { NODE_TYPE_LABELS, TRACKING_STAGES } from "../utils/constants";
import { formatCOP, formatQty } from "../utils/format";
import { imageFileToDataUrl } from "../utils/imageFile";
import {
  OFFLINE_QUEUE_EVENT,
  enqueueOfflineTracking,
  flushOfflineTrackingQueue,
  getOfflineTrackingQueue,
} from "../utils/offlineQueue";

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

function nextDayIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function ProducerRequestsPage() {
  usePageTitle("Solicitudes recibidas");

  const toast = useToast();
  const { requests, requestsLoading, requestsError, reloadAll } = useOutletContext();
  const nodesQuery = useApi(() => logisticsApi.nodes(), []);
  const nodes = useMemo(() => nodesQuery.data || [], [nodesQuery.data]);

  const [filter, setFilter] = useState("ALL");
  const [pending, setPending] = useState(null); // { request, action }
  const [busy, setBusy] = useState(false);
  const [queuedCount, setQueuedCount] = useState(
    () => getOfflineTrackingQueue().length
  );
  const [syncingOffline, setSyncingOffline] = useState(false);

  const syncOfflineNow = useCallback(async () => {
    setSyncingOffline(true);
    try {
      const { synced, remaining } = await flushOfflineTrackingQueue((id, body) =>
        requestsApi.addTracking(id, body)
      );
      if (synced > 0) {
        toast.success(
          `Se sincronizaron ${synced} ${
            synced === 1 ? "hito guardado" : "hitos guardados"
          } sin conexión.`
        );
        reloadAll();
      } else if (remaining > 0) {
        toast.info("Aún sin conexión con el servidor; los hitos siguen seguros en cola.");
      }
    } finally {
      setSyncingOffline(false);
    }
  }, [reloadAll, toast]);

  useEffect(() => {
    function refreshCount() {
      setQueuedCount(getOfflineTrackingQueue().length);
    }
    function handleOnline() {
      syncOfflineNow();
    }

    window.addEventListener(OFFLINE_QUEUE_EVENT, refreshCount);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_EVENT, refreshCount);
      window.removeEventListener("online", handleOnline);
    };
  }, [syncOfflineNow]);

  // Modal de contraoferta
  const [counterTarget, setCounterTarget] = useState(null);
  const [counterForm, setCounterForm] = useState({
    counterPrice: "",
    counterDate: "",
    negotiationNotes: "",
  });

  // Modal de trazabilidad
  const [trackingTarget, setTrackingTarget] = useState(null);
  const [trackingForm, setTrackingForm] = useState({
    stage: "ORIGIN_HUB",
    notes: "",
    evidenceImageUrl: "",
  });

  // Modal de consolidación en pool
  const [poolTarget, setPoolTarget] = useState(null);
  const [poolForm, setPoolForm] = useState({
    originNodeId: "",
    destNodeId: "",
  });

  const visible =
    filter === "ALL" ? requests : requests.filter((r) => r.status === filter);

  async function confirmAction() {
    setBusy(true);

    try {
      await requestsApi.updateStatus(pending.request.id, pending.action);
      toast.success(ACTIONS[pending.action].success);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setPending(null);
      reloadAll();
    }
  }

  function openCounterModal(request) {
    setCounterTarget(request);
    setCounterForm({
      counterPrice: String(request.counterPrice ?? request.unitPriceAtRequest),
      counterDate: request.counterDate
        ? new Date(request.counterDate).toISOString().slice(0, 10)
        : nextDayIso(),
      negotiationNotes: request.negotiationNotes || "",
    });
  }

  async function submitCounteroffer() {
    setBusy(true);
    try {
      await requestsApi.counteroffer(counterTarget.id, {
        counterPrice: Number(counterForm.counterPrice),
        counterDate: counterForm.counterDate || null,
        negotiationNotes: counterForm.negotiationNotes.trim(),
      });
      toast.success("Contraoferta enviada al comprador.");
      setCounterTarget(null);
      reloadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openTrackingModal(request) {
    const existingStages = (request.trackingEvents || []).map((e) => e.stage);
    const nextStage =
      TRACKING_STAGES.find((s) => !existingStages.includes(s.value))?.value ||
      "DELIVERED";

    setTrackingTarget(request);
    setTrackingForm({
      stage: nextStage,
      notes: "",
      evidenceImageUrl: "",
    });
  }

  async function handleTrackingPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await imageFileToDataUrl(file);
      setTrackingForm((cur) => ({ ...cur, evidenceImageUrl: dataUrl }));
      toast.info("Foto de verificación adjuntada.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      event.target.value = "";
    }
  }

  async function submitTrackingEvent() {
    const payload = {
      stage: trackingForm.stage,
      notes: trackingForm.notes.trim(),
      evidenceImageUrl: trackingForm.evidenceImageUrl.trim() || null,
    };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      enqueueOfflineTracking(trackingTarget.id, payload);
      toast.info(
        "Modo rural sin señal: hito y evidencia guardados localmente para sincronizar al recuperar red."
      );
      setTrackingTarget(null);
      return;
    }

    setBusy(true);
    try {
      const res = await requestsApi.addTracking(trackingTarget.id, payload);
      toast.success(res.message || "Avance de ruta registrado en la línea de tiempo.");
      setTrackingTarget(null);
      reloadAll();
    } catch (err) {
      if (err.status === 0) {
        enqueueOfflineTracking(trackingTarget.id, payload);
        toast.info(
          "Sin conexión al servidor: hito guardado en cola offline para sincronización automática."
        );
        setTrackingTarget(null);
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function openPoolModal(request) {
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

  async function submitJoinPool() {
    setBusy(true);
    try {
      const res = await poolsApi.join({
        purchaseRequestId: poolTarget.id,
        originNodeId: poolForm.originNodeId,
        destNodeId: poolForm.destNodeId,
        mode: poolTarget.transportType,
      });
      toast.success(
        `Pedido consolidado. Flete prorrateado: ${formatCOP(
          res.data.allocation?.allocatedFreightCost
        )}.`
      );
      setPoolTarget(null);
      reloadAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const counterPriceValid =
    Number.isFinite(Number(counterForm.counterPrice)) &&
    Number(counterForm.counterPrice) > 0;

  const poolFormValid =
    Boolean(poolForm.originNodeId) &&
    Boolean(poolForm.destNodeId) &&
    poolForm.originNodeId !== poolForm.destNodeId;

  return (
    <section aria-labelledby="titulo-solicitudes">
      <div className="section-bar row-between">
        <h2 id="titulo-solicitudes">Solicitudes recibidas</h2>
        {queuedCount > 0 && (
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={syncOfflineNow}
            disabled={syncingOffline}
          >
            <Icon name="cloud" size={16} />
            {syncingOffline
              ? "Sincronizando…"
              : `Sincronizar cola offline (${queuedCount})`}
          </button>
        )}
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
                            className="btn btn-secondary"
                            onClick={() => openCounterModal(request)}
                          >
                            <Icon name="swap" size={16} />
                            Contraofertar
                          </button>
                          {!request.poolId && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openPoolModal(request)}
                            >
                              <Icon name="users" size={16} />
                              Consolidar en Pool
                            </button>
                          )}
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

                    {request.status === "COUNTER_OFFERED" && (
                      <div className="button-row">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openCounterModal(request)}
                        >
                          <Icon name="edit" size={16} />
                          Ajustar contraoferta
                        </button>
                      </div>
                    )}

                    {request.status === "ACCEPTED" && (
                      <div className="button-row">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openTrackingModal(request)}
                        >
                          <Icon name="camera" size={16} />
                          Registrar avance / foto
                        </button>
                        {!request.poolId && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => openPoolModal(request)}
                          >
                            <Icon name="users" size={16} />
                            Consolidar en Pool
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setPending({ request, action: "COMPLETED" })}
                        >
                          Marcar como completada
                        </button>
                      </div>
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

      {/* Modal de Contraoferta */}
      <ConfirmDialog
        open={Boolean(counterTarget)}
        title="Proponer contraoferta al comprador"
        confirmLabel="Enviar contraoferta"
        cancelLabel="Cancelar"
        busy={busy}
        confirmDisabled={!counterPriceValid}
        onConfirm={submitCounteroffer}
        onCancel={() => setCounterTarget(null)}
      >
        {counterTarget && (
          <div className="stack-sm">
            <p>
              Pedido de{" "}
              <strong>
                {formatQty(counterTarget.quantity)} {counterTarget.product.unit}{" "}
                de {counterTarget.product.name}
              </strong>
              . El inventario se descontará únicamente si el comprador acepta tu
              propuesta.
            </p>
            <Field
              label={`Nuevo precio por ${counterTarget.product.unit} (COP)`}
              id="counterPrice"
              type="number"
              min="1"
              step="any"
              value={counterForm.counterPrice}
              onChange={(e) =>
                setCounterForm((c) => ({ ...c, counterPrice: e.target.value }))
              }
              required
            />
            <Field
              label="Fecha estimada de despacho"
              id="counterDate"
              type="date"
              value={counterForm.counterDate}
              onChange={(e) =>
                setCounterForm((c) => ({ ...c, counterDate: e.target.value }))
              }
            />
            <Field
              label="Mensaje o condiciones para el comprador"
              id="negotiationNotes"
              as="textarea"
              rows="3"
              placeholder="Ej. Cosecha lista el jueves en puerto de Cantagallo; incluye empaque en canastilla."
              value={counterForm.negotiationNotes}
              onChange={(e) =>
                setCounterForm((c) => ({
                  ...c,
                  negotiationNotes: e.target.value,
                }))
              }
            />
          </div>
        )}
      </ConfirmDialog>

      {/* Modal de Trazabilidad Multimodal */}
      <ConfirmDialog
        open={Boolean(trackingTarget)}
        title="Registrar hito de trazabilidad"
        confirmLabel="Guardar avance"
        cancelLabel="Cancelar"
        busy={busy}
        onConfirm={submitTrackingEvent}
        onCancel={() => setTrackingTarget(null)}
      >
        {trackingTarget && (
          <div className="stack-sm">
            <Field
              label="Etapa logística actual"
              id="stage"
              as="select"
              value={trackingForm.stage}
              onChange={(e) =>
                setTrackingForm((c) => ({ ...c, stage: e.target.value }))
              }
              required
            >
              {TRACKING_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Field>

            <Field
              label="Notas de inspección o transbordo"
              id="trackingNotes"
              as="textarea"
              rows="2"
              placeholder="Ej. Carga embarcada en planchón Río Sol II sin novedad."
              value={trackingForm.notes}
              onChange={(e) =>
                setTrackingForm((c) => ({ ...c, notes: e.target.value }))
              }
            />

            <Field
              label="URL de foto de verificación (opcional)"
              id="evidenceImageUrl"
              placeholder="https://ejemplo.com/evidencia-puerto.jpg"
              value={
                trackingForm.evidenceImageUrl.startsWith("data:")
                  ? ""
                  : trackingForm.evidenceImageUrl
              }
              onChange={(e) =>
                setTrackingForm((c) => ({
                  ...c,
                  evidenceImageUrl: e.target.value,
                }))
              }
              hint={
                trackingForm.evidenceImageUrl.startsWith("data:")
                  ? "Foto local cargada lista para adjuntar."
                  : "Adjunta foto del pesaje, embarque o transbordo puerto-camión."
              }
            />

            <div className="photo-upload-actions">
              <label className="btn btn-secondary btn-sm file-btn">
                <Icon name="camera" size={16} />
                Subir foto de evidencia
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleTrackingPhoto}
                />
              </label>
              {trackingForm.evidenceImageUrl && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setTrackingForm((c) => ({ ...c, evidenceImageUrl: "" }))
                  }
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>
        )}
      </ConfirmDialog>

      {/* Modal de Consolidación en Pool */}
      <ConfirmDialog
        open={Boolean(poolTarget)}
        title="Unir pedido a Pool de Carga Consolidada"
        confirmLabel="Consolidar flete"
        cancelLabel="Cancelar"
        busy={busy}
        confirmDisabled={!poolFormValid}
        onConfirm={submitJoinPool}
        onCancel={() => setPoolTarget(null)}
      >
        {poolTarget && (
          <div className="stack-sm">
            <p>
              Se buscará un despacho grupal abierto en ventana de 48 horas (o se
              abrirá uno nuevo) y se prorrateará el flete según el peso de cada
              participante.
            </p>
            <Field
              label="Nodo de salida"
              id="poolOrigin"
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
              label="Nodo de destino"
              id="poolDest"
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
    </section>
  );
}
