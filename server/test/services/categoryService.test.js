import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/models/categoryModel.js", () => ({
  getAllCategories: vi.fn(),
  getCategoryByName: vi.fn(),
  searchCategoriesByName: vi.fn(),
  insertCategory: vi.fn(),
  updateCategory: vi.fn(),
}));

import * as categoryModel from "../../src/models/categoryModel.js";
import {
  createCategory,
  getCategoryByName,
  searchCategoriesByName,
  updateCategory,
} from "../../src/services/categoryService.js";

describe("categoryService", () => {
  beforeEach(() => {
    categoryModel.getCategoryByName.mockReset();
    categoryModel.searchCategoriesByName.mockReset();
    categoryModel.insertCategory.mockReset();
    categoryModel.updateCategory.mockReset();
  });

  it("looks up a category by name through the model", async () => {
    const category = { id: 1, name: "Books" };
    categoryModel.getCategoryByName.mockResolvedValueOnce(category);

    await expect(getCategoryByName("Books")).resolves.toBe(category);
    expect(categoryModel.getCategoryByName).toHaveBeenCalledWith("Books");
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
      description: "Reading materials",
      type: "service",
      is_active: true,
    };
    categoryModel.insertCategory.mockResolvedValueOnce(category);

    await expect(
      createCategory("Books", "Reading materials", "service"),
    ).resolves.toBe(category);
    expect(categoryModel.insertCategory).toHaveBeenCalledWith(
      "Books",
      "Reading materials",
      "service",
    );
  });

  it("maps a duplicate category constraint to a conflict error", async () => {
    categoryModel.insertCategory.mockRejectedValueOnce({ code: "23505" });

    await expect(
      createCategory("Books", "Reading materials", "service"),
    ).rejects.toMatchObject({
      message: "Category already exists",
      statusCode: 409,
    });
  });

  it("rethrows errors unrelated to duplicate categories", async () => {
    const error = new Error("Database unavailable");
    categoryModel.insertCategory.mockRejectedValueOnce(error);

    await expect(
      createCategory("Books", "Reading materials", "service"),
    ).rejects.toBe(error);
  });

  it("passes category updates through to the model", async () => {
    const update = { categoryId: "1", description: "Updated", isActive: false };
    const category = {
      id: 1,
      name: "Books",
      description: "Updated",
      type: "service",
      is_active: false,
    };
    categoryModel.updateCategory.mockResolvedValueOnce(category);

    await expect(updateCategory(update)).resolves.toBe(category);
    expect(categoryModel.updateCategory).toHaveBeenCalledWith(update);
  });

  it("maps duplicate names during updates and rethrows other errors", async () => {
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
});
