import { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextValue";
import {
  login as loginUser,
  logout as logoutUser,
  googleLogin as googleLoginUser,
  getMe,
} from "../services/authService";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (data) => {
    await loginUser(data);
    const userData = await getMe();
    setUser(userData.user);
    return userData.user;
  };

  const googleLogin = async (data) => {
    await googleLoginUser(data);

    const userData = await getMe();
    setUser(userData.user);

    return userData.user;
  };

  const logout = async () => {
    await logoutUser();
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
