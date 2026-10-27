import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  searchCategoriesByName,
} from "../controllers/categoryController.js";
import { createCategorySchema } from "../schemas/categorySchema.js";
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

export default router;
