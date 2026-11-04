import { Link } from "react-router-dom";
import { EmptyState } from "../components/Feedback";
import usePageTitle from "../hooks/usePageTitle";

export default function NotFoundPage() {
  usePageTitle("Página no encontrada");

  return (
    <div className="container narrow-page">
      <EmptyState
        icon="search"
        title="No encontramos esta página"
        action={
          <Link to="/catalogo" className="btn btn-primary">
            Ir al catálogo
          </Link>
        }
      >
        La dirección no existe o fue movida. Revisa el enlace o vuelve al
        catálogo.
      </EmptyState>
    </div>
  );
}
