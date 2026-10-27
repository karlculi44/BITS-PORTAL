import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as categoryService from "../services/categoryService.js";

export const createCategory = asyncHandler(async (req, res) => {
  const { name, type } = req.body;

  if (!name || !type) {
    throw new AppError("Category name,  and type are required", 400);
  }

  const existingCategory = await categoryService.getCategoryByName(name);

  if (existingCategory) {
    throw new AppError("Category already exists", 400);
  }

  const category = await categoryService.createCategory(
    name,
    type,
  );

  res.status(201).json(category);
});

export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.status(200).json(categories);
});

export const searchCategoriesByName = asyncHandler(async (req, res) => {
  const categories = await categoryService.searchCategoriesByName(
    req.params.name,
  );
  res.status(200).json(categories);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    throw new AppError("Invalid category ID", 400);
  }

  const category = await categoryService.updateCategory({
    categoryId: id,
    ...req.body,
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  res.status(200).json(category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    throw new AppError("Invalid category ID", 400);
  }

  const category = await categoryService.deleteCategory(id);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  res.status(200).json({
    message: "Category deleted successfully",
    data: category,
  });
});
