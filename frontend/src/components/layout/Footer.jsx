import { Link } from "react-router-dom";
import Logo from "../Logo";
import { useAuth } from "../../context/useAuth";

export default function Footer() {
  const { user } = useAuth();
  const isProducer = user?.role === "PRODUCER";

  return (
    <footer className="site-footer on-dark">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo tone="light" />
          <p>
            Plataforma de comercialización agrícola que conecta a productores y
            compradores del Magdalena Medio.
          </p>
        </div>

        <nav className="footer-col" aria-label="Explorar">
          <h2>Explorar</h2>
          <Link to="/">Inicio</Link>
          <Link to="/catalogo">Catálogo de productos</Link>
          <Link to="/logistica">Red logística y pools</Link>
        </nav>

        <nav className="footer-col" aria-label="Tu cuenta">
          <h2>Tu cuenta</h2>
          {user ? (
            <>
              <Link to="/perfil">Mi perfil</Link>
              <Link to={isProducer ? "/panel" : "/mis-solicitudes"}>
                {isProducer ? "Mi panel" : "Mis solicitudes"}
              </Link>
            </>
          ) : (
            <>
              <Link to="/ingresar">Iniciar sesión</Link>
              <Link to="/registro">Crear cuenta</Link>
              <Link to="/registro?rol=PRODUCER">Vender mis productos</Link>
            </>
          )}
        </nav>
      </div>

      <div className="container footer-legal">
        <p>© {new Date().getFullYear()} Agro-Red Magdalena</p>
      </div>
    </footer>
  );
}
