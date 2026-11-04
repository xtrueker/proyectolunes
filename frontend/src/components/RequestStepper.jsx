import Icon from "./Icon";
import { STATUS_META } from "../utils/constants";

const FLOW = ["PENDING", "ACCEPTED", "COMPLETED"];
const LABELS = {
  PENDING: "Solicitud enviada",
  ACCEPTED: "Aceptada por el productor",
  COMPLETED: "Entrega completada",
};

export default function RequestStepper({ status }) {
  const meta = STATUS_META[status];

  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <p className={`stepper-end stepper-end-${meta.tone}`}>
        <Icon name={meta.icon} size={18} />
        {meta.hint}
      </p>
    );
  }

  const current = FLOW.indexOf(status);

  return (
    <ol className="stepper" aria-label="Progreso de la solicitud">
      {FLOW.map((step, index) => {
        const done = index < current || status === "COMPLETED";
        const state = done ? "is-done" : index === current ? "is-current" : "";

        return (
          <li
            key={step}
            className={state}
            aria-current={index === current ? "step" : undefined}
          >
            <span className="stepper-dot">
              {done && <Icon name="check" size={12} />}
            </span>
            <span>{LABELS[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
