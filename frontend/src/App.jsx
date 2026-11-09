import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import RequireAuth from "./components/layout/RequireAuth";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import LogisticsPage from "./pages/LogisticsPage";
import AuthPage from "./pages/AuthPage";
import BuyerRequestsPage from "./pages/BuyerRequestsPage";
import ProducerLayout from "./pages/ProducerLayout";
import ProducerProductsPage from "./pages/ProducerProductsPage";
import ProducerInventoryPage from "./pages/ProducerInventoryPage";
import ProducerRequestsPage from "./pages/ProducerRequestsPage";
import ProductFormPage from "./pages/ProductFormPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

// Mapa de rutas. Los permisos coinciden con los del backend:
// - BUYER: solicita productos y ve/cancela sus solicitudes.
// - PRODUCER: gestiona productos y responde solicitudes recibidas.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="catalogo" element={<CatalogPage />} />
        <Route path="logistica" element={<LogisticsPage />} />
        <Route path="productos/:id" element={<ProductDetailPage />} />
        <Route path="ingresar" element={<AuthPage key="login" mode="login" />} />
        <Route path="registro" element={<AuthPage key="register" mode="register" />} />

        <Route element={<RequireAuth />}>
          <Route path="perfil" element={<ProfilePage />} />
        </Route>

        <Route element={<RequireAuth roles={["BUYER"]} />}>
          <Route path="mis-solicitudes" element={<BuyerRequestsPage />} />
        </Route>

        <Route element={<RequireAuth roles={["PRODUCER"]} />}>
          <Route path="panel" element={<ProducerLayout />}>
            <Route index element={<Navigate to="productos" replace />} />
            <Route path="productos" element={<ProducerProductsPage />} />
            <Route path="inventario" element={<ProducerInventoryPage />} />
            <Route path="solicitudes" element={<ProducerRequestsPage />} />
          </Route>
          <Route path="panel/productos/nuevo" element={<ProductFormPage />} />
          <Route path="panel/productos/:id/editar" element={<ProductFormPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
