import * as officeOfferingService from "../services/officeOfferingService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createServiceController = asyncHandler(async (req, res) => {
  const service = await officeOfferingService.createService(req.body);

  res.status(201).json({
    message: "Service created successfully",
    data: service,
  });
});
