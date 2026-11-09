import { Router } from "express";
import {
  getSessionController,
  loginUserController,
  logoutUserController,
  refreshUserController,
} from "../controllers/authController.js";
import validate from "../middlewares/validate.js";
import verifyToken from "../middlewares/verifyToken.js";
import { loginSchema } from "../schemas/authSchema.js";

const router = Router();

router.post("/login", validate(loginSchema), loginUserController);
router.post("/refresh", refreshUserController);
router.get("/session", verifyToken, getSessionController);
router.post("/logout", logoutUserController);

export default router;
