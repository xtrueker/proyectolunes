import { useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import Field from "../components/Field";
import { Alert } from "../components/Feedback";
import HeroArt from "../components/HeroArt";
import Icon from "../components/Icon";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import usePageTitle from "../hooks/usePageTitle";

const ROLE_OPTIONS = [
  {
    value: "BUYER",
    icon: "list",
    title: "Comprador",
    text: "Explora el catálogo y envía solicitudes de compra.",
  },
  {
    value: "PRODUCER",
    icon: "store",
    title: "Productor",
    text: "Publica productos y responde las solicitudes que recibes.",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  usePageTitle(isRegister ? "Crear cuenta" : "Iniciar sesión");

  const { user, login, register } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [params] = useSearchParams();

  const [form, setForm] = useState({
    role: params.get("rol") === "PRODUCER" ? "PRODUCER" : "BUYER",
    name: "",
    email: "",
    password: "",
    confirm: "",
    location: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión (o se acaba de iniciar), se redirige según el rol.
  if (user) {
    const from = location.state?.from;
    const safeFrom =
      from && !from.startsWith("/ingresar") && !from.startsWith("/registro")
        ? from
        : null;

    return (
      <Navigate
        to={safeFrom || (user.role === "PRODUCER" ? "/panel" : "/catalogo")}
        replace
      />
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    const found = {};

    if (isRegister && !form.name.trim()) found.name = "Escribe tu nombre.";
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      found.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    }
    if (!form.password) {
      found.password = "Escribe tu contraseña.";
    } else if (isRegister && form.password.length < 8) {
      found.password = "La contraseña debe tener al menos 8 caracteres.";
    }
    if (isRegister && form.confirm !== form.password) {
      found.confirm = "Las contraseñas no coinciden.";
    }

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
      if (isRegister) {
        const created = await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          location: form.location.trim(),
          phone: form.phone.trim(),
        });
        toast.success(`Cuenta creada. Te damos la bienvenida, ${created.name}.`);
      } else {
        const logged = await login(form.email, form.password);
        toast.success(`Hola de nuevo, ${logged.name}.`);
      }
    } catch (error) {
      setFormError(error.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-aside on-dark">
        <div className="auth-aside-copy">
          <h2>
            {isRegister
              ? "Únete a la red de comercio del campo regional"
              : "Qué bueno verte de nuevo"}
          </h2>
          <p>
            {isRegister
              ? "Compradores y productores del Magdalena Medio en un mismo lugar."
              : "Entra para seguir tus solicitudes o administrar tus productos."}
          </p>
        </div>
        <div className="auth-aside-art">
          <HeroArt />
        </div>
      </aside>

      <section className="auth-panel">
        <h1>{isRegister ? "Crea tu cuenta" : "Inicia sesión"}</h1>
        <p className="form-lead">
          {isRegister
            ? "Elige cómo vas a usar Agro-Red Magdalena."
            : "Usa el correo y la contraseña de tu cuenta."}
        </p>

        <form className="stack" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <fieldset className="choice-group">
              <legend>Tipo de cuenta</legend>
              <div className="choice-row">
                {ROLE_OPTIONS.map((option) => (
                  <label className="choice choice-tall" key={option.value}>
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={form.role === option.value}
                      onChange={handleChange}
                    />
                    <Icon name={option.icon} size={24} />
                    <strong>{option.title}</strong>
                    <small>{option.text}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {isRegister && (
            <Field
              label="Nombre completo"
              id="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
          )}

          <Field
            label="Correo electrónico"
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
          />

          <Field
            label="Contraseña"
            id="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            hint={isRegister ? "Mínimo 8 caracteres." : undefined}
            required
          />

          {isRegister && (
            <>
              <Field
                label="Confirmar contraseña"
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={handleChange}
                error={errors.confirm}
                required
              />

              <div className="form-grid">
                <Field
                  label="Ubicación (opcional)"
                  id="location"
                  autoComplete="address-level2"
                  placeholder="Ej. Barrancabermeja, Santander"
                  value={form.location}
                  onChange={handleChange}
                />
                <Field
                  label="Teléfono (opcional)"
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {formError && <Alert tone="error">{formError}</Alert>}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={submitting}
          >
            {submitting
              ? "Procesando…"
              : isRegister
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <Link to={isRegister ? "/ingresar" : "/registro"} state={location.state}>
            {isRegister ? "Inicia sesión" : "Crea una cuenta"}
          </Link>
        </p>
      </section>
    </div>
  );
}
