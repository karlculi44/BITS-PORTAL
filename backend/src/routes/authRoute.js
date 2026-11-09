import { Router } from "express";
import {
  getSessionController,
  loginUserController,
  logoutUserController,
  recordFailedLogin,
  refreshUserController,
} from "../controllers/authController.js";
import validate from "../middlewares/validate.js";
import verifyToken from "../middlewares/verifyToken.js";
import { loginSchema } from "../schemas/authSchema.js";

const router = Router();

router.post("/login", validate(loginSchema, recordFailedLogin), loginUserController);
router.post("/refresh", refreshUserController);
router.get("/session", verifyToken, getSessionController);
router.post("/logout", logoutUserController);

export default router;
