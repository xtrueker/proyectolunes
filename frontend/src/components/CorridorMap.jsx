import { useMemo, useState } from "react";
import Icon from "./Icon";
import { NODE_TYPE_LABELS, TRANSPORT_LABELS } from "../utils/constants";
import { formatCOP, formatQty } from "../utils/format";

const CANVAS = { width: 1040, height: 560 };

// Posiciones cartográficas de alta legibilidad para la cuenca del Magdalena Medio:
// margen occidental (Antioquia / Sur de Bolívar), margen oriental (Santander / Cesar)
// y ascenso a la Cordillera Oriental (Bucaramanga), con separación amplia libre de colisiones.
const CURATED_LAYOUT = {
  "Puerto Berrío": { x: 162, y: 486, dx: 0, dy: 28, anchor: "middle" },
  "Yondó": { x: 308, y: 392, dx: -17, dy: 5, anchor: "end" },
  "Barrancabermeja": { x: 438, y: 376, dx: 17, dy: 16, anchor: "start" },
  "Puerto Wilches": { x: 454, y: 274, dx: 17, dy: 5, anchor: "start" },
  "Cantagallo": { x: 334, y: 256, dx: -17, dy: 5, anchor: "end" },
  "San Pablo": { x: 354, y: 186, dx: -17, dy: 5, anchor: "end" },
  "Simití": { x: 320, y: 114, dx: -17, dy: 5, anchor: "end" },
  "Gamarra": { x: 486, y: 58, dx: -16, dy: -11, anchor: "end" },
  "Aguachica": { x: 656, y: 84, dx: 17, dy: 5, anchor: "start" },
  "Bucaramanga": { x: 862, y: 348, dx: 0, dy: -20, anchor: "middle" },
};

function fallbackProject(lat, lng) {
  const minLat = 6.32;
  const maxLat = 8.48;
  const minLng = -74.55;
  const maxLng = -72.95;
  const x = 90 + ((Number(lng) - minLng) / (maxLng - minLng)) * 860;
  const y = 505 - ((Number(lat) - minLat) / (maxLat - minLat)) * 440;
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), dx: 15, dy: 4, anchor: "start" };
}

function buildCurvedPath(a, b, isRiver) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const pixelDist = Math.hypot(dx, dy) || 1;
  const nx = -dy / pixelDist;
  const ny = dx / pixelDist;
  const bend = isRiver
    ? -Math.min(20, pixelDist * 0.1)
    : Math.min(18, pixelDist * 0.09);
  const cx = Number(((a.x + b.x) / 2 + nx * bend).toFixed(1));
  const cy = Number(((a.y + b.y) / 2 + ny * bend).toFixed(1));
  return {
    d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
    midX: Number(((a.x + 2 * cx + b.x) / 4).toFixed(1)),
    midY: Number(((a.y + 2 * cy + b.y) / 4).toFixed(1)),
    pixelDist,
  };
}

// Cauce principal del Río Magdalena fluyendo entre ambas riberas de sur a norte
const RIVER_SPINE_PATH =
  "M 105 538 C 134 514, 150 498, 162 486 C 232 444, 315 415, 376 384 C 402 344, 404 304, 396 264 C 392 232, 396 206, 402 182 C 410 148, 430 112, 462 78 C 482 58, 508 38, 536 14";

export default function CorridorMap({
  nodes = [],
  segments = [],
  pools = [],
  originId = "",
  destId = "",
  activeOption = null,
  riverCondition = "NORMAL",
  onSelectOrigin,
  onSelectDest,
  onSwapNodes,
}) {
  const [clickTarget, setClickTarget] = useState("DEST");
  const [hoveredId, setHoveredId] = useState(null);

  const positionedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const preset = CURATED_LAYOUT[node.name];
        const layout =
          preset ||
          (node.latitude != null && node.longitude != null
            ? fallbackProject(node.latitude, node.longitude)
            : { x: 520, y: 280, dx: 15, dy: 4, anchor: "start" });

        return { ...node, pos: layout };
      }),
    [nodes]
  );

  const byId = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes]
  );

  const uniqueBaseEdges = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const seg of segments) {
      const pairKey =
        [seg.originId, seg.destinationId].sort().join("|") + "|" + seg.mode;
      if (seen.has(pairKey)) continue;
      const a = byId.get(seg.originId);
      const b = byId.get(seg.destinationId);
      if (!a || !b) continue;
      seen.add(pairKey);
      list.push({
        ...seg,
        a,
        b,
        curve: buildCurvedPath(a.pos, b.pos, seg.mode === "FLUVIAL"),
      });
    }
    return list;
  }, [segments, byId]);

  const activeSteps = useMemo(() => {
    if (!activeOption?.steps?.length) return [];
    return activeOption.steps
      .map((step, index) => {
        const a = byId.get(step.fromNodeId);
        const b = byId.get(step.toNodeId);
        if (!a || !b) return null;
        return {
          ...step,
          stepNumber: index + 1,
          a,
          b,
          curve: buildCurvedPath(a.pos, b.pos, step.mode === "FLUVIAL"),
        };
      })
      .filter(Boolean);
  }, [activeOption, byId]);

  const transferNodeIds = useMemo(() => {
    const ids = new Set();
    for (const step of activeSteps) {
      if (step.transferFeeApplied > 0) {
        ids.add(step.fromNodeId);
      }
    }
    return ids;
  }, [activeSteps]);

  const hoveredNode = hoveredId ? byId.get(hoveredId) : null;

  function handleNodeActivate(nodeId, event) {
    if (event?.shiftKey || clickTarget === "ORIGIN") {
      if (nodeId === destId && onSwapNodes) {
        onSwapNodes();
      } else {
        onSelectOrigin?.(nodeId);
      }
      setClickTarget("DEST");
      return;
    }

    if (nodeId === originId && onSwapNodes) {
      onSwapNodes();
      return;
    }
    onSelectDest?.(nodeId);
  }

  const riverStyle =
    riverCondition === "SEQUIA"
      ? {
          water: "#3e86a0",
          bank: "#dfc488",
          width: 15,
          badgeTone: "is-drought",
          badgeText: "Estiaje: bancos de arena activos",
        }
      : riverCondition === "CRECIENTE"
        ? {
            water: "#165882",
            bank: "#9cc2d6",
            width: 28,
            badgeTone: "is-flood",
            badgeText: "Creciente: caudal expandido",
          }
        : {
            water: "#267ba3",
            bank: "#b9d7e3",
            width: 22,
            badgeTone: "is-normal",
            badgeText: "Río Magdalena: caudal óptimo",
          };

  return (
    <div className="corridor-map-card">
      <div className="corridor-map-toolbar">
        <div className="corridor-map-title">
          <h3>Mapa Vivo del Corredor Magdalena Medio</h3>
          <span className={`river-live-pill ${riverStyle.badgeTone}`}>
            <Icon name="wave" size={14} />
            {riverStyle.badgeText}
          </span>
        </div>

        <div className="map-action-controls">
          <div className="map-click-mode" role="group" aria-label="Modo de clic en el mapa">
            <button
              type="button"
              className={`mode-pill ${clickTarget === "ORIGIN" ? "is-active" : ""}`}
              onClick={() => setClickTarget("ORIGIN")}
            >
              <span className="dot-origin" />
              Clic elige Origen
            </button>
            <button
              type="button"
              className={`mode-pill ${clickTarget === "DEST" ? "is-active" : ""}`}
              onClick={() => setClickTarget("DEST")}
            >
              <span className="dot-dest" />
              Clic elige Destino
            </button>
          </div>

          {onSwapNodes && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSwapNodes}
              title="Invertir origen y destino"
            >
              <Icon name="swap" size={15} />
              Invertir
            </button>
          )}
        </div>
      </div>

      <div className="corridor-canvas-wrap">
        <svg
          className="corridor-svg"
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          role="img"
          aria-label="Mapa geoespacial interactivo del corredor multimodal del Magdalena Medio"
        >
          <defs>
            <linearGradient id="valleyGradient" x1="0" y1="0" x2="1" y2="0.9">
              <stop offset="0%" stopColor="#e7efe0" />
              <stop offset="58%" stopColor="#edf2e3" />
              <stop offset="100%" stopColor="#e3e5d2" />
            </linearGradient>

            <linearGradient id="cordilleraShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d7dec7" stopOpacity="0" />
              <stop offset="100%" stopColor="#c7cfb4" stopOpacity="0.55" />
            </linearGradient>

            <pattern
              id="gridSubtle"
              width="52"
              height="52"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 52 0 L 0 0 0 52"
                fill="none"
                stroke="#cad4bc"
                strokeWidth="0.6"
                strokeOpacity="0.45"
              />
            </pattern>

            <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor="#0c2219"
                floodOpacity="0.22"
              />
            </filter>
          </defs>

          <rect
            x="0"
            y="0"
            width={CANVAS.width}
            height={CANVAS.height}
            rx="16"
            fill="url(#valleyGradient)"
          />
          <rect
            x="0"
            y="0"
            width={CANVAS.width}
            height={CANVAS.height}
            rx="16"
            fill="url(#gridSubtle)"
          />

          {/* Relieve oriental (Cordillera Oriental hacia Bucaramanga) */}
          <path
            d="M 675 0 C 705 150, 695 300, 645 560 L 1040 560 L 1040 0 Z"
            fill="url(#cordilleraShade)"
          />
          <path
            d="M 760 45 C 785 190, 770 330, 735 520"
            fill="none"
            stroke="#b9c3a6"
            strokeWidth="1.2"
            strokeDasharray="6 6"
          />
          <path
            d="M 832 60 C 852 200, 842 340, 810 510"
            fill="none"
            stroke="#b2bc9e"
            strokeWidth="1.2"
            strokeDasharray="6 6"
          />

          {/* Ciénagas de Simití y San Silvestre */}
          <ellipse cx="282" cy="118" rx="26" ry="13" fill={riverStyle.bank} opacity="0.7" />
          <ellipse cx="478" cy="368" rx="20" ry="9" fill={riverStyle.bank} opacity="0.6" />

          {/* Cauce principal del Río Magdalena */}
          <path
            d={RIVER_SPINE_PATH}
            fill="none"
            stroke={riverStyle.bank}
            strokeWidth={riverStyle.width + 13}
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d={RIVER_SPINE_PATH}
            fill="none"
            stroke={riverStyle.water}
            strokeWidth={riverStyle.width}
            strokeLinecap="round"
            opacity="0.28"
          />
          <path
            d={RIVER_SPINE_PATH}
            fill="none"
            stroke={riverStyle.water}
            strokeWidth="3"
            strokeDasharray="10 10"
            strokeLinecap="round"
            opacity="0.55"
            className="river-flow-line"
          />

          {riverCondition === "SEQUIA" && (
            <g opacity="0.88">
              <ellipse cx="276" cy="432" rx="15" ry="5" fill="#d9a441" transform="rotate(-26 276 432)" />
              <ellipse cx="400" cy="322" rx="13" ry="4.5" fill="#d9a441" transform="rotate(-78 400 322)" />
              <ellipse cx="404" cy="216" rx="12" ry="4" fill="#d9a441" transform="rotate(-82 404 216)" />
            </g>
          )}

          {/* Regiones departamentales */}
          <text x="120" y="352" className="map-dept-label">ANTIOQUIA</text>
          <text x="148" y="198" className="map-dept-label">SUR DE BOLÍVAR</text>
          <text x="580" y="318" className="map-dept-label">SANTANDER</text>
          <text x="588" y="44" className="map-dept-label">CESAR</text>
          <text x="862" y="386" textAnchor="middle" className="map-altitude-note">
            Cordillera · 959 m s.n.m.
          </text>

          {/* Rosa de los vientos */}
          <g transform="translate(984, 52)">
            <circle r="20" fill="#fffdf6" fillOpacity="0.88" stroke="#cbc3a8" />
            <path d="M 0 -13 L 4.5 4 L 0 1 L -4.5 4 Z" fill="#143528" />
            <text y="14" textAnchor="middle" className="compass-n">N</text>
          </g>

          {/* Corredores secundarios */}
          {uniqueBaseEdges.map((edge) => {
            const isRiver = edge.mode === "FLUVIAL";
            return (
              <path
                key={edge.id}
                d={edge.curve.d}
                fill="none"
                stroke={isRiver ? riverStyle.water : "#7d8c74"}
                strokeOpacity={isRiver ? 0.35 : 0.42}
                strokeWidth={isRiver ? 3.2 : 2}
                strokeDasharray={isRiver ? undefined : "6 6"}
                strokeLinecap="round"
              />
            );
          })}

          {/* Pools abiertos desplazados limpiamente */}
          {pools.map((pool) => {
            const a = byId.get(pool.originNodeId);
            const b = byId.get(pool.destNodeId);
            if (!a || !b) return null;
            const curve = buildCurvedPath(
              a.pos,
              b.pos,
              pool.mode === "FLUVIAL"
            );

            return (
              <g key={pool.id} transform={`translate(${curve.midX}, ${curve.midY - 24})`}>
                <circle r="13" fill="#e0a12c" opacity="0.28" className="pool-pulse" />
                <rect
                  x="-36"
                  y="-11"
                  width="72"
                  height="22"
                  rx="11"
                  fill="#fffdf6"
                  stroke="#e0a12c"
                  strokeWidth="1.8"
                />
                <text y="4" textAnchor="middle" className="map-pool-chip-text">
                  Pool {pool.occupancyPct}%
                </text>
              </g>
            );
          })}

          {/* Ruta activa con flujo animado y pastilla inteligente según longitud del tramo */}
          {activeSteps.map((step) => {
            const isRiver = step.mode === "FLUVIAL";
            const mainStroke = isRiver ? "#0e6ba0" : "#143528";
            const showFullPill = step.curve.pixelDist >= 120;

            return (
              <g key={`active-${step.segmentId}-${step.stepNumber}`}>
                <path
                  d={step.curve.d}
                  fill="none"
                  stroke="#fffdf6"
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.78"
                />
                <path
                  d={step.curve.d}
                  fill="none"
                  stroke={mainStroke}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d={step.curve.d}
                  fill="none"
                  stroke={isRiver ? "#bae6fd" : "#eab444"}
                  strokeWidth="2.4"
                  strokeDasharray="7 10"
                  strokeLinecap="round"
                  className="route-animated-dash"
                />

                {showFullPill ? (
                  <g transform={`translate(${step.curve.midX}, ${step.curve.midY})`}>
                    <rect
                      x="-33"
                      y="-10"
                      width="66"
                      height="20"
                      rx="10"
                      fill={mainStroke}
                    />
                    <text y="3.5" textAnchor="middle" className="step-pill-label">
                      {isRiver ? "Río" : "Vía"} · {step.distanceKm} km
                    </text>
                  </g>
                ) : (
                  <g transform={`translate(${step.curve.midX}, ${step.curve.midY})`}>
                    <circle r="9.5" fill={mainStroke} stroke="#fffdf6" strokeWidth="1.6" />
                    <text y="3.5" textAnchor="middle" className="step-pill-label">
                      {step.stepNumber}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodos interactivos */}
          {positionedNodes.map((node) => {
            const isOrigin = node.id === originId;
            const isDest = node.id === destId;
            const isTransfer = transferNodeIds.has(node.id);
            const isHovered = hoveredId === node.id;

            const dotRadius = isOrigin || isDest ? 10.5 : isTransfer ? 9.5 : 7.5;
            const fill = isOrigin
              ? "#143528"
              : isDest
                ? "#a8362b"
                : isTransfer
                  ? "#e0a12c"
                  : node.type === "FLUVIAL_PORT"
                    ? "#1d7098"
                    : node.type === "MIXED_PORT"
                      ? "#24543f"
                      : "#6b4a2f";

            const roleSuffix = isOrigin
              ? " · ORIGEN"
              : isDest
                ? " · DESTINO"
                : isTransfer
                  ? " · TRANSBORDO"
                  : "";

            return (
              <g
                key={node.id}
                className="map-node"
                transform={`translate(${node.pos.x}, ${node.pos.y})`}
                onClick={(e) => handleNodeActivate(node.id, e)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                role="button"
                tabIndex={0}
                aria-label={`${node.name} (${NODE_TYPE_LABELS[node.type]}). Clic para seleccionar.`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNodeActivate(node.id, e);
                  }
                }}
              >
                {isTransfer && (
                  <circle r="19" fill="#e0a12c" opacity="0.35" className="pool-pulse" />
                )}
                {(isOrigin || isDest || isHovered) && (
                  <circle
                    r="16"
                    fill="none"
                    stroke={isOrigin ? "#143528" : isDest ? "#a8362b" : "#5f8a3e"}
                    strokeWidth="2.4"
                  />
                )}

                <circle
                  r={dotRadius}
                  fill={fill}
                  stroke="#fffdf6"
                  strokeWidth="2.6"
                  filter="url(#softGlow)"
                />

                {(isOrigin || isDest || isTransfer) && (
                  <text
                    y="3.5"
                    textAnchor="middle"
                    className="node-inner-letter"
                    fill={isTransfer ? "#0c2219" : "#fffdf6"}
                  >
                    {isOrigin ? "O" : isDest ? "D" : "T"}
                  </text>
                )}

                <text
                  x={node.pos.dx}
                  y={node.pos.dy}
                  textAnchor={node.pos.anchor}
                  className={`map-node-label ${
                    isOrigin
                      ? "is-origin-label"
                      : isDest
                        ? "is-dest-label"
                        : isTransfer
                          ? "is-transfer-label"
                          : ""
                  }`}
                >
                  {node.name}
                  {roleSuffix}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredNode && (
          <div className="map-hover-card" aria-live="polite">
            <strong>{hoveredNode.name}</strong>
            <span>
              {NODE_TYPE_LABELS[hoveredNode.type] || hoveredNode.type} ·{" "}
              {hoveredNode.department}
            </span>
            <small>
              Clic para fijar como{" "}
              {clickTarget === "ORIGIN" ? "Origen" : "Destino"}
            </small>
          </div>
        )}
      </div>

      {/* Cadena de itinerario paso a paso cuando hay ruta activa */}
      {activeSteps.length > 0 && (
        <div className="itinerary-chain" aria-label="Itinerario paso a paso">
          {activeSteps.map((step, idx) => (
            <span key={`chain-${step.segmentId}-${idx}`} className="itinerary-leg">
              {idx === 0 && <strong>{step.fromNodeName}</strong>}
              <span className={`itinerary-arrow is-${step.mode.toLowerCase()}`}>
                → {step.mode === "FLUVIAL" ? "Río" : "Vía"} ({step.distanceKm} km) →
              </span>
              <strong>
                {step.toNodeName}
                {transferNodeIds.has(step.toNodeId) ? " [Transbordo]" : ""}
              </strong>
            </span>
          ))}
        </div>
      )}

      <div className="corridor-map-footer">
        <div className="map-legend">
          <span className="legend-item">
            <i className="legend-line is-river" /> Fluvial (Río Magdalena)
          </span>
          <span className="legend-item">
            <i className="legend-line is-road" /> Terrestre (Vía nacional)
          </span>
          <span className="legend-item">
            <i className="legend-dot is-transfer" /> Puerto de transbordo
          </span>
          <span className="legend-item">
            <i className="legend-dot is-pool" /> Pool consolidado abierto
          </span>
        </div>

        {activeOption && (
          <div className="active-corridor-strip">
            <span className="strip-mode">
              <Icon
                name={
                  activeOption.mode === "FLUVIAL"
                    ? "boat"
                    : activeOption.mode === "HIBRIDO"
                      ? "anchor"
                      : "truck"
                }
                size={16}
              />
              Ruta activa: <strong>{TRANSPORT_LABELS[activeOption.mode]}</strong>
            </span>
            <span className="strip-summary">
              {formatCOP(activeOption.totalCost)} · {activeOption.estimatedHours} h ·{" "}
              {formatQty(activeOption.totalDistanceKm)} km
              {activeOption.co2SavedPct > 0
                ? ` · -${activeOption.co2SavedPct}% CO₂`
                : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
