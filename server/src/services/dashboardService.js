import * as dashboardModel from "../models/dashboardModel.js";

export const getDashboardData = async () => {
  const data = await dashboardModel.getDashboardData();

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, Number(value)]),
  );
};
