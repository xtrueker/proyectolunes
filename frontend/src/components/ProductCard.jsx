import { Link } from "react-router-dom";
import CategoryArt from "./CategoryArt";
import Icon from "./Icon";
import { formatCOP, formatQty } from "../utils/format";

export default function ProductCard({ product }) {
  const soldOut = Number(product.quantity) <= 0;
  const detailPath = `/productos/${product.id}`;
  const place = product.location || product.producer?.location;

  return (
    <article className="product-card">
      <Link to={detailPath} className="product-card-art" tabIndex={-1} aria-hidden="true">
        <CategoryArt name={product.category?.name} />
        {soldOut && <span className="sold-out">Agotado</span>}
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
            <Icon name="pin" size={16} />
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
          {soldOut ? "Ver producto" : "Ver y solicitar"}
        </Link>
      </div>
    </article>
  );
}
