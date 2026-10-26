import { Router } from "express";
import {
  createUserController,
  getAllUsersController,
  updateUserController,
} from "../controllers/userController.js";
import { createUserSchema, updateUserSchema } from "../schemas/userSchemas.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, authorize("admin"), getAllUsersController);

router.post(
  "/",
  validate(createUserSchema),
  verifyToken,
  authorize("admin"),
  createUserController,
);

router.patch(
  "/:id",
  validate(updateUserSchema),
  verifyToken,
  authorize("admin"),
  updateUserController,
);

export default router;
