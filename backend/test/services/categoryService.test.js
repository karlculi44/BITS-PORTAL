import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/models/categoryModel.js", () => ({
  getAllCategories: vi.fn(),
  getCategoryById: vi.fn(),
  getCategoryByName: vi.fn(),
  searchCategoriesByName: vi.fn(),
  insertCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import * as categoryModel from "../../src/models/categoryModel.js";
import {
  createCategory,
  getCategoryByName,
  searchCategoriesByName,
  updateCategory,
  deleteCategory,
} from "../../src/services/categoryService.js";

describe("categoryService", () => {
  beforeEach(() => {
    categoryModel.getCategoryById.mockReset();
    categoryModel.getCategoryByName.mockReset();
    categoryModel.searchCategoriesByName.mockReset();
    categoryModel.insertCategory.mockReset();
    categoryModel.updateCategory.mockReset();
    categoryModel.deleteCategory.mockReset();
  });

  it("looks up a category by name through the model", async () => {
    const category = { id: 1, name: "Books" };
    categoryModel.getCategoryByName.mockResolvedValueOnce(category);

    await expect(getCategoryByName("Books")).resolves.toBe(category);
    expect(categoryModel.getCategoryByName).toHaveBeenCalledWith("Books", undefined);
  });

  it("returns all categories matching a name fragment", async () => {
    const categories = [{ id: 1, name: "Books" }, { id: 2, name: "Bookshop" }];
    categoryModel.searchCategoriesByName.mockResolvedValueOnce(categories);

    await expect(searchCategoriesByName("Book")).resolves.toBe(categories);
    expect(categoryModel.searchCategoriesByName).toHaveBeenCalledWith("Book");
  });

  it("creates a category through the model and returns the created record", async () => {
    const category = {
      id: 1,
      name: "Books",
      type: "service",
      is_active: true,
    };
    categoryModel.insertCategory.mockResolvedValueOnce(category);

    await expect(createCategory("Books", "service")).resolves.toBe(category);
    expect(categoryModel.insertCategory).toHaveBeenCalledWith("Books", "service");
  });

  it("maps a duplicate category constraint to a conflict error", async () => {
    categoryModel.insertCategory.mockRejectedValueOnce({ code: "23505" });

    await expect(createCategory("Books", "service")).rejects.toMatchObject({
      message: "Category already exists",
      statusCode: 409,
    });
  });

  it("rethrows errors unrelated to duplicate categories", async () => {
    const error = new Error("Database unavailable");
    categoryModel.insertCategory.mockRejectedValueOnce(error);

    await expect(createCategory("Books", "service")).rejects.toBe(error);
  });

  it("checks duplicates by the current type and excludes the updated category", async () => {
    const update = { categoryId: "1", name: "Updated Books", isActive: false };
    const category = {
      id: 1,
      name: "Updated Books",
      type: "service",
      is_active: false,
    };
    categoryModel.getCategoryById.mockResolvedValueOnce({
      id: 1,
      type: "service",
    });
    categoryModel.getCategoryByName.mockResolvedValueOnce(undefined);
    categoryModel.updateCategory.mockResolvedValueOnce(category);

    await expect(updateCategory(update)).resolves.toBe(category);
    expect(categoryModel.getCategoryByName).toHaveBeenCalledWith(
      "Updated Books",
      "service",
      "1",
    );
    expect(categoryModel.updateCategory).toHaveBeenCalledWith({
      categoryId: "1",
      name: "Updated Books",
      isActive: false,
    });
  });

  it("rejects same-type duplicates before updating", async () => {
    categoryModel.getCategoryById.mockResolvedValueOnce({
      id: 1,
      type: "policy",
    });
    categoryModel.getCategoryByName.mockResolvedValueOnce({ id: 2 });

    await expect(
      updateCategory({ categoryId: "1", name: "Books" }),
    ).rejects.toMatchObject({
      message: "Category already exists",
      statusCode: 409,
    });
    expect(categoryModel.updateCategory).not.toHaveBeenCalled();
  });

  it("maps duplicate names during updates and rethrows other errors", async () => {
    categoryModel.getCategoryById.mockResolvedValue({
      id: 1,
      type: "service",
    });
    categoryModel.getCategoryByName.mockResolvedValue(undefined);
    categoryModel.updateCategory.mockRejectedValueOnce({ code: "23505" });
    await expect(
      updateCategory({ categoryId: "1", name: "Books" }),
    ).rejects.toMatchObject({
      message: "Category already exists",
      statusCode: 409,
    });

    const error = new Error("Database unavailable");
    categoryModel.updateCategory.mockRejectedValueOnce(error);
    await expect(
      updateCategory({ categoryId: "1", name: "Books" }),
    ).rejects.toBe(error);
  });

  it("deletes a category through the model", async () => {
    const category = { id: 1, name: "Books" };
    categoryModel.deleteCategory.mockResolvedValueOnce(category);

    await expect(deleteCategory("1")).resolves.toBe(category);
    expect(categoryModel.deleteCategory).toHaveBeenCalledWith("1");
  });
});
