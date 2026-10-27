import * as officeOfferingService from "../services/officeOfferingService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

export const createServiceController = asyncHandler(async (req, res) => {
  const service = await officeOfferingService.createService(req.body);

  res.status(201).json({
    message: "Service created successfully",
    data: service,
  });
});

export const updateServiceController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    throw new AppError("Invalid service ID", 400);
  }

  const service = await officeOfferingService.updateService(id, req.body);

  res.status(200).json({
    message: "Service updated successfully",
    data: service,
  });
});
