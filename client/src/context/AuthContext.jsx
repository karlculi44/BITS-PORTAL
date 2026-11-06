import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import {
  registerAuthFailureHandler,
  setAccessToken,
} from "../services/api";
import {
  login as loginUser,
  logout as logoutUser,
  googleLogin as googleLoginUser,
  getMe,
  refresh as refreshSession,
} from "../services/authService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unregisterAuthFailureHandler = registerAuthFailureHandler(() => {
      setUser(null);
    });

    const restoreSession = async () => {
      try {
        const session = await refreshSession();
        setAccessToken(session.accessToken);
        setUser(session.data);
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("Failed to restore session:", error);
        }
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
    return unregisterAuthFailureHandler;
  }, []);

  const login = async (data) => {
    const session = await loginUser(data);
    if (!session.accessToken || !session.data) {
      throw new Error("Login response did not include a session");
    }
    setAccessToken(session.accessToken);
    setUser(session.data);
    return session.data;
  };

  const googleLogin = async (data) => {
    await googleLoginUser(data);

    const userData = await getMe();
    setUser(userData.user);

    return userData.user;
  };

  const logout = async () => {
    await logoutUser();
    setAccessToken(null);
    setUser(null);
  };

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, googleLogin, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
