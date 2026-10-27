import * as categoryModel from "../models/categoryModel.js";
import AppError from "../utils/AppError.js";

export const getAllCategories = async () => {
  return await categoryModel.getAllCategories();
};

export const getCategoryByName = async (name) => {
  return await categoryModel.getCategoryByName(name);
};

export const searchCategoriesByName = async (name) => {
  return await categoryModel.searchCategoriesByName(name);
};

export const createCategory = async (name, description, type) => {
  try {
    return await categoryModel.insertCategory(name, description, type);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Category already exists", 409);
    }

    throw error;
  }
};

export const updateCategory = async (category) => {
  try {
    return await categoryModel.updateCategory(category);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Category already exists", 409);
    }

    throw error;
  }
};

export const deleteCategory = async (categoryId) => {
  return await categoryModel.deleteCategory(categoryId);
};
