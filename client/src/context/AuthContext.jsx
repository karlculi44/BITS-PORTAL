import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const version = useRef(0);
  const pendingCheck = useRef(null);

  const checkAuth = useCallback(() => {
    if (pendingCheck.current) return pendingCheck.current;
    const currentVersion = version.current;
    setLoading(true);
    const request = authService.getSession()
      .then((result) => {
        if (version.current === currentVersion) setUser(result.data);
        return result.data;
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          if (version.current === currentVersion) setUser(null);
          return null;
        }
        throw error;
      })
      .finally(() => {
        if (version.current === currentVersion) setLoading(false);
        if (pendingCheck.current === request) pendingCheck.current = null;
      });
    pendingCheck.current = request;
    return request;
  }, []);

  useEffect(() => {
    let active = true;
    checkAuth().catch(() => {
      if (active) toast.error("Unable to check your session. Please try again.");
    });
    return () => { active = false; };
  }, [checkAuth]);

  const login = async ({ username, password }) => {
    const currentVersion = ++version.current;
    pendingCheck.current = null;
    try {
      const result = await authService.login(username, password);
      if (version.current === currentVersion) setUser(result.data);
      return result;
    } finally {
      if (version.current === currentVersion) setLoading(false);
    }
  };

  const logout = async () => {
    const currentVersion = ++version.current;
    pendingCheck.current = null;
    try {
      const result = await authService.logout();
      if (version.current === currentVersion) {
        setUser(null);
        navigate("/login", { replace: true });
      }
      return result;
    } finally {
      if (version.current === currentVersion) setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: user !== null, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
