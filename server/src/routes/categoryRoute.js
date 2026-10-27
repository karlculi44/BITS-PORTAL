import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  searchCategoriesByName,
  updateCategory,
} from "../controllers/categoryController.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/categorySchema.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, authorize("admin"), getAllCategories);
router.get("/:name", verifyToken, authorize("admin"), searchCategoriesByName);

router.post(
  "/",
  validate(createCategorySchema),
  verifyToken,
  authorize("admin"),
  createCategory,
);

router.patch(
  "/:id",
  validate(updateCategorySchema),
  verifyToken,
  authorize("admin"),
  updateCategory,
);

export default router;
