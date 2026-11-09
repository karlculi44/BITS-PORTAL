import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  searchCategoriesByName,
  setDefaultCategory,
  updateCategory,
} from "../controllers/categoryController.js";
import {
  createCategorySchema,
  setDefaultCategorySchema,
  updateCategorySchema,
} from "../schemas/categorySchema.js";
import validate from "../middlewares/validate.js";
import authorizeSection from "../middlewares/authorizeSection.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

// Staff need to read categories to manage services and policies.
router.get(
  "/",
  verifyToken,
  authorizeSection("categories", "services", "policies"),
  getAllCategories,
);
router.get(
  "/:name",
  verifyToken,
  authorizeSection("categories", "services", "policies"),
  searchCategoriesByName,
);

router.post(
  "/",
  validate(createCategorySchema),
  verifyToken,
  authorizeSection("categories"),
  createCategory,
);

router.patch(
  "/:id",
  validate(updateCategorySchema),
  verifyToken,
  authorizeSection("categories"),
  updateCategory,
);

router.patch(
  "/:id/default",
  validate(setDefaultCategorySchema),
  verifyToken,
  authorizeSection("categories"),
  setDefaultCategory,
);

router.delete(
  "/:id",
  verifyToken,
  authorizeSection("categories"),
  deleteCategory,
);

export default router;
