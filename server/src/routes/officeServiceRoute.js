import { Router } from "express";
import { createServiceController } from "../controllers/serviceController.js";
import { createServiceSchema } from "../schemas/officeServiceSchema.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.post(
  "/",
  validate(createServiceSchema),
  verifyToken,
  authorize("admin"),
  createServiceController,
);

export default router;
