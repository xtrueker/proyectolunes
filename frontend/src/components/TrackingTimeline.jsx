import Icon from "./Icon";
import { TRACKING_STAGE_MAP } from "../utils/constants";
import { formatDate } from "../utils/format";

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDate(iso);

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function TrackingTimeline({ events = [] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="tracking-box">
      <h4 className="tracking-title">
        <Icon name="route" size={17} />
        Trazabilidad del despacho ({events.length}{" "}
        {events.length === 1 ? "hito" : "hitos"})
      </h4>

      <ol className="tracking-list">
        {events.map((event) => {
          const meta = TRACKING_STAGE_MAP[event.stage] || {
            label: event.stage,
            icon: "pin",
          };

          return (
            <li key={event.id} className="tracking-item">
              <span className="tracking-icon" aria-hidden="true">
                <Icon name={meta.icon} size={15} />
              </span>

              <div className="tracking-content">
                <div className="tracking-header">
                  <strong>{meta.label}</strong>
                  <time dateTime={event.createdAt}>
                    {formatDateTime(event.createdAt)}
                  </time>
                </div>

                {event.notes && <p>{event.notes}</p>}

                {event.evidenceImageUrl && (
                  <div className="tracking-evidence">
                    <img
                      src={event.evidenceImageUrl}
                      alt={`Evidencia en ${meta.label}`}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

