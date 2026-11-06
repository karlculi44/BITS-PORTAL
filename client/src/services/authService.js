import api from "./api";

export const login = async (username, password) => {
  const response = await api.post("/auth/login", { username, password });
  return response.data;
};

// No session endpoint exists; the cookie is HTTP-only, so probe a protected route. Only 401 means signed out.
export const hasSession = async () => {
  try {
    await api.get("/dashboard");
    return true;
  } catch (error) {
    return error.response?.status !== 401;
  }
};
