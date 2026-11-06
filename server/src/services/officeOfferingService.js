import * as officeServiceModel from "../models/officeServiceModel.js";
import AppError from "../utils/AppError.js";
import {
  formatServiceImage,
  formatServiceImages,
  isManagedServiceLogo,
  removeServiceLogo,
} from "../utils/serviceLogo.js";

export const getAllServices = async () => {
  return formatServiceImages(await officeServiceModel.getAllServices());
};

export const createService = async (service, uploadedLogo) => {
  try {
    const category = await officeServiceModel.getCategoryById(
      service.category_id,
    );

    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (category.type !== "service") {
      throw new AppError("Category must be a service category", 400);
    }

    const createdService = await officeServiceModel.insertService(service);

    if (createdService) {
      return formatServiceImage(createdService);
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
    if (uploadedLogo) {
      try {
        await removeServiceLogo(uploadedLogo.filename);
      } catch (cleanupError) {
        cleanupError.cause = error;
        throw cleanupError;
      }
    }

    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }
};

export const searchServices = async (term) => {
  return formatServiceImages(await officeServiceModel.searchServices(term));
};

const removeUnusedServiceLogo = async (image) => {
  if (
    isManagedServiceLogo(image) &&
    !(await officeServiceModel.isServiceImageReferenced(image))
  ) {
    await removeServiceLogo(image);
  }
};

export const updateService = async (serviceId, service, uploadedLogo) => {
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

  let updatedService;

  try {
    if (service.category_id !== undefined) {
      await validateCategory();
    }

    updatedService = await officeServiceModel.updateService(
      serviceId,
      service,
    );

    if (!updatedService) {
      if (service.category_id !== undefined) {
        await validateCategory();
      }

      throw new AppError("Service not found", 404);
    }
  } catch (error) {
    if (uploadedLogo) {
      try {
        await removeServiceLogo(uploadedLogo.filename);
      } catch (cleanupError) {
        cleanupError.cause = error;
        throw cleanupError;
      }
    }

    if (error.code === "23503") {
      throw new AppError("Category not found", 404);
    }

    throw error;
  }

  let serviceResult = updatedService;

  if (Object.hasOwn(updatedService, "previous_image")) {
    const { previous_image: previousImage, ...updatedResult } = updatedService;
    serviceResult = updatedResult;

    if (service.image !== undefined && service.image !== previousImage) {
      await removeUnusedServiceLogo(previousImage);
    }
  }

  return formatServiceImage(serviceResult);
};

export const setDefaultService = async (serviceId) => {
  const service = await officeServiceModel.setDefaultService(serviceId);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  return formatServiceImage(service);
};

export const deleteService = async (serviceId) => {
  const service = await officeServiceModel.deleteService(serviceId);

  if (!service) {
    throw new AppError("Service not found", 404);
  }

  await removeUnusedServiceLogo(service.image);

  return formatServiceImage(service);
};
