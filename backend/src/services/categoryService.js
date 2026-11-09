import * as categoryModel from "../models/categoryModel.js";
import AppError from "../utils/AppError.js";

export const getAllCategories = async (type) => {
  return await categoryModel.getAllCategories(type);
};

export const getCategoryByName = async (name, type) => {
  return await categoryModel.getCategoryByName(name, type);
};

export const searchCategoriesByName = async (name) => {
  return await categoryModel.searchCategoriesByName(name);
};

export const createCategory = async (name, type) => {
  try {
    return await categoryModel.insertCategory(name, type);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Category already exists", 409);
    }

    throw error;
  }
};

export const updateCategory = async (category) => {
  try {
    const currentCategory = await categoryModel.getCategoryById(
      category.categoryId,
    );

    if (!currentCategory) return undefined;

    if (
      category.name !== undefined &&
      (await categoryModel.getCategoryByName(
        category.name,
        currentCategory.type,
        category.categoryId,
      ))
    ) {
      throw new AppError("Category already exists", 409);
    }

    return await categoryModel.updateCategory({
      categoryId: category.categoryId,
      name: category.name,
      isActive: category.isActive,
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Category already exists", 409);
    }

    throw error;
  }
};

export const setDefaultCategory = async (categoryId, isDefault) => {
  try {
    return await categoryModel.setDefaultCategory(categoryId, isDefault);
  } catch (error) {
    if (error.code === "NOT_SERVICE_CATEGORY") {
      throw new AppError(error.message, 400);
    }

    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  try {
    return await categoryModel.deleteCategory(categoryId);
  } catch (error) {
    if (error.code === "23503") {
      throw new AppError(
        "Category is assigned to services or policies and cannot be deleted",
        409,
      );
    }

    throw error;
  }
};
