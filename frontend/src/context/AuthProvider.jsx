import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import { useToast } from "./useToast";
import { authApi } from "../services/agroApi";
import {
  clearSession,
  getSavedUser,
  getToken,
  saveSession,
  UNAUTHORIZED_EVENT,
} from "../services/api";

export default function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  // Validar la sesión guardada con GET /auth/me.
  useEffect(() => {
    if (!getToken()) return undefined;

    let active = true;

    authApi
      .me()
      .then((result) => {
        if (!active) return;
        setUser(result.user);
        saveSession(getToken(), result.user);
      })
      .catch((error) => {
        if (error.status === 401 || error.status === 404) {
          clearSession();
          return;
        }

        // Backend inaccesible: se conserva la sesión guardada sin cerrarla.
        const saved = getSavedUser();
        if (active && saved) setUser(saved);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Token vencido durante el uso de la app.
  useEffect(() => {
    function handleUnauthorized() {
      clearSession();
      setUser(null);
      toast.info("Tu sesión expiró. Inicia sesión de nuevo.");
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [toast]);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email.trim(), password);
    saveSession(result.token, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (data) => {
    const result = await authApi.register(data);
    saveSession(result.token, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const result = await authApi.updateProfile(data);
    setUser(result.user);
    saveSession(getToken(), result.user);
    return result.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
