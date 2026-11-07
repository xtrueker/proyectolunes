import Icon from "./Icon";

export function Spinner({ label = "Cargando…" }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function PageLoader({ label = "Cargando…" }) {
  return (
    <div className="page-loader">
      <Spinner label={label} />
    </div>
  );
}

export function EmptyState({ icon = "leaf", title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state is-error" role="alert">
      <span className="empty-icon">
        <Icon name="alert" size={28} />
      </span>
      <h3>No pudimos cargar la información</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

const ALERT_ICONS = {
  info: "info",
  error: "alert",
  success: "check",
  warning: "alert",
};

export function Alert({ tone = "info", children }) {
  return (
    <div
      className={`alert alert-${tone}`}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon name={ALERT_ICONS[tone]} size={20} />
      <div>{children}</div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: count }, (_, i) => (
        <div className="product-card skeleton-card" key={i}>
          <div className="skeleton skeleton-art" />
          <div className="product-card-body">
            <div className="skeleton skeleton-line short" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton skeleton-block" key={i} />
      ))}
    </div>
  );
}
