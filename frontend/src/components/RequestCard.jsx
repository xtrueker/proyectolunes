import { Link } from "react-router-dom";
import Icon from "./Icon";
import RequestStepper from "./RequestStepper";
import StatusBadge from "./StatusBadge";
import TrackingTimeline from "./TrackingTimeline";
import {
  ESCROW_STATUS_META,
  POOL_STATUS_LABELS,
  STATUS_META,
  TRANSPORT_LABELS,
} from "../utils/constants";
import { formatCOP, formatDate, formatQty, shortId } from "../utils/format";

// Tarjeta de solicitud compartida por comprador y productor (Fase 1 + Fase 2).
export default function RequestCard({ request, party, children }) {
  const effectiveUnitPrice =
    request.status === "COUNTER_OFFERED" && request.counterPrice
      ? Number(request.counterPrice)
      : Number(request.unitPriceAtRequest);

  const total = Number(request.quantity) * effectiveUnitPrice;
  const transport = request.transportType;

  return (
    <article className={`request-card tone-${STATUS_META[request.status]?.tone || "pending"}`}>
      <header className="request-card-head">
        <div>
          <p className="request-id">Solicitud {shortId(request.id)}</p>
          <p className="request-date">
            Enviada el {formatDate(request.createdAt)}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </header>

      <div className="request-card-main">
        <div>
          <h3>
            <Link to={`/productos/${request.product.id}`}>
              {request.product.name}
            </Link>
          </h3>
          <p className="request-line">
            {formatQty(request.quantity)} {request.product.unit} a{" "}
            {formatCOP(request.unitPriceAtRequest)} por {request.product.unit}
          </p>
        </div>

        <div className="request-total">
          <span>
            {request.status === "COUNTER_OFFERED"
              ? "Total contraofertado"
              : "Valor de referencia"}
          </span>
          <strong>{formatCOP(total)}</strong>
        </div>
      </div>

      {(request.status === "COUNTER_OFFERED" ||
        request.counterPrice ||
        request.counterDate ||
        request.negotiationNotes) && (
        <div className="counteroffer-callout">
          <div className="counteroffer-head">
            <Icon name="swap" size={18} />
            <strong>
              {request.status === "COUNTER_OFFERED"
                ? "Contraoferta del productor pendiente de respuesta"
                : "Condiciones negociadas"}
            </strong>
          </div>
          <div className="counteroffer-grid">
            {request.counterPrice && (
              <span>
                Nuevo precio unitario:{" "}
                <strong>
                  {formatCOP(request.counterPrice)} / {request.product.unit}
                </strong>
              </span>
            )}
            {request.counterDate && (
              <span>
                Despacho propuesto:{" "}
                <strong>{formatDate(request.counterDate)}</strong>
              </span>
            )}
          </div>
          {request.negotiationNotes && (
            <p className="counteroffer-notes">“{request.negotiationNotes}”</p>
          )}
        </div>
      )}

      <dl className="request-facts">
        <div>
          <dt>Transporte</dt>
          <dd>
            <Icon
              name={
                transport === "FLUVIAL"
                  ? "boat"
                  : transport === "HIBRIDO"
                    ? "anchor"
                    : "truck"
              }
              size={16}
            />
            {TRANSPORT_LABELS[transport] || transport || "No indicado"}
          </dd>
        </div>
        <div>
          <dt>Origen</dt>
          <dd>{request.originNode?.name || request.origin || "No indicado"}</dd>
        </div>
        <div>
          <dt>Destino</dt>
          <dd>{request.destNode?.name || request.destination || "No indicado"}</dd>
        </div>
        {(request.allocatedFreightCost || request.freightCostEstimated) && (
          <div>
            <dt>
              {request.allocatedFreightCost ? "Flete prorrateado" : "Flete estimado"}
            </dt>
            <dd>
              {formatCOP(
                request.allocatedFreightCost ?? request.freightCostEstimated
              )}
            </dd>
          </div>
        )}
        {party && (
          <div>
            <dt>{party.label}</dt>
            <dd>
              {party.name}
              {party.email && (
                <a className="inline-link" href={`mailto:${party.email}`}>
                  {party.email}
                </a>
              )}
            </dd>
          </div>
        )}
      </dl>

      {request.pool && (
        <div className="pool-pill-bar">
          <Icon name="users" size={17} />
          <div>
            <strong>
              Pool Consolidado {shortId(request.pool.id)} ·{" "}
              {request.pool.originNode?.name || "Origen"} →{" "}
              {request.pool.destNode?.name || "Destino"}
            </strong>
            <span>
              {" "}
              ({POOL_STATUS_LABELS[request.pool.status] || request.pool.status} ·{" "}
              {formatQty(request.pool.currentWeightKg)} /{" "}
              {formatQty(request.pool.maxCapacityKg)} kg · Salida{" "}
              {formatDate(request.pool.departureDate)})
            </span>
          </div>
        </div>
      )}

      {request.escrowStatus && ESCROW_STATUS_META[request.escrowStatus] && (
        <div className="escrow-box">
          <div className="escrow-head">
            <span className="escrow-title">
              <Icon name="shield" size={17} />
              Pago Protegido Escrow:{" "}
              {ESCROW_STATUS_META[request.escrowStatus].label}
            </span>
            <strong>
              Desembolsado: {formatCOP(request.escrowReleasedAmount || 0)} de{" "}
              {formatCOP(request.escrowTotalAmount || 0)}
            </strong>
          </div>
          <div className="pool-meter">
            <div
              className="pool-meter-fill is-escrow"
              style={{
                width: `${ESCROW_STATUS_META[request.escrowStatus].pct}%`,
              }}
            />
          </div>
          <small>{ESCROW_STATUS_META[request.escrowStatus].hint}</small>
        </div>
      )}

      {request.notes && (
        <p className="request-notes">
          <strong>Observaciones:</strong> {request.notes}
        </p>
      )}

      <RequestStepper status={request.status} />

      <TrackingTimeline events={request.trackingEvents} />

      {children && <div className="request-actions">{children}</div>}
    </article>
  );
}
