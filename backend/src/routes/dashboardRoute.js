import { Router } from "express";
import { getDashboardController } from "../controllers/dashboardController.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", verifyToken, authorize("admin"), getDashboardController);

export default router;
