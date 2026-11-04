import { useState } from "react";
import { Link } from "react-router-dom";
import Field from "./Field";
import Icon from "./Icon";
import { Alert } from "./Feedback";
import { useToast } from "../context/useToast";
import { requestsApi } from "../services/agroApi";
import { TRANSPORT_LABELS } from "../utils/constants";
import { formatCOP, formatQty, shortId } from "../utils/format";

// Formulario de solicitud de compra (solo cuentas BUYER).
// No toca el inventario: el backend lo descuenta cuando el productor acepta.
export default function PurchaseForm({ product, user }) {
  const toast = useToast();

  const [form, setForm] = useState(() => ({
    quantity: "1",
    origin: product.location || product.producer?.location || "",
    destination: user.location || "",
    transportType: "TERRESTRE",
    notes: "",
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const soldOut = Number(product.quantity) <= 0;
  const total = (Number(form.quantity) || 0) * Number(product.price);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    const found = {};
    const quantity = Number(form.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      found.quantity = "Ingresa una cantidad mayor que cero.";
    } else if (quantity > Number(product.quantity)) {
      found.quantity = `Solo hay ${formatQty(product.quantity)} ${product.unit} disponibles.`;
    }

    if (!form.origin.trim()) found.origin = "Indica el lugar de origen.";
    if (!form.destination.trim()) found.destination = "Indica el destino de entrega.";

    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError("");

    try {
      const result = await requestsApi.create({
        productId: product.id,
        quantity: Number(form.quantity),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        transportType: form.transportType,
        notes: form.notes.trim(),
      });

      setCreated(result.data);
      toast.success("Solicitud enviada al productor.");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="purchase-success">
        <span className="success-mark">
          <Icon name="check" size={28} />
        </span>
        <h2>Solicitud enviada</h2>
        <p>
          El productor la revisará y podrás seguir su estado en tu panel. El
          inventario solo cambia si el productor la acepta.
        </p>

        <dl className="success-facts">
          <div>
            <dt>Solicitud</dt>
            <dd>{shortId(created.id)}</dd>
          </div>
          <div>
            <dt>Cantidad</dt>
            <dd>
              {formatQty(created.quantity)} {created.product.unit}
            </dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>Pendiente</dd>
          </div>
        </dl>

        <div className="button-row">
          <Link to="/mis-solicitudes" className="btn btn-primary">
            Ver mis solicitudes
          </Link>
          <Link to="/catalogo" className="btn btn-secondary">
            Seguir explorando
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="purchase-form" onSubmit={handleSubmit} noValidate>
      <h2>Solicitar este producto</h2>
      <p className="form-lead">
        Envía tu solicitud al productor. Él confirma el precio final y la
        entrega.
      </p>

      {soldOut && (
        <Alert tone="warning">
          Este producto está agotado y no admite nuevas solicitudes.
        </Alert>
      )}

      <Field
        label={`Cantidad (${product.unit})`}
        id="quantity"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        max={product.quantity}
        value={form.quantity}
        onChange={handleChange}
        error={errors.quantity}
        hint={`Disponibles: ${formatQty(product.quantity)} ${product.unit}`}
        disabled={soldOut}
        required
      />

      <fieldset className="choice-group">
        <legend>Tipo de transporte</legend>
        <div className="choice-row">
          {Object.entries(TRANSPORT_LABELS).map(([value, label]) => (
            <label className="choice" key={value}>
              <input
                type="radio"
                name="transportType"
                value={value}
                checked={form.transportType === value}
                onChange={handleChange}
                disabled={soldOut}
              />
              <Icon name={value === "FLUVIAL" ? "boat" : "truck"} size={22} />
              <strong>{label}</strong>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Origen del producto"
        id="origin"
        value={form.origin}
        onChange={handleChange}
        error={errors.origin}
        autoComplete="off"
        disabled={soldOut}
        required
      />

      <Field
        label="Destino de entrega"
        id="destination"
        placeholder="Ej. Bucaramanga, Santander"
        value={form.destination}
        onChange={handleChange}
        error={errors.destination}
        autoComplete="off"
        disabled={soldOut}
        required
      />

      <Field
        label="Observaciones"
        id="notes"
        as="textarea"
        rows="3"
        placeholder="Indicaciones para el productor (opcional)"
        value={form.notes}
        onChange={handleChange}
        disabled={soldOut}
      />

      <div className="estimate">
        <span>Valor de referencia</span>
        <strong>{formatCOP(total)}</strong>
        <small>El precio definitivo lo confirma el productor.</small>
      </div>

      {formError && <Alert tone="error">{formError}</Alert>}

      <button
        type="submit"
        className="btn btn-primary btn-block btn-lg"
        disabled={submitting || soldOut}
      >
        {submitting ? "Enviando solicitud…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
