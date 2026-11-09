import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Field from "../components/Field";
import Icon from "../components/Icon";
import ProductVisual from "../components/ProductVisual";
import { Alert, ErrorState, PageLoader } from "../components/Feedback";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import useApi from "../hooks/useApi";
import usePageTitle from "../hooks/usePageTitle";
import { catalogApi, logisticsApi } from "../services/agroApi";
import {
  NODE_TYPE_LABELS,
  PERISHABILITY_OPTIONS,
  UNIT_SUGGESTIONS,
} from "../utils/constants";
import { formatCOP } from "../utils/format";
import { imageFileToDataUrl } from "../utils/imageFile";

const speechSupported =
  typeof window !== "undefined" &&
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

function ProductForm({ categories, nodes, product, user }) {
  const toast = useToast();
  const navigate = useNavigate();
  const editing = Boolean(product);

  const [form, setForm] = useState(() => ({
    name: product?.name || "",
    categoryId: product?.categoryId || "",
    description: product?.description || "",
    price: product ? String(product.price) : "",
    quantity: product ? String(product.quantity) : "",
    unit: product?.unit || "kg",
    perishability: product?.perishability || "MEDIUM",
    originNodeId: product?.originNodeId || "",
    location: product ? product.location || "" : user.location || "",
    imageUrl: product?.imageUrl || "",
  }));

  // Asistente rural en lenguaje natural (voz o texto rápido)
  const [draftPhrase, setDraftPhrase] = useState("");
  const [parsingDraft, setParsingDraft] = useState(false);
  const [listening, setListening] = useState(false);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const selectedNode = nodes.find((n) => n.id === form.originNodeId);

  // Cálculo reactivo de Precio Justo SIPSA-DANE vs. intermediario
  const fairKey =
    form.name.trim() || selectedCategory
      ? `${form.name.trim()}|${selectedCategory?.name || ""}|${form.unit.trim() || "kg"}|${Number(form.price) || 0}|${Number(form.quantity) || 100}|${form.originNodeId}`
      : "";

  const [fairState, setFairState] = useState({ key: "", data: null });

  useEffect(() => {
    if (!fairKey) return undefined;
    let cancelled = false;
    const [pName, cName, unit, price, qty, oNode] = fairKey.split("|");

    const timer = setTimeout(() => {
      logisticsApi
        .fairPrice({
          productName: pName,
          categoryName: cName,
          unit,
          producerPrice: Number(price),
          quantity: Number(qty) || 100,
          originNodeId: oNode || undefined,
        })
        .then((res) => {
          if (!cancelled) setFairState({ key: fairKey, data: res.data });
        })
        .catch(() => {});
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fairKey]);

  const fairData = fairState.key === fairKey ? fairState.data : fairState.data;

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "originNodeId" && value) {
        const matched = nodes.find((n) => n.id === value);
        if (matched && !current.location.trim()) {
          next.location = `${matched.name}, ${matched.department}`;
        }
      }
      return next;
    });
  }

  async function applyNaturalDraft(phraseToParse) {
    const text = (phraseToParse ?? draftPhrase).trim();
    if (!text) {
      toast.info("Escribe o dicta una frase primero.");
      return;
    }

    setParsingDraft(true);
    try {
      const res = await catalogApi.parseDraft(text);
      const d = res.data;
      setForm((cur) => ({
        ...cur,
        name: d.name || cur.name,
        categoryId: d.categoryId || cur.categoryId,
        description: d.description || cur.description,
        price: d.price ? String(d.price) : cur.price,
        quantity: d.quantity ? String(d.quantity) : cur.quantity,
        unit: d.unit || cur.unit,
        perishability: d.perishability || cur.perishability,
        originNodeId: d.originNodeId || cur.originNodeId,
        location: d.location || cur.location,
      }));
      toast.success("Formulario autocompletado con tu mensaje rural.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setParsingDraft(false);
    }
  }

  function startVoiceCapture() {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setDraftPhrase(transcript);
        applyNaturalDraft(transcript);
      }
    };
    recognition.onerror = () => {
      toast.error("No se pudo capturar el audio del micrófono.");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.start();
  }

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await imageFileToDataUrl(file);
      setForm((current) => ({ ...current, imageUrl: dataUrl }));
      toast.info("Fotografía del lote cargada en la vista previa.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      event.target.value = "";
    }
  }

  function validate() {
    const found = {};
    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!form.name.trim()) found.name = "Escribe el nombre del producto.";
    if (!form.categoryId) found.categoryId = "Elige una categoría.";
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
      perishability: form.perishability,
      categoryId: form.categoryId,
      originNodeId: form.originNodeId || null,
      location: form.location.trim(),
      imageUrl: form.imageUrl.trim() || null,
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
          Publica con asistencia por voz/texto, consulta la referencia de Precio
          Justo (SIPSA) y conecta tu lote con la red logística del río.
        </p>
      </header>

      {!editing && (
        <section className="rural-assistant" aria-label="Publicación asistida">
          <div className="rural-assistant-head">
            <Icon name="spark" size={20} />
            <div>
              <strong>Publicación Rápida Rural (Texto o Voz)</strong>
              <p>
                Escribe o dicta en tus palabras lo que cosechaste y el sistema
                llenará los campos automáticamente.
              </p>
            </div>
          </div>

          <div className="rural-assistant-row">
            <input
              type="text"
              className="control"
              placeholder='Ej: "Tengo 40 bultos de plátano hartón en Puerto Wilches a 120 mil"'
              value={draftPhrase}
              onChange={(e) => setDraftPhrase(e.target.value)}
            />
            {speechSupported && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startVoiceCapture}
                disabled={listening || parsingDraft}
              >
                <Icon name="mic" size={18} />
                {listening ? "Escuchando…" : "Dictar"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => applyNaturalDraft()}
              disabled={parsingDraft}
            >
              {parsingDraft ? "Analizando…" : "Autocompletar"}
            </button>
          </div>
        </section>
      )}

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

          <div className="form-grid">
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
              label="Perecibilidad del lote"
              id="perishability"
              as="select"
              value={form.perishability}
              onChange={handleChange}
              hint="Ajusta alertas de tiempo en rutas fluviales."
            >
              {PERISHABILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Field>
          </div>

          <Field
            label="Descripción"
            id="description"
            as="textarea"
            rows="3"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            hint="Cuéntale al comprador variedad, calidad, fecha de corte o empaque."
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
              placeholder="kg, bulto, tonelada…"
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
              label="Nodo logístico de origen (Magdalena Medio)"
              id="originNodeId"
              as="select"
              value={form.originNodeId}
              onChange={handleChange}
              hint="Conecta tu oferta al cotizador fluvial-terrestre."
            >
              <option value="">Seleccionar puerto / centro de acopio</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name} ({NODE_TYPE_LABELS[node.type] || node.type} · {node.department})
                </option>
              ))}
            </Field>
          </div>

          <Field
            label="Ubicación / Vereda (opcional)"
            id="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Ej. Vereda El Llanito, Barrancabermeja"
          />

          <div className="photo-upload-box">
            <Field
              label="Imagen real del lote (URL o fotografía local)"
              id="imageUrl"
              value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
              onChange={handleChange}
              placeholder="https://ejemplo.com/cosecha.jpg"
              hint={
                form.imageUrl.startsWith("data:")
                  ? "Fotografía local cargada y optimizada."
                  : "Pega un enlace de imagen o sube una foto desde tu celular/PC."
              }
            />
            <div className="photo-upload-actions">
              <label className="btn btn-secondary btn-sm file-btn">
                <Icon name="camera" size={16} />
                Subir foto del lote
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </label>
              {form.imageUrl && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setForm((current) => ({ ...current, imageUrl: "" }))}
                >
                  Quitar foto
                </button>
              )}
            </div>
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

        <aside className="form-preview" aria-label="Vista previa e inteligencia de precios">
          {fairData && (
            <div className="fair-price-card">
              <div className="fair-price-head">
                <Icon name="spark" size={18} />
                <strong>Índice de Precio Justo (Ref. SIPSA)</strong>
              </div>

              <dl className="fair-price-rows">
                <div>
                  <dt>Intermediario típico en puerto</dt>
                  <dd>{formatCOP(fairData.intermediaryTypicalPerUnit)} / {fairData.unit}</dd>
                </div>
                <div>
                  <dt>Banda directa recomendada</dt>
                  <dd>
                    {formatCOP(fairData.fairBand.min)} – {formatCOP(fairData.fairBand.max)}
                  </dd>
                </div>
                <div>
                  <dt>Central mayorista (ref.)</dt>
                  <dd>{formatCOP(fairData.wholesaleRefPerUnit)} / {fairData.unit}</dd>
                </div>
              </dl>

              {fairData.producerGainVsIntermediaryPct > 0 && (
                <p className="fair-gain-pill">
                  +{fairData.producerGainVsIntermediaryPct} % más ingreso directo frente a intermediario
                </p>
              )}

              <p className="fair-advice">{fairData.recommendation}</p>

              <button
                type="button"
                className="btn btn-secondary btn-sm btn-block"
                onClick={() =>
                  setForm((c) => ({
                    ...c,
                    price: String(fairData.fairBand.suggested),
                  }))
                }
              >
                Usar precio ideal ({formatCOP(fairData.fairBand.suggested)})
              </button>
            </div>
          )}

          <p className="preview-title">Así se verá en el catálogo</p>
          <div className="product-card">
            <div className="product-card-art">
              <ProductVisual
                imageUrl={form.imageUrl}
                categoryName={selectedCategory?.name}
                alt={form.name || "Vista previa"}
              />
              {form.imageUrl && <span className="photo-pill">Foto real</span>}
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
              {selectedNode && (
                <p className="node-tag">
                  <Icon name="anchor" size={15} />
                  Nodo: {selectedNode.name} ({NODE_TYPE_LABELS[selectedNode.type]})
                </p>
              )}
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
  const nodesQuery = useApi(() => logisticsApi.nodes(), []);
  const productQuery = useApi(
    () => (editing ? catalogApi.product(id) : Promise.resolve({ data: null })),
    [id]
  );

  if (categoriesQuery.loading || nodesQuery.loading || productQuery.loading) {
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
            nodesQuery.reload();
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
      nodes={nodesQuery.data || []}
      product={productQuery.data}
      user={user}
    />
  );
}
