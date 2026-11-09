import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CorridorMap from "../components/CorridorMap";
import Field from "../components/Field";
import { Alert, EmptyState, ErrorState, ListSkeleton } from "../components/Feedback";
import Icon from "../components/Icon";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { logisticsApi, poolsApi } from "../services/agroApi";
import {
  NODE_TYPE_LABELS,
  PERISHABILITY_OPTIONS,
  POOL_STATUS_LABELS,
  RIVER_CONDITION_OPTIONS,
  TRANSPORT_LABELS,
} from "../utils/constants";
import { formatCOP, formatDate, formatQty, shortId } from "../utils/format";

export default function LogisticsPage() {
  usePageTitle("Red Logística Viva y Pools");

  const nodesQuery = useApi(() => logisticsApi.nodes(), []);
  const segmentsQuery = useApi(() => logisticsApi.segments(), []);
  const poolsQuery = useApi(() => poolsApi.available(), []);

  const nodes = useMemo(() => nodesQuery.data || [], [nodesQuery.data]);
  const segments = useMemo(() => segmentsQuery.data || [], [segmentsQuery.data]);
  const pools = useMemo(() => poolsQuery.data || [], [poolsQuery.data]);

  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [weightKg, setWeightKg] = useState("1000");
  const [riverCondition, setRiverCondition] = useState("NORMAL");
  const [perishability, setPerishability] = useState("MEDIUM");
  const [selectedMode, setSelectedMode] = useState("");

  const effectiveOriginId = useMemo(() => {
    if (originId) return originId;
    return nodes.find((n) => n.name === "Cantagallo")?.id || nodes[0]?.id || "";
  }, [originId, nodes]);

  const effectiveDestId = useMemo(() => {
    if (destId) return destId;
    return (
      nodes.find((n) => n.name === "Bucaramanga" && n.id !== effectiveOriginId)?.id ||
      nodes.find((n) => n.id !== effectiveOriginId)?.id ||
      ""
    );
  }, [destId, nodes, effectiveOriginId]);

  const numericWeight = Number(weightKg);
  const quoteKey =
    effectiveOriginId &&
    effectiveDestId &&
    effectiveOriginId !== effectiveDestId &&
    Number.isFinite(numericWeight) &&
    numericWeight > 0
      ? `${effectiveOriginId}|${effectiveDestId}|${numericWeight}|${riverCondition}|${perishability}`
      : "";

  const [quoteState, setQuoteState] = useState({
    key: "",
    data: null,
    error: "",
  });

  useEffect(() => {
    if (!quoteKey) return undefined;
    let cancelled = false;
    const [oId, dId, wKg, rCond, perish] = quoteKey.split("|");

    logisticsApi
      .quote({
        originNodeId: oId,
        destNodeId: dId,
        weightKg: Number(wKg),
        riverCondition: rCond,
        perishability: perish,
      })
      .then((res) => {
        if (!cancelled) {
          setQuoteState({ key: quoteKey, data: res.data, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuoteState({ key: quoteKey, data: null, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quoteKey]);

  const quoteLoading = Boolean(quoteKey) && quoteState.key !== quoteKey;
  const quote = quoteState.key === quoteKey ? quoteState.data : null;
  const quoteError = quoteState.key === quoteKey ? quoteState.error : "";

  const activeMapOption = useMemo(() => {
    if (!quote?.comparisons?.length) return null;
    return (
      quote.comparisons.find((c) => c.mode === selectedMode) ||
      quote.optimalSmart ||
      quote.optimalByCost ||
      quote.comparisons[0]
    );
  }, [quote, selectedMode]);

  return (
    <div className="container page">
      <header className="page-head row-between">
        <div>
          <h1>Logística Viva del Río Magdalena y Consolidación</h1>
          <p>
            Simula rutas multimodales considerando caudal hidrológico (IDEAM),
            perecibilidad de la cosecha, ahorro de CO₂ y pools colaborativos.
          </p>
        </div>
        <Link to="/catalogo" className="btn btn-primary">
          Ir al catálogo comercial
        </Link>
      </header>

      <section className="logistics-simulator" aria-labelledby="titulo-simulador">
        <div className="section-head">
          <h2 id="titulo-simulador">Gemelo Logístico Multimodal (Río + Carretera)</h2>
          <p>
            Ajusta origen, destino, estado del río y tipo de cultivo para ver cómo
            se adapta la recomendación inteligente en el mapa.
          </p>
        </div>

        <div className="simulator-controls is-five">
          <Field
            label="Origen (Puerto / Acopio)"
            id="simOrigin"
            as="select"
            value={effectiveOriginId}
            onChange={(e) => setOriginId(e.target.value)}
          >
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} ({node.department})
              </option>
            ))}
          </Field>

          <Field
            label="Destino"
            id="simDest"
            as="select"
            value={effectiveDestId}
            onChange={(e) => setDestId(e.target.value)}
          >
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name} ({node.department})
              </option>
            ))}
          </Field>

          <Field
            label="Condición del Río Magdalena"
            id="simRiver"
            as="select"
            value={riverCondition}
            onChange={(e) => setRiverCondition(e.target.value)}
          >
            {RIVER_CONDITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Field>

          <Field
            label="Perecibilidad del lote"
            id="simPerish"
            as="select"
            value={perishability}
            onChange={(e) => setPerishability(e.target.value)}
          >
            {PERISHABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Field>

          <Field
            label="Peso (kg)"
            id="simWeight"
            type="number"
            min="10"
            step="50"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>

        {quote?.riverConditionMeta && riverCondition !== "NORMAL" && (
          <div className="hydro-banner">
            <Icon name="wave" size={18} />
            <div>
              <strong>{quote.riverConditionMeta.label}:</strong>{" "}
              {quote.riverConditionMeta.summary}
            </div>
          </div>
        )}

        <CorridorMap
          nodes={nodes}
          segments={segments}
          pools={pools}
          originId={effectiveOriginId}
          destId={effectiveDestId}
          activeOption={activeMapOption}
          riverCondition={riverCondition}
          onSelectOrigin={(id) => setOriginId(id)}
          onSelectDest={(id) => setDestId(id)}
          onSwapNodes={() => {
            setOriginId(effectiveDestId);
            setDestId(effectiveOriginId);
          }}
        />

        {effectiveOriginId === effectiveDestId && effectiveOriginId && (
          <Alert tone="warning">
            Selecciona un nodo de destino diferente al de origen.
          </Alert>
        )}

        {quoteLoading && (
          <p className="result-count">Recalculando rutas, riesgo de merma y huella de carbono…</p>
        )}

        {quoteError && <Alert tone="error">{quoteError}</Alert>}

        {quote?.comparisons?.length > 0 && (
          <div className="quote-cards-grid">
            {quote.comparisons.map((opt) => {
              const isSelected = activeMapOption?.mode === opt.mode;
              return (
                <article
                  key={opt.mode}
                  className={`quote-card is-interactive ${isSelected ? "is-optimal" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedMode(opt.mode)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedMode(opt.mode);
                    }
                  }}
                >
                  <header className="quote-card-head">
                    <span className="route-mode">
                      <Icon
                        name={
                          opt.mode === "FLUVIAL"
                            ? "boat"
                            : opt.mode === "HIBRIDO"
                              ? "anchor"
                              : "truck"
                        }
                        size={20}
                      />
                      {TRANSPORT_LABELS[opt.mode] || opt.mode}
                    </span>
                    <div className="route-badges">
                      {opt.isSmartRecommended && (
                        <span className="mini-pill pill-best">
                          <Icon name="spark" size={12} /> Recomendada IA/Merma
                        </span>
                      )}
                      {opt.isCheapest && !opt.isSmartRecommended && (
                        <span className="mini-pill pill-best">Menor flete</span>
                      )}
                      {opt.isFastest && (
                        <span className="mini-pill pill-fast">Más rápida</span>
                      )}
                    </div>
                  </header>

                  <p className="quote-price">{formatCOP(opt.totalCost)}</p>

                  <dl className="quote-metrics">
                    <div>
                      <dt>Tiempo est.</dt>
                      <dd>{opt.estimatedHours} h</dd>
                    </div>
                    <div>
                      <dt>Riesgo merma</dt>
                      <dd className={`risk-${opt.spoilageRiskLevel?.toLowerCase()}`}>
                        {opt.spoilageRiskPct}% ({opt.spoilageRiskLevel})
                      </dd>
                    </div>
                    <div>
                      <dt>Huella CO₂</dt>
                      <dd>
                        {opt.co2Kg} kg{" "}
                        {opt.co2SavedPct > 0 && (
                          <small className="co2-tag">-{opt.co2SavedPct}%</small>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <ol className="quote-legs">
                    {opt.steps.map((step, idx) => (
                      <li key={`${step.segmentId}-${idx}`}>
                        <Icon
                          name={step.mode === "FLUVIAL" ? "boat" : "truck"}
                          size={14}
                        />
                        <span>
                          <strong>{step.fromNodeName}</strong> →{" "}
                          <strong>{step.toNodeName}</strong> ({step.distanceKm} km ·{" "}
                          {step.estimatedHours} h)
                        </span>
                      </li>
                    ))}
                  </ol>

                  <span className="quote-card-select-hint">
                    <Icon name="route" size={14} />
                    {isSelected
                      ? "Mostrando trazado en el mapa"
                      : "Clic para trazar esta ruta en el mapa"}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Pools de carga consolidada abiertos */}
      <section className="section-block" aria-labelledby="titulo-pools">
        <div className="section-head row-between">
          <div>
            <h2 id="titulo-pools">Pools de Carga Consolidada Abiertos</h2>
            <p>
              Despachos colaborativos activos (marcados en dorado en el mapa) donde
              productores y compradores dividen el costo total del flete.
            </p>
          </div>
        </div>

        {poolsQuery.loading ? (
          <ListSkeleton count={2} />
        ) : poolsQuery.error ? (
          <ErrorState message={poolsQuery.error} onRetry={poolsQuery.reload} />
        ) : pools.length === 0 ? (
          <EmptyState icon="users" title="No hay pools abiertos en este instante">
            Al crear o gestionar una solicitud de compra puedes iniciar un nuevo
            pool colaborativo automáticamente.
          </EmptyState>
        ) : (
          <div className="pools-grid">
            {pools.map((pool) => {
              const sampleShare =
                numericWeight > 0
                  ? Math.round(
                      pool.totalFreightCost *
                        (numericWeight / (pool.currentWeightKg + numericWeight))
                    )
                  : null;

              return (
                <article key={pool.id} className="pool-card">
                  <div className="pool-card-head">
                    <span className="role-pill">
                      {TRANSPORT_LABELS[pool.mode] || pool.mode}
                    </span>
                    <span className="pool-code">Pool {shortId(pool.id)}</span>
                  </div>

                  <h3>
                    {pool.originNode?.name} → {pool.destNode?.name}
                  </h3>

                  <p className="pool-sub">
                    Salida programada: <strong>{formatDate(pool.departureDate)}</strong> ·{" "}
                    {POOL_STATUS_LABELS[pool.status] || pool.status}
                  </p>

                  <div className="pool-meter" aria-label={`Ocupación ${pool.occupancyPct}%`}>
                    <div
                      className="pool-meter-fill"
                      style={{ width: `${Math.min(100, pool.occupancyPct)}%` }}
                    />
                  </div>

                  <div className="pool-stats">
                    <span>
                      Consolidado: <strong>{formatQty(pool.currentWeightKg)} kg</strong> de{" "}
                      {formatQty(pool.maxCapacityKg)} kg ({pool.occupancyPct}%)
                    </span>
                    <span>
                      Cupo libre: <strong>{formatQty(pool.availableKg)} kg</strong>
                    </span>
                  </div>

                  <div className="pool-Simulation">
                    <span>Flete total del vehículo/barcaza: {formatCOP(pool.totalFreightCost)}</span>
                    {sampleShare !== null && pool.availableKg >= numericWeight && (
                      <strong>
                        Con tu lote de {formatQty(numericWeight)} kg pagarías solo:{" "}
                        {formatCOP(sampleShare)}
                      </strong>
                    )}
                  </div>

                  <div className="pool-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setOriginId(pool.originNodeId);
                        setDestId(pool.destNodeId);
                        setSelectedMode(pool.mode);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Icon name="route" size={15} />
                      Ver en mapa
                    </button>
                    <Link
                      to={`/catalogo?originNodeId=${pool.originNodeId}`}
                      className="btn btn-primary btn-sm"
                    >
                      Ver oferta en {pool.originNode?.name}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Nodos de la red Magdalena Medio */}
      <section className="section-block" aria-labelledby="titulo-nodos">
        <div className="section-head">
          <h2 id="titulo-nodos">Puertos y Centros de Acopio Conectados</h2>
          <p>Haz clic en cualquier nodo para explorar la oferta agrícola disponible en esa zona.</p>
        </div>

        <div className="nodes-grid">
          {nodes.map((node) => (
            <div key={node.id} className="node-card">
              <span className="node-icon">
                <Icon
                  name={
                    node.type === "FLUVIAL_PORT"
                      ? "boat"
                      : node.type === "MIXED_PORT"
                        ? "anchor"
                        : "truck"
                  }
                  size={20}
                />
              </span>
              <div>
                <h3>{node.name}</h3>
                <p>
                  {NODE_TYPE_LABELS[node.type] || node.type} · {node.department}
                </p>
                <Link
                  to={`/catalogo?originNodeId=${node.id}`}
                  className="inline-link"
                >
                  Ver oferta en este nodo
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
