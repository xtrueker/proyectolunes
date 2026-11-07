import { useCallback, useEffect, useRef, useState } from "react";

// Carga datos al montar y cada vez que cambian `deps`.
// - `loading` es true mientras no llegue la respuesta de la clave actual.
// - `data` conserva el último resultado mientras se recarga (sin parpadeos).
// - `reload()` repite la consulta.
export default function useApi(fetcher, deps = []) {
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [tick, setTick] = useState(0);
  const key = `${JSON.stringify(deps)}#${tick}`;
  const [result, setResult] = useState({ key: null, data: null, error: "" });

  useEffect(() => {
    let cancelled = false;

    fetcherRef
      .current()
      .then((response) => {
        if (!cancelled) setResult({ key, data: response.data, error: "" });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setResult({ key, data: null, error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setTick((current) => current + 1), []);
  const loading = result.key !== key;

  return {
    data: result.data,
    error: loading ? "" : result.error,
    loading,
    reload,
  };
}
