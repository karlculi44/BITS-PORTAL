import { Router } from "express";
import { createUserController } from "../controllers/userController.js";
import { createUserSchema } from "../schemas/userSchemas.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.post(
  "/",
  validate(createUserSchema),
  verifyToken,
  authorize("admin"),
  createUserController,
);

export default router;
