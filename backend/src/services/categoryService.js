import * as categoryModel from "../models/categoryModel.js";
import AppError from "../utils/AppError.js";
import { withAuditTransaction } from "./auditLogService.js";

export const getAllCategories = async (type) => {
  return await categoryModel.getAllCategories(type);
};

export const getCategoryByName = async (name, type) => {
  return await categoryModel.getCategoryByName(name, type);
};

export const searchCategoriesByName = async (name) => {
  return await categoryModel.searchCategoriesByName(name);
};

export const createCategory = async (name, type, context) => {
  try {
    if (!context) return await categoryModel.insertCategory(name, type);
    return await withAuditTransaction(context, "Add", "Categories",
      (db) => categoryModel.insertCategory(name, type, db),
      (category) => `Created ${category.type} category: ${category.name}`);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Category already exists", 409);
    }

    throw error;
  }
};

export const updateCategory = async (category, context) => {
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

    const update = {
      categoryId: category.categoryId,
      name: category.name,
      isActive: category.isActive,
    };
    if (!context) return await categoryModel.updateCategory(update);
    const updated = await withAuditTransaction(context, "Edit", "Categories",
      (db) => categoryModel.updateCategory(update, db),
      (result) => category.name !== undefined && category.name !== (result.previous_name ?? currentCategory.name)
        ? `Renamed ${result.type} category: ${result.previous_name ?? currentCategory.name} to ${result.name}`
        : `Updated ${result.type} category: ${result.name}`);
    if (!updated) return updated;
    const { previous_name: _previousName, ...result } = updated;
    return result;
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("Category already exists", 409);
    }

    throw error;
  }
};

export const setDefaultCategory = async (categoryId, isDefault, context) => {
  try {
    if (!context) return await categoryModel.setDefaultCategory(categoryId, isDefault);
    const category = await withAuditTransaction(context, "Edit", "Categories",
      (db) => categoryModel.setDefaultCategory(categoryId, isDefault, db),
      (updated) => updated.previous_default === isDefault
        ? null
        : `Changed default service category to: ${isDefault ? updated.name : "All Categories"}`);
    if (!category) return category;
    const { previous_default: _previousDefault, ...result } = category;
    return result;
  } catch (error) {
    if (error.code === "NOT_SERVICE_CATEGORY") {
      throw new AppError(error.message, 400);
    }

    throw error;
  }
};

export const deleteCategory = async (categoryId, context) => {
  try {
    if (!context) return await categoryModel.deleteCategory(categoryId);
    return await withAuditTransaction(context, "Delete", "Categories",
      (db) => categoryModel.deleteCategory(categoryId, db),
      (category) => `Deleted ${category.type} category: ${category.name}`);
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
