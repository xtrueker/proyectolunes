import { useMemo } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Icon from "../components/Icon";
import { useAuth } from "../context/useAuth";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi, requestsApi } from "../services/agroApi";

const tabClass = ({ isActive }) => (isActive ? "panel-tab is-active" : "panel-tab");

// Carga una sola vez los productos y solicitudes del productor y los comparte
// con las pestañas (productos, inventario y solicitudes recibidas).
export default function ProducerLayout() {
  usePageTitle("Panel del productor");

  const { user } = useAuth();
  const productsQuery = useApi(() => catalogApi.products(), []);
  const requestsQuery = useApi(() => requestsApi.list(), []);

  // La API solo lista productos activos; se filtran los del productor.
  const products = useMemo(
    () => (productsQuery.data || []).filter((p) => p.producer?.id === user.id),
    [productsQuery.data, user.id]
  );
  const requests = useMemo(() => requestsQuery.data || [], [requestsQuery.data]);

  const count = (status) => requests.filter((r) => r.status === status).length;
  const pending = count("PENDING");

  const stats = [
    { label: "Productos activos", value: products.length, loading: productsQuery.loading },
    { label: "Solicitudes pendientes", value: pending, loading: requestsQuery.loading, highlight: pending > 0 },
    { label: "Por completar", value: count("ACCEPTED"), loading: requestsQuery.loading },
    { label: "Completadas", value: count("COMPLETED"), loading: requestsQuery.loading },
  ];

  const context = {
    products,
    requests,
    productsLoading: productsQuery.loading && !productsQuery.data,
    requestsLoading: requestsQuery.loading && !requestsQuery.data,
    productsError: productsQuery.error,
    requestsError: requestsQuery.error,
    reloadProducts: productsQuery.reload,
    reloadRequests: requestsQuery.reload,
    reloadAll: () => {
      productsQuery.reload();
      requestsQuery.reload();
    },
  };

  return (
    <div className="container page">
      <header className="page-head">
        <h1>Panel del productor</h1>
        <p>Gestiona tus productos, tu inventario y las solicitudes que recibes, {user.name}.</p>
      </header>

      <dl className="stat-row">
        {stats.map((stat) => (
          <div className={`stat ${stat.highlight ? "is-highlight" : ""}`} key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.loading && stat.value === 0 ? "–" : stat.value}</dd>
          </div>
        ))}
      </dl>

      <nav className="panel-tabs" aria-label="Secciones del panel">
        <NavLink to="productos" className={tabClass}>
          <Icon name="leaf" size={18} />
          Productos
        </NavLink>
        <NavLink to="inventario" className={tabClass}>
          <Icon name="box" size={18} />
          Inventario
        </NavLink>
        <NavLink to="solicitudes" className={tabClass}>
          <Icon name="list" size={18} />
          Solicitudes recibidas
          {pending > 0 && <span className="tab-count">{pending}</span>}
        </NavLink>
      </nav>

      <div className="panel-body">
        <Outlet context={context} />
      </div>
    </div>
  );
}
