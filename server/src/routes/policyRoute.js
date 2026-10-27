import { Router } from "express";
import {
  createPolicyController,
  getAllPoliciesController,
  updatePolicyController,
} from "../controllers/policyController.js";
import {
  createPolicySchema,
  updatePolicySchema,
} from "../schemas/policySchema.js";
import validate from "../middlewares/validate.js";
import authorize from "../middlewares/authorize.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", getAllPoliciesController);

router.post(
  "/",
  validate(createPolicySchema),
  verifyToken,
  authorize("admin"),
  createPolicyController,
);

router.patch(
  "/:id",
  validate(updatePolicySchema),
  verifyToken,
  authorize("admin"),
  updatePolicyController,
);

export default router;
