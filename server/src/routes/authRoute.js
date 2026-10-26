import { Router } from "express";
import { loginUserController } from "../controllers/authController.js";
import validate from "../middlewares/validate.js";
import { loginSchema } from "../schemas/authSchema.js";

const router = Router();

router.post("/login", validate(loginSchema), loginUserController);

export default router;
