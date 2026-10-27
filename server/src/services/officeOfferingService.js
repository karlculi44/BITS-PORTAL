import * as officeServiceModel from "../models/officeServiceModel.js";
import AppError from "../utils/AppError.js";

export const getAllServices = async () => {
  return await officeServiceModel.getAllServices();
};

export const createService = async (service) => {
  const category = await officeServiceModel.getCategoryById(
    service.category_id,
  );

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category.type !== "service") {
    throw new AppError("Category must be a service category", 400);
  }

  try {
    const createdService = await officeServiceModel.insertService(service);

    if (createdService) {
      return createdService;
    }

    const currentCategory = await officeServiceModel.getCategoryById(
      service.category_id,
    );

    if (!currentCategory) {
      throw new AppError("Category not found", 404);
    }

    if (currentCategory.type !== "service") {
      throw new AppError("Category must be a service category", 400);
    }

    throw new Error("Service was not created");
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }
};

export const searchServices = async (term) => {
  return await officeServiceModel.searchServices(term);
};

export const updateService = async (serviceId, service) => {
  const validateCategory = async () => {
    const category = await officeServiceModel.getCategoryById(
      service.category_id,
    );

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (category.type !== "service") {
      throw new AppError("Category must be a service category", 400);
    }
  };

  export const deleteService = async (serviceId) => {
    const service = await officeServiceModel.deleteService(serviceId);

    if (!service) {
      throw new AppError("Service not found", 404);
    }

    return service;
  };

  if (service.category_id !== undefined) {
    await validateCategory();
  }

  try {
    const updatedService = await officeServiceModel.updateService(
      serviceId,
      service,
    );

    if (!updatedService) {
      if (service.category_id !== undefined) {
        await validateCategory();
      }

      throw new AppError("Service not found", 404);
    }

    return updatedService;
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }
};
