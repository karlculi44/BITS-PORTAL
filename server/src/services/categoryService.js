import * as categoryModel from "../models/categoryModel.js";
import AppError from "../utils/AppError.js";

export const getAllCategories = async () => {
  return await categoryModel.getAllCategories();
};

export const getCategoryByName = async (name) => {
  return await categoryModel.getCategoryByName(name);
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
