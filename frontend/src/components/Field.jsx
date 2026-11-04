// Campo de formulario accesible: etiqueta, ayuda y error enlazados al control.
export default function Field({
  label,
  id,
  hint,
  error,
  as = "input",
  className = "",
  children,
  ...props
}) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined;

  const controlProps = {
    id,
    name: props.name || id,
    className: "control",
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy,
    ...props,
  };

  let control;

  if (as === "select") {
    control = <select {...controlProps}>{children}</select>;
  } else if (as === "textarea") {
    control = <textarea {...controlProps} />;
  } else {
    control = <input {...controlProps} />;
  }

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id}>
        {label}
        {props.required && (
          <span className="req" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
