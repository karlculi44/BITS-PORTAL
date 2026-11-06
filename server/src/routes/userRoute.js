import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  getAllUsersController,
  getUserAvatarController,
  updateUserController,
} from "../controllers/userController.js";
import { createUserSchema, updateUserSchema } from "../schemas/userSchemas.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";
import userAvatarUpload from "../middlewares/userAvatarUpload.js";

const router = Router();

// Multipart fields arrive as strings; convert booleans before validation.
const normalizeMultipartBooleans = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    for (const field of [
      "isActive",
      "canAccessServices",
      "canAccessPolicies",
      "canAccessCategories",
    ]) {
      if (req.body[field] === "true") req.body[field] = true;
      if (req.body[field] === "false") req.body[field] = false;
    }
  }

  next();
};

router.get("/images/:filename", getUserAvatarController);

router.get("/", verifyToken, authorize("admin"), getAllUsersController);

router.post(
  "/",
  verifyToken,
  authorize("admin"),
  userAvatarUpload,
  normalizeMultipartBooleans,
  validate(createUserSchema),
  createUserController,
);

router.patch(
  "/:id",
  verifyToken,
  authorize("admin"),
  userAvatarUpload,
  normalizeMultipartBooleans,
  validate(updateUserSchema),
  updateUserController,
);

router.delete("/:id", verifyToken, authorize("admin"), deleteUserController);

export default router;
