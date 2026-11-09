import Icon from "./Icon";
import { STATUS_META } from "../utils/constants";

export default function RequestStepper({ status }) {
  const meta = STATUS_META[status];

  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <p className={`stepper-end stepper-end-${meta?.tone || "cancelled"}`}>
        <Icon name={meta?.icon || "info"} size={18} />
        {meta?.hint || status}
      </p>
    );
  }

  const flow =
    status === "COUNTER_OFFERED"
      ? ["PENDING", "COUNTER_OFFERED", "ACCEPTED", "COMPLETED"]
      : ["PENDING", "ACCEPTED", "COMPLETED"];

  const labels = {
    PENDING: "Solicitud enviada",
    COUNTER_OFFERED: "Contraoferta activa",
    ACCEPTED: "Acuerdo confirmado",
    COMPLETED: "Entrega completada",
  };

  const current = flow.indexOf(status);

  return (
    <ol className="stepper" aria-label="Progreso de la solicitud">
      {flow.map((step, index) => {
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
            <span>{labels[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
