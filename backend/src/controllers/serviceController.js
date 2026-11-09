import * as officeOfferingService from "../services/officeOfferingService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getServiceLogoPath } from "../utils/serviceLogo.js";

export const getAllServicesController = asyncHandler(async (req, res) => {
  const services = await officeOfferingService.getAllServices();
  res.status(200).json(services);
});

export const getServiceLogoController = (req, res, next) => {
  const logoPath = getServiceLogoPath(req.params.filename);

  if (!logoPath) {
    next(new AppError("Service logo not found", 404));
    return;
  }

  res.sendFile(logoPath, (error) => {
    if (!error) return;

    next(
      error.statusCode === 404
        ? new AppError("Service logo not found", 404)
        : error,
    );
  });
};

export const createServiceController = asyncHandler(async (req, res) => {
  const service = await officeOfferingService.createService(req.body, req.file);

  res.status(201).json({
    message: "Service created successfully",
    data: service,
  });
});

export const searchServicesController = asyncHandler(async (req, res) => {
  const { term } = req.params;

  if (!term.trim()) {
    throw new AppError("Search term is required", 400);
  }

  const services = await officeOfferingService.searchServices(term);
  res.status(200).json(services);
});

export const updateServiceController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await officeOfferingService.updateService(
    id,
    req.body,
    req.file,
  );

  res.status(200).json({
    message: "Service updated successfully",
    data: service,
  });
});

export const setDefaultServiceController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await officeOfferingService.setDefaultService(id);

  res.status(200).json({
    message: "Service set as default successfully",
    data: service,
  });
});

export const deleteServiceController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await officeOfferingService.deleteService(id);

  res.status(200).json({
    message: "Service deleted successfully",
    data: service,
  });
});
