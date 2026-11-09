import { Router } from "express";
import {
  createPolicyController,
  deletePolicyController,
  getAllPoliciesController,
  updatePolicyController,
} from "../controllers/policyController.js";
import {
  createPolicySchema,
  updatePolicySchema,
} from "../schemas/policySchema.js";
import validate from "../middlewares/validate.js";
import authorizeSection from "../middlewares/authorizeSection.js";
import verifyToken from "../middlewares/verifyToken.js";

const router = Router();

router.get("/", getAllPoliciesController);

router.post(
  "/",
  validate(createPolicySchema),
  verifyToken,
  authorizeSection("policies"),
  createPolicyController,
);

router.patch(
  "/:id",
  validate(updatePolicySchema),
  verifyToken,
  authorizeSection("policies"),
  updatePolicyController,
);

router.delete(
  "/:id",
  verifyToken,
  authorizeSection("policies"),
  deletePolicyController,
);

export default router;
