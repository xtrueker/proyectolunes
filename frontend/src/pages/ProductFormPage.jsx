import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CategoryArt from "../components/CategoryArt";
import Field from "../components/Field";
import { Alert, ErrorState, PageLoader } from "../components/Feedback";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi } from "../services/agroApi";
import { UNIT_SUGGESTIONS } from "../utils/constants";
import { formatCOP } from "../utils/format";

function ProductForm({ categories, product, user }) {
  const toast = useToast();
  const navigate = useNavigate();
  const editing = Boolean(product);

  const [form, setForm] = useState(() => ({
    name: product?.name || "",
    categoryId: product?.categoryId || "",
    description: product?.description || "",
    price: product ? String(product.price) : "",
    quantity: product ? String(product.quantity) : "",
    unit: product?.unit || "",
    location: product ? product.location || "" : user.location || "",
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    const found = {};
    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!form.name.trim()) found.name = "Escribe el nombre del producto.";
    if (!form.categoryId) found.categoryId = "Elige una categoría.";
    // El esquema exige descripción: se pide para evitar un error del servidor.
    if (!form.description.trim()) found.description = "Escribe una descripción breve.";
    if (!Number.isFinite(price) || price <= 0) found.price = "El precio debe ser mayor que cero.";
    if (!Number.isFinite(quantity) || quantity <= 0) found.quantity = "La cantidad debe ser mayor que cero.";
    if (!form.unit.trim()) found.unit = "Indica la unidad de venta, por ejemplo kg.";

    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      categoryId: form.categoryId,
      location: form.location.trim(),
    };

    try {
      if (editing) {
        await catalogApi.updateProduct(product.id, payload);
        toast.success("Producto actualizado.");
      } else {
        await catalogApi.createProduct(payload);
        toast.success("Producto publicado en el catálogo.");
      }

      navigate("/panel/productos");
    } catch (error) {
      setFormError(error.message);
      setSaving(false);
    }
  }

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link to="/panel/productos">Mi panel</Link>
        <span aria-current="page">{editing ? "Editar producto" : "Nuevo producto"}</span>
      </nav>

      <header className="page-head">
        <h1>{editing ? "Editar producto" : "Publicar un producto"}</h1>
        <p>
          {editing
            ? "Los cambios se ven de inmediato en el catálogo."
            : "El producto aparecerá en el catálogo apenas lo guardes."}
        </p>
      </header>

      <div className="form-layout">
        <form className="form-card stack" onSubmit={handleSubmit} noValidate>
          <Field
            label="Nombre del producto"
            id="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            autoComplete="off"
            required
          />

          <Field
            label="Categoría"
            id="categoryId"
            as="select"
            value={form.categoryId}
            onChange={handleChange}
            error={errors.categoryId}
            required
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Field>

          <Field
            label="Descripción"
            id="description"
            as="textarea"
            rows="4"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            hint="Cuéntale al comprador qué ofreces: variedad, calidad, cosecha."
            required
          />

          <div className="form-grid">
            <Field
              label="Precio por unidad (COP)"
              id="price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.price}
              onChange={handleChange}
              error={errors.price}
              required
            />
            <Field
              label="Cantidad disponible"
              id="quantity"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.quantity}
              onChange={handleChange}
              error={errors.quantity}
              required
            />
          </div>

          <div className="form-grid">
            <Field
              label="Unidad de venta"
              id="unit"
              list="unidades"
              placeholder="kg, bulto, docena…"
              value={form.unit}
              onChange={handleChange}
              error={errors.unit}
              autoComplete="off"
              required
            />
            <datalist id="unidades">
              {UNIT_SUGGESTIONS.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>

            <Field
              label="Ubicación (opcional)"
              id="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Ej. Barrancabermeja, Santander"
              hint="Dónde se encuentra el producto."
            />
          </div>

          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="button-row">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Publicar producto"}
            </button>
            <Link to="/panel/productos" className="btn btn-secondary btn-lg">
              Cancelar
            </Link>
          </div>
        </form>

        <aside className="form-preview" aria-label="Vista previa">
          <p className="preview-title">Así se verá en el catálogo</p>
          <div className="product-card">
            <div className="product-card-art">
              <CategoryArt name={selectedCategory?.name} />
            </div>
            <div className="product-card-body">
              <p className="product-card-cat">
                {selectedCategory?.name || "Categoría"}
              </p>
              <h3>{form.name.trim() || "Nombre del producto"}</h3>
              <p className="product-card-desc">
                {form.description.trim() || "La descripción aparecerá aquí."}
              </p>
              <p className="product-card-price">
                <strong>{formatCOP(Number(form.price) || 0)}</strong>
                <span> por {form.unit.trim() || "unidad"}</span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ProductFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const editing = Boolean(id);

  usePageTitle(editing ? "Editar producto" : "Nuevo producto");

  const categoriesQuery = useApi(() => catalogApi.categories(), []);
  const productQuery = useApi(
    () => (editing ? catalogApi.product(id) : Promise.resolve({ data: null })),
    [id]
  );

  if (categoriesQuery.loading || productQuery.loading) {
    return <PageLoader label="Cargando formulario…" />;
  }

  const loadError = categoriesQuery.error || productQuery.error;

  if (loadError) {
    return (
      <div className="container narrow-page">
        <ErrorState
          message={loadError}
          onRetry={() => {
            categoriesQuery.reload();
            productQuery.reload();
          }}
        />
        <p className="center-text">
          <Link to="/panel/productos" className="btn btn-secondary">
            Volver a mi panel
          </Link>
        </p>
      </div>
    );
  }

  if (editing && productQuery.data?.producer?.id !== user.id) {
    return (
      <div className="container narrow-page">
        <ErrorState message="Solo puedes editar tus propios productos." />
        <p className="center-text">
          <Link to="/panel/productos" className="btn btn-secondary">
            Volver a mi panel
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ProductForm
      key={id || "nuevo"}
      categories={categoriesQuery.data || []}
      product={productQuery.data}
      user={user}
    />
  );
}
