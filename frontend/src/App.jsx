
import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Comprador ficticio registrado en nuestra base de datos.
const DEMO_BUYER_ID = "cmw8464ng00004oxjvc1reorp";

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados del formulario de compra.
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("25");
  const [origin, setOrigin] = useState("Barrancabermeja, Santander");
  const [destination, setDestination] = useState("");
  const [transportType, setTransportType] = useState("TERRESTRE");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(null);

  // Cargar categorías.
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch(`${API_URL}/categories`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("No se pudieron cargar las categorías.");
        }

        setCategories(result.data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadCategories();
  }, []);

  // Cargar productos y aplicar filtros.
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (categoryId) {
          params.set("categoryId", categoryId);
        }

        const response = await fetch(
          `${API_URL}/products?${params.toString()}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("No se pudo cargar el catálogo.");
        }

        setProducts(result.data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [search, categoryId]);

  // Abrir formulario para un producto.
  function openRequestForm(product) {
    setSelectedProduct(product);
    setQuantity("25");
    setOrigin("Barrancabermeja, Santander");
    setDestination("");
    setTransportType("TERRESTRE");
    setNotes("");
    setRequestError("");
    setRequestSuccess(null);

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  // Enviar solicitud al backend.
  async function handleSubmitRequest(event) {
    event.preventDefault();

    if (!selectedProduct) return;

    const requestedQuantity = Number(quantity);

    if (
      !Number.isFinite(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      setRequestError("Ingresa una cantidad válida.");
      return;
    }

    if (requestedQuantity > selectedProduct.quantity) {
      setRequestError(
        `Solo hay ${selectedProduct.quantity} ${selectedProduct.unit} disponibles.`
      );
      return;
    }

    if (!destination.trim()) {
      setRequestError("Debes indicar el destino de entrega.");
      return;
    }

    setSubmitting(true);
    setRequestError("");
    setRequestSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/purchase-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            buyerId: DEMO_BUYER_ID,
            productId: selectedProduct.id,
            quantity: requestedQuantity,
            origin,
            destination,
            transportType,
            notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "No se pudo registrar la solicitud."
        );
      }

      setRequestSuccess(result.data);
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function closeRequestForm() {
    setSelectedProduct(null);
    setRequestError("");
    setRequestSuccess(null);
  }

  return (
    <main className="app">
      <header className="header">
        <a className="brand" href="/">
          <span className="brand-icon">🌱</span>
          Agro-Red <span>Magdalena</span>
        </a>

        <nav>
          <a href="#catalogo">Catálogo</a>
          <a href="#nosotros">Nosotros</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            CONECTANDO EL CAMPO CON EL MERCADO
          </span>

          <h1>
            Del campo a tu negocio,
            <span> sin tantas barreras.</span>
          </h1>

          <p>
            Descubre productos agrícolas y pecuarios de productores
            regionales del Magdalena Medio.
          </p>

          <a href="#catalogo" className="hero-button">
            Explorar productos →
          </a>
        </div>
      </section>

      <section className="catalog" id="catalogo">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MERCADO REGIONAL</span>
            <h2>Productos disponibles</h2>
            <p>
              Encuentra productos directamente de sus productores.
            </p>
          </div>
        </div>

        <div className="filters">
          <input
            type="search"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Todas las categorías</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <p className="message">Cargando productos...</p>
        )}

        {error && (
          <p className="message error">{error}</p>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="message">
            No encontramos productos con esos filtros.
          </p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-placeholder">🌾</div>

                <div className="product-info">
                  <span className="category-label">
                    {product.category.name}
                  </span>

                  <h3>{product.name}</h3>

                  <p>{product.description}</p>

                  <strong>
                    ${Number(product.price).toLocaleString("es-CO")} /{" "}
                    {product.unit}
                  </strong>

                  <div className="product-footer">
                    <span>
                      📍 {product.location || "Región"}
                    </span>

                    <span>
                      {product.quantity} {product.unit} disponibles
                    </span>
                  </div>

                  <small>
                    Productor: {product.producer.name}
                  </small>

                  <button
                    className="request-button"
                    onClick={() => openRequestForm(product)}
                  >
                    Solicitar producto
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Formulario de solicitud de compra. */}
        {selectedProduct && (
          <section className="request-section" id="solicitud">
            <div className="request-heading">
              <div>
                <span className="eyebrow">COMERCIALIZACIÓN REGIONAL</span>
                <h2>Solicitud de compra</h2>
                <p>
                  Completa los datos para enviar tu solicitud al productor.
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeRequestForm}
                type="button"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="selected-product">
              <span>🌾</span>
              <div>
                <strong>{selectedProduct.name}</strong>
                <p>
                  ${Number(selectedProduct.price).toLocaleString("es-CO")} /
                  {" "}{selectedProduct.unit}
                </p>
                <small>
                  Disponibles: {selectedProduct.quantity}{" "}
                  {selectedProduct.unit}
                </small>
              </div>
            </div>

            {requestSuccess ? (
              <div className="success-panel">
                <h3>¡Solicitud registrada correctamente!</h3>

                <p>
                  Tu solicitud ha sido guardada en Agro-Red Magdalena.
                </p>

                <div className="success-details">
                  <p>
                    <strong>Número de solicitud:</strong>{" "}
                    {requestSuccess.id}
                  </p>

                  <p>
                    <strong>Producto:</strong>{" "}
                    {requestSuccess.product.name}
                  </p>

                  <p>
                    <strong>Cantidad:</strong>{" "}
                    {requestSuccess.quantity}{" "}
                    {requestSuccess.product.unit}
                  </p>

                  <p>
                    <strong>Estado:</strong>{" "}
                    {requestSuccess.status}
                  </p>
                </div>

                <button
                  className="request-button"
                  onClick={closeRequestForm}
                  type="button"
                >
                  Volver al catálogo
                </button>
              </div>
            ) : (
              <form
                className="request-form"
                onSubmit={handleSubmitRequest}
              >
                <div className="form-group">
                  <label htmlFor="quantity">
                    Cantidad ({selectedProduct.unit})
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={selectedProduct.quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="origin">Lugar de origen</label>

                  <input
                    id="origin"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="destination">
                    Destino de entrega
                  </label>

                  <input
                    id="destination"
                    placeholder="Ej. Bucaramanga, Santander"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="transportType">
                    Tipo de transporte
                  </label>

                  <select
                    id="transportType"
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value)}
                    required
                  >
                    <option value="TERRESTRE">Terrestre</option>
                    <option value="FLUVIAL">Fluvial</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="notes">
                    Observaciones adicionales
                  </label>

                  <textarea
                    id="notes"
                    rows="3"
                    placeholder="Escribe alguna indicación para el productor..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-total">
                  <span>Valor estimado de referencia</span>

                  <strong>
                    $
                    {(
                      Number(quantity || 0) *
                      Number(selectedProduct.price)
                    ).toLocaleString("es-CO")}
                    {" "}COP
                  </strong>

                  <small>
                    El precio definitivo debe ser confirmado por el productor.
                  </small>
                </div>

                {requestError && (
                  <p className="message error">
                    {requestError}
                  </p>
                )}

                <button
                  className="request-button submit-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Enviando solicitud..."
                    : "Enviar solicitud de compra"}
                </button>
              </form>
            )}
          </section>
        )}
      </section>

      <footer id="nosotros">
        <strong>Agro-Red Magdalena</strong>
        <p>
          Impulsando la comercialización agrícola regional.
        </p>
      </footer>
    </main>
  );
}

export default App;

