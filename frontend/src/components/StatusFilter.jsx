import { STATUS_META, STATUS_ORDER } from "../utils/constants";

const PLURAL = {
  PENDING: "Pendientes",
  ACCEPTED: "Aceptadas",
  COMPLETED: "Completadas",
  REJECTED: "Rechazadas",
  CANCELLED: "Canceladas",
};

// Filtros por estado con conteo real de las solicitudes cargadas.
export default function StatusFilter({ requests, value, onChange }) {
  const options = [
    { key: "ALL", label: "Todas", count: requests.length },
    ...STATUS_ORDER.map((status) => ({
      key: status,
      label: PLURAL[status],
      tone: STATUS_META[status].tone,
      count: requests.filter((request) => request.status === status).length,
    })),
  ];

  return (
    <div className="filter-tabs" role="group" aria-label="Filtrar por estado">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={`filter-tab ${option.tone ? `tone-${option.tone}` : ""}`}
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
          <span className="filter-count">{option.count}</span>
        </button>
      ))}
    </div>
  );
}
