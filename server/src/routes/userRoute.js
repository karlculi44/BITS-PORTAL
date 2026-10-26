import { Router } from "express";
import { createUserController } from "../controllers/userController.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.post("/", verifyToken, createUserController);

export default router;
