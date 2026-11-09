import { useState } from "react";
import CategoryArt from "./CategoryArt";

// Muestra la foto real del lote cuando existe y cae limpiamente en la ilustración de categoría si no hay URL o falla la carga.
export default function ProductVisual({ imageUrl, categoryName, alt = "" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const trimmed = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const showImage = Boolean(trimmed) && failedUrl !== trimmed;

  if (showImage) {
    return (
      <img
        className="product-photo"
        src={trimmed}
        alt={alt}
        loading="lazy"
        onError={() => setFailedUrl(trimmed)}
      />
    );
  }

  return <CategoryArt name={categoryName} />;
}

