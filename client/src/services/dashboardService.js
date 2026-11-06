import api from "./api";

export const getDashboardStats = async () => {
  const response = await api.get("/dashboard");
  return response.data.data;
};

export const getUsers = async () => {
  const response = await api.get("/users");
  return response.data.data;
};

export const getServices = async () => {
  const response = await api.get("/services");
  return response.data;
};

export const getDashboardData = async () => {
  const [stats, users, services] = await Promise.all([
    getDashboardStats(),
    getUsers(),
    getServices(),
  ]);

  const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);

  return {
    stats,
    recentUsers: [...users].sort(byNewest).slice(0, 5),
    recentServices: [...services].sort(byNewest).slice(0, 5),
  };
};
