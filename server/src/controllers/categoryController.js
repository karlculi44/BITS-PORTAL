import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import * as categoryService from "../services/categoryService.js";

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, type } = req.body;

  if (!name || !description || !type) {
    throw new AppError(
      "Category name, description, and type are required",
      400,
    );
  }

  const existingCategory = await categoryService.getCategoryByName(name);

  if (existingCategory) {
    throw new AppError("Category already exists", 400);
  }

  const category = await categoryService.createCategory(
    name,
    description,
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
