import api from "./api";

export const login = async ({ username, password }) => {
  const response = await api.post("/auth/login", { username, password });
  return response.data;
};

// The backend returns { message, data: user }; the context expects { user }.
export const getMe = async () => {
  const response = await api.get("/auth/session");
  return { user: response.data.data };
};

// The backend has no Google login route.
export const googleLogin = async () => {
  throw new Error("Google login is not supported by the backend");
};

export const logout = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};
