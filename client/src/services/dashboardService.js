import api from "./api";

export const getDashboardStats = async () => {
  const response = await api.get("/dashboard");
  return response.data.data;
};

export const getServices = async () => {
  const response = await api.get("/services");
  return response.data;
};

export const getDashboardData = async () => {
  const dashboard = await getDashboardStats();

  if (
    !Array.isArray(dashboard.services_by_category) ||
    !Array.isArray(dashboard.policies_by_category)
  ) {
    throw new Error("Dashboard response did not include category distributions.");
  }

  return {
    stats: {
      total_users: dashboard.total_users,
      total_policies: dashboard.total_policies,
      total_categories: dashboard.total_categories,
    },
    servicesByCategory: dashboard.services_by_category,
    policiesByCategory: dashboard.policies_by_category,
  };
};

export const getRecentServices = async () => {
  const services = await getServices();
  const byNewest = (a, b) => new Date(b.created_at) - new Date(a.created_at);

  return [...services].sort(byNewest).slice(0, 5);
};
