import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Icon from "../Icon";
import Logo from "../Logo";
import { useAuth } from "../../context/useAuth";
import { useToast } from "../../context/useToast";
import { ROLE_LABELS } from "../../utils/constants";

const navClass = ({ isActive }) => (isActive ? "nav-link is-active" : "nav-link");

export default function Header() {
  const { user, loading, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  // Cerrar el menú de cuenta con clic fuera o con Escape.
  useEffect(() => {
    if (!userOpen) return undefined;

    function handlePointer(event) {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") setUserOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [userOpen]);

  const isProducer = user?.role === "PRODUCER";
  const dashboardPath = isProducer ? "/panel" : "/mis-solicitudes";
  const dashboardLabel = isProducer ? "Mi panel" : "Mis solicitudes";

  function handleLogout() {
    logout();
    setUserOpen(false);
    setMenuOpen(false);
    navigate("/");
    toast.info("Cerraste sesión.");
  }

  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") setMenuOpen(false);
      }}
    >
      <div className="container header-inner">
        <Link to="/" className="header-logo" aria-label="Agro-Red Magdalena, inicio">
          <Logo />
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? "close" : "menu"} size={24} />
          <span className="sr-only">
            {menuOpen ? "Cerrar menú" : "Abrir menú"}
          </span>
        </button>

        <div
          id="menu-principal"
          className={`header-menu ${menuOpen ? "is-open" : ""}`}
          onClick={(event) => {
            if (event.target.closest("a")) setMenuOpen(false);
          }}
        >
          <nav className="main-nav" aria-label="Principal">
            <NavLink to="/" end className={navClass}>
              Inicio
            </NavLink>
            <NavLink to="/catalogo" className={navClass}>
              Catálogo
            </NavLink>
            <NavLink to="/logistica" className={navClass}>
              Logística y Pools
            </NavLink>
            {user && (
              <NavLink to={dashboardPath} className={navClass}>
                {dashboardLabel}
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            {loading ? null : user ? (
              <div className="user-menu" ref={userRef}>
                <button
                  type="button"
                  className="user-trigger"
                  aria-expanded={userOpen}
                  aria-controls="menu-cuenta"
                  onClick={() => setUserOpen((open) => !open)}
                >
                  <span className="avatar" aria-hidden="true">
                    {user.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="user-trigger-name">{user.name}</span>
                  <Icon name="chevron" size={16} />
                </button>

                {userOpen && (
                  <div id="menu-cuenta" className="user-dropdown">
                    <div className="user-dropdown-info">
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                      <span className="role-pill">{ROLE_LABELS[user.role]}</span>
                    </div>

                    <Link to="/perfil" onClick={() => setUserOpen(false)}>
                      <Icon name="user" size={18} />
                      Mi perfil
                    </Link>
                    <Link to={dashboardPath} onClick={() => setUserOpen(false)}>
                      <Icon name={isProducer ? "store" : "list"} size={18} />
                      {dashboardLabel}
                    </Link>
                    <button type="button" className="is-danger" onClick={handleLogout}>
                      <Icon name="logout" size={18} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/ingresar" className="btn btn-ghost">
                  Ingresar
                </Link>
                <Link to="/registro" className="btn btn-primary">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
