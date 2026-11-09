import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Field from "./Field";
import Icon from "./Icon";
import { Alert } from "./Feedback";
import { useToast } from "../context/useToast";
import useApi from "../hooks/useApi";
import { logisticsApi, poolsApi, requestsApi } from "../services/agroApi";
import { NODE_TYPE_LABELS, TRANSPORT_LABELS } from "../utils/constants";
import { formatCOP, formatDate, formatQty, shortId } from "../utils/format";

function estimateKgClient(quantity, unit = "kg") {
  const num = Number(quantity);
  if (!Number.isFinite(num) || num <= 0) return 0;
  const u = String(unit || "kg").trim().toLowerCase();
  if (u === "tonelada" || u === "ton" || u === "t") return num * 1000;
  if (u === "bulto") return num * 50;
  if (u === "arroba") return num * 12.5;
  if (u === "lb" || u === "libra") return num * 0.5;
  if (u === "caja" || u === "canastilla") return num * 20;
  return num;
}

export default function PurchaseForm({ product, user }) {
  const toast = useToast();
  const nodesQuery = useApi(() => logisticsApi.nodes(), []);
  const nodes = useMemo(() => nodesQuery.data || [], [nodesQuery.data]);

  const [form, setForm] = useState(() => ({
    quantity: "25",
    originNodeId: product.originNodeId || "",
    destNodeId: "",
    origin: product.location || product.producer?.location || "",
    destination: user.location || "",
    transportType: "TERRESTRE",
    joinPool: false,
    selectedPoolId: "",
    notes: "",
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  // Resolver nodos sugeridos cuando cargan los nodos si aún están vacíos.
  const effectiveOriginNodeId = useMemo(() => {
    if (form.originNodeId) return form.originNodeId;
    if (product.originNodeId) return product.originNodeId;
    const hint = (product.location || product.producer?.location || "").toLowerCase();
    const matched = nodes.find((n) => hint.includes(n.name.toLowerCase()));
    return matched?.id || "";
  }, [form.originNodeId, product.originNodeId, product.location, product.producer?.location, nodes]);

  const effectiveDestNodeId = useMemo(() => {
    if (form.destNodeId) return form.destNodeId;
    const hint = (user.location || "").toLowerCase();
    const matched = nodes.find(
      (n) => n.id !== effectiveOriginNodeId && hint.includes(n.name.toLowerCase())
    );
    if (matched) return matched.id;
    const fallback = nodes.find(
      (n) => n.name === "Bucaramanga" && n.id !== effectiveOriginNodeId
    );
    return fallback?.id || "";
  }, [form.destNodeId, user.location, nodes, effectiveOriginNodeId]);

  const weightKg = estimateKgClient(form.quantity, product.unit);

  // Cotización multimodal reactiva sin setState síncrono en useEffect.
  const quoteKey =
    effectiveOriginNodeId &&
    effectiveDestNodeId &&
    effectiveOriginNodeId !== effectiveDestNodeId &&
    weightKg > 0
      ? `${effectiveOriginNodeId}|${effectiveDestNodeId}|${weightKg}|${product.perishability || "MEDIUM"}`
      : "";

  const [quoteResult, setQuoteResult] = useState({
    key: "",
    data: null,
    error: "",
  });

  useEffect(() => {
    if (!quoteKey) return undefined;
    let cancelled = false;

    const [oId, dId, wKg, perish] = quoteKey.split("|");

    logisticsApi
      .quote({
        originNodeId: oId,
        destNodeId: dId,
        weightKg: Number(wKg),
        perishability: perish,
      })
      .then((res) => {
        if (!cancelled) {
          setQuoteResult({ key: quoteKey, data: res.data, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuoteResult({ key: quoteKey, data: null, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quoteKey]);

  const quoteLoading = Boolean(quoteKey) && quoteResult.key !== quoteKey;
  const quoteData = quoteResult.key === quoteKey ? quoteResult.data : null;
  const quoteError = quoteResult.key === quoteKey ? quoteResult.error : "";

  // Consultar pools abiertos en esa ruta.
  const poolsQuery = useApi(
    () =>
      effectiveOriginNodeId &&
      effectiveDestNodeId &&
      effectiveOriginNodeId !== effectiveDestNodeId
        ? poolsApi.available({
            originNodeId: effectiveOriginNodeId,
            destNodeId: effectiveDestNodeId,
          })
        : Promise.resolve({ data: [] }),
    [effectiveOriginNodeId, effectiveDestNodeId]
  );

  const openPools = useMemo(() => poolsQuery.data || [], [poolsQuery.data]);
  const matchingPool = useMemo(
    () => openPools.find((p) => p.availableKg >= weightKg) || openPools[0] || null,
    [openPools, weightKg]
  );

  const selectedComparison = useMemo(() => {
    if (!quoteData?.comparisons?.length) return null;
    return (
      quoteData.comparisons.find((c) => c.mode === form.transportType) ||
      quoteData.optimalByCost ||
      quoteData.comparisons[0]
    );
  }, [quoteData, form.transportType]);

  const pooledFreightPreview = useMemo(() => {
    if (!matchingPool || weightKg <= 0) return null;
    const projectedTotalWeight = matchingPool.currentWeightKg + weightKg;
    if (projectedTotalWeight <= 0) return null;
    return Math.round(
      matchingPool.totalFreightCost * (weightKg / projectedTotalWeight)
    );
  }, [matchingPool, weightKg]);

  const soldOut = Number(product.quantity) <= 0;
  const productSubtotal = (Number(form.quantity) || 0) * Number(product.price);
  const estimatedFreight = form.joinPool && pooledFreightPreview !== null
    ? pooledFreightPreview
    : selectedComparison?.totalCost || 0;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setForm((current) => {
      const next = { ...current, [name]: nextValue };

      if (name === "originNodeId" && value) {
        const node = nodes.find((n) => n.id === value);
        if (node) next.origin = `${node.name}, ${node.department}`;
      }
      if (name === "destNodeId" && value) {
        const node = nodes.find((n) => n.id === value);
        if (node) next.destination = `${node.name}, ${node.department}`;
      }

      return next;
    });
  }

  function selectRouteOption(option) {
    setForm((current) => ({
      ...current,
      transportType: option.mode,
    }));
  }

  function validate() {
    const found = {};
    const quantity = Number(form.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      found.quantity = "Ingresa una cantidad mayor que cero.";
    } else if (quantity > Number(product.quantity)) {
      found.quantity = `Solo hay ${formatQty(product.quantity)} ${product.unit} disponibles.`;
    }

    const originText =
      form.origin.trim() ||
      (effectiveOriginNodeId
        ? nodes.find((n) => n.id === effectiveOriginNodeId)?.name || ""
        : "");
    const destText =
      form.destination.trim() ||
      (effectiveDestNodeId
        ? nodes.find((n) => n.id === effectiveDestNodeId)?.name || ""
        : "");

    if (!originText) found.origin = "Indica el lugar o puerto de origen.";
    if (!destText) found.destination = "Indica el destino de entrega.";

    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError("");

    const originNodeObj = nodes.find((n) => n.id === effectiveOriginNodeId);
    const destNodeObj = nodes.find((n) => n.id === effectiveDestNodeId);

    const originText =
      form.origin.trim() ||
      (originNodeObj ? `${originNodeObj.name}, ${originNodeObj.department}` : "");
    const destText =
      form.destination.trim() ||
      (destNodeObj ? `${destNodeObj.name}, ${destNodeObj.department}` : "");

    const chosenMode = selectedComparison?.mode || form.transportType;

    try {
      const result = await requestsApi.create({
        productId: product.id,
        quantity: Number(form.quantity),
        origin: originText,
        destination: destText,
        transportType: chosenMode,
        originNodeId: effectiveOriginNodeId || null,
        destNodeId: effectiveDestNodeId || null,
        freightCostEstimated: selectedComparison?.totalCost || null,
        notes: form.notes.trim(),
      });

      let finalRequest = result.data;

      if (
        form.joinPool &&
        effectiveOriginNodeId &&
        effectiveDestNodeId &&
        effectiveOriginNodeId !== effectiveDestNodeId
      ) {
        try {
          const poolRes = await poolsApi.join({
            purchaseRequestId: finalRequest.id,
            poolId:
              matchingPool && matchingPool.availableKg >= weightKg
                ? matchingPool.id
                : undefined,
            originNodeId: effectiveOriginNodeId,
            destNodeId: effectiveDestNodeId,
            mode: chosenMode,
          });

          finalRequest = {
            ...finalRequest,
            pool: poolRes.data.pool,
            allocatedFreightCost: poolRes.data.allocation?.allocatedFreightCost,
          };
          toast.success(
            "Solicitud enviada e integrada al Pool de Carga Consolidada."
          );
        } catch (poolErr) {
          toast.info(
            `Solicitud creada, pero no se unió al pool automáticamente: ${poolErr.message}`
          );
        }
      } else {
        toast.success("Solicitud enviada al productor.");
      }

      setCreated(finalRequest);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="purchase-success">
        <span className="success-mark">
          <Icon name="check" size={28} />
        </span>
        <h2>Solicitud enviada</h2>
        <p>
          El productor puede aceptarla o enviarte una contraoferta. El inventario
          solo se descuenta cuando ambas partes confirman.
        </p>

        <dl className="success-facts">
          <div>
            <dt>Solicitud</dt>
            <dd>{shortId(created.id)}</dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>
              {formatQty(created.quantity)} {created.product.unit}
            </dd>
          </div>
          <div>
            <dt>Modalidad</dt>
            <dd>{TRANSPORT_LABELS[created.transportType] || created.transportType}</dd>
          </div>
        </dl>

        {created.pool && (
          <Alert tone="success">
            Unida al Pool Consolidado ({created.pool.originNode?.name} →{" "}
            {created.pool.destNode?.name}). Flete prorrateado estimado:{" "}
            <strong>{formatCOP(created.allocatedFreightCost)}</strong>.
          </Alert>
        )}

        <div className="button-row">
          <Link to="/mis-solicitudes" className="btn btn-primary">
            Ver mis solicitudes
          </Link>
          <Link to="/catalogo" className="btn btn-secondary">
            Seguir explorando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="purchase-form" onSubmit={handleSubmit} noValidate>
      <h2>Cotizar ruta y solicitar</h2>
      <p className="form-lead">
        Compara transporte terrestre, fluvial o híbrido en el Magdalena Medio y
        consolida carga con otros compradores.
      </p>

      {soldOut && (
        <Alert tone="warning">
          Este producto está agotado y no admite nuevas solicitudes.
        </Alert>
      )}

      <Field
        label={`Cantidad (${product.unit})`}
        id="quantity"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        max={product.quantity}
        value={form.quantity}
        onChange={handleChange}
        error={errors.quantity}
        hint={`Disponibles: ${formatQty(product.quantity)} ${product.unit} (~${formatQty(weightKg)} kg)`}
        disabled={soldOut}
        required
      />

      {nodes.length > 0 && (
        <div className="quoter-box">
          <div className="quoter-head">
            <Icon name="route" size={18} />
            <strong>Cotizador Multimodal (Río + Carretera)</strong>
          </div>

          <div className="form-grid">
            <Field
              label="Nodo origen"
              id="originNodeId"
              as="select"
              value={effectiveOriginNodeId}
              onChange={handleChange}
              disabled={soldOut}
            >
              <option value="">Seleccionar origen</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({NODE_TYPE_LABELS[node.type]})
                </option>
              ))}
            </Field>

            <Field
              label="Nodo destino"
              id="destNodeId"
              as="select"
              value={effectiveDestNodeId}
              onChange={handleChange}
              disabled={soldOut}
            >
              <option value="">Seleccionar destino</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({NODE_TYPE_LABELS[node.type]})
                </option>
              ))}
            </Field>
          </div>

          {effectiveOriginNodeId &&
            effectiveDestNodeId &&
            effectiveOriginNodeId === effectiveDestNodeId && (
              <p className="field-hint">
                Elige un nodo de destino diferente al de origen para comparar rutas.
              </p>
            )}

          {quoteLoading && (
            <p className="field-hint">Calculando rutas fluviales y terrestres…</p>
          )}

          {quoteError && <Alert tone="warning">{quoteError}</Alert>}

          {quoteData?.comparisons?.length > 0 && (
            <div className="route-options" role="radiogroup" aria-label="Comparativa de rutas">
              {quoteData.comparisons.map((opt) => {
                const isSelected = selectedComparison?.mode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    className={`route-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => selectRouteOption(opt)}
                    disabled={soldOut}
                  >
                    <div className="route-option-top">
                      <span className="route-mode">
                        <Icon
                          name={
                            opt.mode === "FLUVIAL"
                              ? "boat"
                              : opt.mode === "HIBRIDO"
                                ? "anchor"
                                : "truck"
                          }
                          size={18}
                        />
                        {TRANSPORT_LABELS[opt.mode] || opt.mode}
                      </span>
                      <div className="route-badges">
                        {opt.isCheapest && (
                          <span className="mini-pill pill-best">Menor costo</span>
                        )}
                        {opt.isFastest && (
                          <span className="mini-pill pill-fast">Más rápida</span>
                        )}
                        {opt.co2SavedPct > 0 && (
                          <span className="mini-pill pill-eco">
                            -{opt.co2SavedPct}% CO₂
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="route-option-metrics">
                      <strong>{formatCOP(opt.totalCost)}</strong>
                      <span>
                        {opt.estimatedHours} h · {opt.totalDistanceKm} km
                        {opt.transfersCount > 0
                          ? ` · ${opt.transfersCount} transbordo (${formatCOP(opt.transferCost)})`
                          : ""}
                      </span>
                    </div>

                    <small className="route-steps-text">
                      {opt.steps.map((s) => s.fromNodeName).join(" → ")} →{" "}
                      {opt.steps[opt.steps.length - 1]?.toNodeName}
                    </small>
                  </button>
                );
              })}
            </div>
          )}

          {effectiveOriginNodeId &&
            effectiveDestNodeId &&
            effectiveOriginNodeId !== effectiveDestNodeId && (
              <div className={`pool-banner ${matchingPool ? "has-pool" : ""}`}>
                <label className="pool-check">
                  <input
                    type="checkbox"
                    name="joinPool"
                    checked={form.joinPool}
                    onChange={handleChange}
                    disabled={soldOut}
                  />
                  <div>
                    <span className="pool-title">
                      <Icon name="users" size={17} />
                      {matchingPool
                        ? "Unirse a Pool de Carga Consolidada disponible"
                        : "Iniciar Pool de Carga Consolidada (ventana 48 h)"}
                    </span>
                    {matchingPool ? (
                      <small>
                        Salida {formatDate(matchingPool.departureDate)} · Ocupación{" "}
                        {matchingPool.occupancyPct}% ({formatQty(matchingPool.availableKg)}{" "}
                        kg libres). Tu flete prorrateado estimado:{" "}
                        <strong>{formatCOP(pooledFreightPreview)}</strong>.
                      </small>
                    ) : (
                      <small>
                        Abre un despacho compartido en esta ruta para dividir el
                        flete con otros pedidos de las próximas 48 horas.
                      </small>
                    )}
                  </div>
                </label>
              </div>
            )}
        </div>
      )}

      {!quoteData?.comparisons?.length && (
        <fieldset className="choice-group">
          <legend>Tipo de transporte</legend>
          <div className="choice-row">
            {Object.entries(TRANSPORT_LABELS).map(([value, label]) => (
              <label className="choice" key={value}>
                <input
                  type="radio"
                  name="transportType"
                  value={value}
                  checked={form.transportType === value}
                  onChange={handleChange}
                  disabled={soldOut}
                />
                <Icon
                  name={
                    value === "FLUVIAL"
                      ? "boat"
                      : value === "HIBRIDO"
                        ? "anchor"
                        : "truck"
                  }
                  size={20}
                />
                <strong>{label}</strong>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="form-grid">
        <Field
          label="Origen específico"
          id="origin"
          value={form.origin}
          onChange={handleChange}
          error={errors.origin}
          autoComplete="off"
          disabled={soldOut}
          required
        />

        <Field
          label="Destino de entrega"
          id="destination"
          placeholder="Ej. Centroabastos, Bucaramanga"
          value={form.destination}
          onChange={handleChange}
          error={errors.destination}
          autoComplete="off"
          disabled={soldOut}
          required
        />
      </div>

      <Field
        label="Observaciones"
        id="notes"
        as="textarea"
        rows="2"
        placeholder="Indicaciones de cargue, horario o empaque (opcional)"
        value={form.notes}
        onChange={handleChange}
        disabled={soldOut}
      />

      <div className="estimate">
        <div className="estimate-row">
          <span>Producto ({formatQty(form.quantity)} {product.unit})</span>
          <span>{formatCOP(productSubtotal)}</span>
        </div>
        {estimatedFreight > 0 && (
          <div className="estimate-row">
            <span>
              {form.joinPool ? "Flete consolidado est." : "Flete estimado"}
            </span>
            <span>{formatCOP(estimatedFreight)}</span>
          </div>
        )}
        <div className="estimate-total">
          <span>Total estimado (producto + logística)</span>
          <strong>{formatCOP(productSubtotal + estimatedFreight)}</strong>
        </div>
        <small>El productor confirma precio final o envía contraoferta.</small>
      </div>

      {formError && <Alert tone="error">{formError}</Alert>}

      <button
        type="submit"
        className="btn btn-primary btn-block btn-lg"
        disabled={submitting || soldOut}
      >
        {submitting ? "Enviando solicitud…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
