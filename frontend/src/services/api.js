import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

let accessToken = null;
let refreshPromise = null;
let authFailureHandler = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const registerAuthFailureHandler = (handler) => {
  authFailureHandler = handler;
  return () => {
    if (authFailureHandler === handler) {
      authFailureHandler = null;
    }
  };
};

const clearAuthentication = () => {
  setAccessToken(null);
  authFailureHandler?.();
};

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        "/auth/refresh",
        null,
        { baseURL: api.defaults.baseURL, withCredentials: true },
      )
      .then(({ data }) => {
        if (!data?.accessToken || !data.data) {
          throw new Error("Refresh response did not include a session");
        }
        setAccessToken(data.accessToken);
        return data;
      })
      .catch((error) => {
        clearAuthentication();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const isExcludedAuthRequest = (url = "") =>
  /\/auth\/(?:login|logout|refresh)(?:[?#]|$)/i.test(url);

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !isExcludedAuthRequest(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
    config._authToken = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      isExcludedAuthRequest(config.url)
    ) {
      return Promise.reject(error);
    }

    config._retry = true;
    const currentToken = getAccessToken();
    if (!currentToken && !config._authToken) {
      return Promise.reject(error);
    }
    if (currentToken && config._authToken !== currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
      config._authToken = currentToken;
      return api(config);
    }

    try {
      const { accessToken: newToken } = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${newToken}`;
      config._authToken = newToken;
      return api(config);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);

export default api;
