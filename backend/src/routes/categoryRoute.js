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

const authorizeCategoryListRead = (req, res, next) => {
  if (req.query.type === "service") return next();

  return verifyToken(req, res, (error) => {
    if (error) return next(error);
    return authorizeSection("categories", "services", "policies")(
      req,
      res,
      next,
    );
  });
};

router.get("/", authorizeCategoryListRead, getAllCategories);
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
