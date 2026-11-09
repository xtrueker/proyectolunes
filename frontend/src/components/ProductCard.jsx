import { Link } from "react-router-dom";
import Icon from "./Icon";
import ProductVisual from "./ProductVisual";
import { NODE_TYPE_LABELS } from "../utils/constants";
import { formatCOP, formatQty } from "../utils/format";

export default function ProductCard({ product }) {
  const soldOut = Number(product.quantity) <= 0;
  const detailPath = `/productos/${product.id}`;
  const place =
    product.originNode?.name
      ? `${product.originNode.name} (${NODE_TYPE_LABELS[product.originNode.type] || product.originNode.department})`
      : product.location || product.producer?.location;

  return (
    <article className="product-card">
      <Link to={detailPath} className="product-card-art" tabIndex={-1} aria-hidden="true">
        <ProductVisual
          imageUrl={product.imageUrl}
          categoryName={product.category?.name}
          alt={product.name}
        />
        {soldOut && <span className="sold-out">Agotado</span>}
        {product.imageUrl && !soldOut && (
          <span className="photo-pill">Foto real</span>
        )}
      </Link>

      <div className="product-card-body">
        <p className="product-card-cat">{product.category?.name}</p>
        <h3>
          <Link to={detailPath}>{product.name}</Link>
        </h3>
        <p className="product-card-desc">{product.description}</p>

        <p className="product-card-price">
          <strong>{formatCOP(product.price)}</strong>
          <span> por {product.unit}</span>
        </p>

        <ul className="meta-list">
          <li>
            <Icon name={product.originNode ? "anchor" : "pin"} size={16} />
            {place || "Ubicación no indicada"}
          </li>
          <li>
            <Icon name="box" size={16} />
            {formatQty(product.quantity)} {product.unit} disponibles
          </li>
          <li>
            <Icon name="user" size={16} />
            {product.producer?.name}
          </li>
        </ul>

        <Link
          className={`btn btn-block ${soldOut ? "btn-secondary" : "btn-primary"}`}
          to={detailPath}
        >
          {soldOut ? "Ver producto" : "Cotizar y solicitar"}
        </Link>
      </div>
    </article>
  );
}
