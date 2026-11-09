// Convierte y comprime un archivo de imagen local a Data URL JPEG liviano (< ~120 KB)
// para guardar fotos reales de productos o evidencias de transbordo sin depender de buckets externos.
export function imageFileToDataUrl(file, maxEdge = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Selecciona un archivo de imagen válido (JPG, PNG o WebP)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo de imagen no es válido."));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

