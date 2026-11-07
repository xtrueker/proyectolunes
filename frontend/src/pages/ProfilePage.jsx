import { useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field";
import { Alert } from "../components/Feedback";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import usePageTitle from "../hooks/usePageTitle";
import { ROLE_LABELS } from "../utils/constants";

// Solo se editan los campos que admite PUT /auth/me: nombre, ubicación y teléfono.
export default function ProfilePage() {
  usePageTitle("Mi perfil");

  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user.name || "",
    location: user.location || "",
    phone: user.phone || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const dirty =
    form.name.trim() !== (user.name || "") ||
    form.location.trim() !== (user.location || "") ||
    form.phone.trim() !== (user.phone || "");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrors({ name: "El nombre no puede quedar vacío." });
      return;
    }

    setErrors({});
    setSaving(true);
    setFormError("");

    try {
      await updateProfile({
        name: form.name.trim(),
        location: form.location.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Perfil actualizado.");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  const isProducer = user.role === "PRODUCER";

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Mi perfil</h1>
        <p>Mantén tus datos de contacto al día.</p>
      </header>

      <div className="form-layout">
        <form className="form-card stack" onSubmit={handleSubmit} noValidate>
          <Field
            label="Nombre"
            id="name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            required
          />

          <div className="form-grid">
            <Field
              label="Ubicación"
              id="location"
              autoComplete="address-level2"
              placeholder="Ej. Barrancabermeja, Santander"
              value={form.location}
              onChange={handleChange}
            />
            <Field
              label="Teléfono"
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="button-row">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving || !dirty}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>

        <aside className="form-preview" aria-label="Datos de la cuenta">
          <p className="preview-title">Datos de la cuenta</p>
          <dl className="account-facts">
            <div>
              <dt>Correo</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Tipo de cuenta</dt>
              <dd>
                <span className="role-pill">{ROLE_LABELS[user.role]}</span>
              </dd>
            </div>
          </dl>
          <p className="footnote">
            El correo y el tipo de cuenta no se pueden cambiar desde aquí.
          </p>
          <Link
            to={isProducer ? "/panel" : "/mis-solicitudes"}
            className="btn btn-secondary btn-block"
          >
            {isProducer ? "Ir a mi panel" : "Ver mis solicitudes"}
          </Link>
        </aside>
      </div>
    </div>
  );
}
