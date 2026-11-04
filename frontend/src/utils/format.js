const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const quantity = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export const formatCOP = (value) => currency.format(Number(value) || 0);

export const formatQty = (value) => quantity.format(Number(value) || 0);

export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const shortId = (id) => (id ? id.slice(-6).toUpperCase() : "");
