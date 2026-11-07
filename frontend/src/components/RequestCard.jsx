import { Link } from "react-router-dom";
import Icon from "./Icon";
import RequestStepper from "./RequestStepper";
import StatusBadge from "./StatusBadge";
import { STATUS_META, TRANSPORT_LABELS } from "../utils/constants";
import { formatCOP, formatDate, formatQty, shortId } from "../utils/format";

// Tarjeta de solicitud compartida por el panel del comprador y del productor.
// `party` muestra la contraparte (el comprador, en la vista del productor).
export default function RequestCard({ request, party, children }) {
  const total = Number(request.quantity) * Number(request.unitPriceAtRequest);
  const transport = request.transportType;

  return (
    <article className={`request-card tone-${STATUS_META[request.status]?.tone}`}>
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
          <span>Valor de referencia</span>
          <strong>{formatCOP(total)}</strong>
        </div>
      </div>

      <dl className="request-facts">
        <div>
          <dt>Transporte</dt>
          <dd>
            <Icon name={transport === "FLUVIAL" ? "boat" : "truck"} size={16} />
            {TRANSPORT_LABELS[transport] || transport || "No indicado"}
          </dd>
        </div>
        <div>
          <dt>Origen</dt>
          <dd>{request.origin || "No indicado"}</dd>
        </div>
        <div>
          <dt>Destino</dt>
          <dd>{request.destination || "No indicado"}</dd>
        </div>
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

      {request.notes && (
        <p className="request-notes">
          <strong>Observaciones:</strong> {request.notes}
        </p>
      )}

      <RequestStepper status={request.status} />

      {children && <div className="request-actions">{children}</div>}
    </article>
  );
}
