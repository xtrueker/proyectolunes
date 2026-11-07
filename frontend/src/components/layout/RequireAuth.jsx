import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { PageLoader } from "../Feedback";
import Icon from "../Icon";
import { useAuth } from "../../context/useAuth";
import { ROLE_LABELS } from "../../utils/constants";

function Forbidden({ roles, userRole }) {
  const allowed = roles.map((role) => ROLE_LABELS[role].toLowerCase()).join(" o ");
  const home = userRole === "PRODUCER" ? "/panel" : "/mis-solicitudes";

  return (
    <div className="container narrow-page">
      <div className="empty-state is-error" role="alert">
        <span className="empty-icon">
          <Icon name="ban" size={28} />
        </span>
        <h1>Esta sección no está disponible para tu cuenta</h1>
        <p>
          Solo las cuentas de tipo {allowed} pueden entrar aquí. Tu cuenta es de
          tipo {ROLE_LABELS[userRole].toLowerCase()}.
        </p>
        <Link to={home} className="btn btn-primary">
          Ir a mi espacio
        </Link>
      </div>
    </div>
  );
}

// Protege rutas: exige sesión y, opcionalmente, uno de los roles indicados.
export default function RequireAuth({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Verificando sesión…" />;

  if (!user) {
    return (
      <Navigate
        to="/ingresar"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Forbidden roles={roles} userRole={user.role} />;
  }

  return <Outlet />;
}
