import { Router } from "express";
import { createPolicyController } from "../controllers/policyController.js";
import { createPolicySchema } from "../schemas/policySchema.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.post(
  "/",
  validate(createPolicySchema),
  verifyToken,
  authorize("admin"),
  createPolicyController,
);

export default router;
