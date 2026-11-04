import { useEffect, useId, useRef } from "react";

// Diálogo modal nativo (<dialog>): atrapa el foco, cierra con Escape
// y se confirma también con Enter cuando contiene un campo.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Volver",
  tone = "primary",
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!busy && !confirmDisabled) onConfirm();
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <form className="dialog-body" onSubmit={handleSubmit}>
        <h2 id={titleId}>{title}</h2>
        <div className="dialog-content">{children}</div>

        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
            disabled={busy || confirmDisabled}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
