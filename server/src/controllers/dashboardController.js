import * as dashboardService from "../services/dashboardService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getDashboardController = asyncHandler(async (req, res) => {
  const dashboardData = await dashboardService.getDashboardData();

  res.status(200).json({
    message: "Dashboard data retrieved successfully",
    data: dashboardData,
  });
});
