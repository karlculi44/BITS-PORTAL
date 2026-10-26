import { Router } from "express";
import { loginUserController } from "../controllers/authController.js";

const router = Router();

router.post("/login", loginUserController);

export default router;
