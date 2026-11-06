import * as dashboardModel from "../models/dashboardModel.js";

export const getDashboardData = async () => {
  const data = await dashboardModel.getDashboardData();
  const {
    services_by_category: servicesByCategory,
    policies_by_category: policiesByCategory,
    ...stats
  } = data;

  return {
    ...Object.fromEntries(
      Object.entries(stats).map(([key, value]) => [key, Number(value)]),
    ),
    services_by_category: servicesByCategory,
    policies_by_category: policiesByCategory,
  };
};
